import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@stockalert/database/server'
import { loadStoreCredentials, updateStoreCredentials } from '@stockalert/database/stores'
import { logAudit } from '@stockalert/database/audit'
import type { Tables } from '@stockalert/database'
import { getConnector } from '../../../../lib/connector-registry'
import { isAuthorizedWorkerRequest } from '../../../../lib/worker-auth'
import { refreshUsageMetrics, getPlanContext } from '../../../../lib/plan-limits'
import { isChannelAllowed } from '@stockalert/plans'
import { isSupportedPlatform } from '@stockalert/integrations-core'
import type { Credentials, MarketplaceConnector, Product } from '@stockalert/integrations-core'
import { enqueuePollJob } from '@stockalert/queue'
import type { SyncJobPayload } from '@stockalert/queue'
import { evaluateRule, buildAlertPayload, dispatchAlert, retryChannel, isWithinQuietHours } from '@stockalert/notifications'
import type { AlertRule, AlertPayload, NotificationChannel, QuietHours } from '@stockalert/notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Db = ReturnType<typeof createServiceRoleClient>

// Mirrors @stockalert/queue's SyncJobPayload — this used to be a bare
// `JSON.parse(rawBody) as SyncJobPayload` cast with no runtime check at
// all. See 2nd security audit item 2.
const SyncJobPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('webhook_event'),
    platform: z.string().min(1),
    storeId: z.string().uuid(),
    teamId: z.string().uuid(),
    rawBody: z.string(),
    headers: z.record(z.string()),
  }),
  z.object({
    type: z.literal('poll_store'),
    platform: z.string().min(1),
    storeId: z.string().uuid(),
    teamId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('notification_retry'),
    deliveryId: z.string().uuid(),
    teamId: z.string().uuid(),
    channelType: z.string().min(1),
    channelConfig: z.record(z.string()),
    alertPayload: z.record(z.unknown()),
    attempt: z.number().int().nonnegative(),
  }),
])

/**
 * Wraps a sync attempt with connected_stores.sync_error bookkeeping and
 * throttled audit logging — `store.synced` is logged only on a state
 * transition (first failure, or recovery from one), not on every routine
 * 5-minute poll, per the audit_action design intent.
 */
async function syncWithErrorTracking(storeId: string, teamId: string, db: Db, fn: () => Promise<void>): Promise<void> {
  const { data: store } = await db.from('connected_stores').select('sync_error').eq('id', storeId).single()
  const hadError = Boolean(store?.sync_error)

  try {
    await fn()
    await db.from('connected_stores').update({ sync_error: null }).eq('id', storeId)
    if (hadError) {
      await logAudit(db, {
        teamId, userId: null, actorEmail: null, action: 'store.synced',
        entityType: 'connected_stores', entityId: storeId, metadata: { recovered: true },
      })
    }
  } catch (err) {
    // sync_error is intentionally team-visible (merchants need to know
    // *that* a store's sync is failing) but a connector error can embed a
    // raw HTTP response body or request context — cap it so verbose/raw
    // detail isn't retained indefinitely on the row and rendered as-is on
    // the integrations page.
    const rawMessage = err instanceof Error ? err.message : 'Unknown sync error'
    const message = rawMessage.length > 300 ? `${rawMessage.slice(0, 300)}…` : rawMessage
    await db.from('connected_stores').update({ sync_error: message }).eq('id', storeId)
    if (!hadError) {
      await logAudit(db, {
        teamId, userId: null, actorEmail: null, action: 'store.synced',
        entityType: 'connected_stores', entityId: storeId, metadata: { failed: true, error: message },
      })
    }
    throw err
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  if (!(await isAuthorizedWorkerRequest(request, rawBody))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let json: unknown
  try {
    json = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = SyncJobPayloadSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const payload = parsed.data
  const db = createServiceRoleClient()

  // Defense in depth beyond the WORKER_SECRET/QStash-signature check
  // above: confirm storeId/deliveryId actually belong to the claimed
  // teamId before acting on them, so a leaked worker secret (or a bug in
  // whatever enqueued this job) can't write into an arbitrary team's data
  // by way of a mismatched teamId. See 2nd security audit item 1.
  if (payload.type === 'webhook_event' || payload.type === 'poll_store') {
    const { data: store } = await db
      .from('connected_stores')
      .select('id')
      .eq('id', payload.storeId)
      .eq('team_id', payload.teamId)
      .maybeSingle()
    if (!store) return NextResponse.json({ error: 'Store does not belong to team' }, { status: 403 })
  } else {
    const { data: delivery } = await db
      .from('alert_deliveries')
      .select('id')
      .eq('id', payload.deliveryId)
      .eq('team_id', payload.teamId)
      .maybeSingle()
    if (!delivery) return NextResponse.json({ error: 'Delivery does not belong to team' }, { status: 403 })
  }

  if (payload.type === 'webhook_event') {
    await syncWithErrorTracking(payload.storeId, payload.teamId, db, () => processWebhookEvent(payload, db))
  } else if (payload.type === 'poll_store') {
    await syncWithErrorTracking(payload.storeId, payload.teamId, db, () => processPollStore(payload, db))
  } else if (payload.type === 'notification_retry') {
    await processNotificationRetry(payload, db)
  }

  return NextResponse.json({ ok: true })
}

/**
 * Handles the single out-of-band retry enqueued by
 * @stockalert/notifications' dispatcher when a channel send fails. Bounded
 * to exactly one retry — a failure here just leaves the delivery/alert
 * rows as 'failed', it doesn't re-enqueue itself.
 */
async function processNotificationRetry(
  payload: Extract<SyncJobPayload, { type: 'notification_retry' }>,
  db: Db,
) {
  const alertPayload = payload.alertPayload as unknown as AlertPayload
  const channel: NotificationChannel = {
    type: payload.channelType as NotificationChannel['type'],
    config: payload.channelConfig,
  }

  const result = await retryChannel(alertPayload, channel)

  await db.from('alert_deliveries').update({
    status: result.success ? 'delivered' : 'failed',
    error_message: result.success ? null : (result.error ?? 'Unknown delivery error'),
    delivered_at: result.success ? new Date().toISOString() : null,
    attempts: payload.attempt + 1,
  }).eq('id', payload.deliveryId)

  if (result.success) {
    // If every sibling delivery for this alert is now settled and at
    // least one succeeded, the alert itself can move off 'failed'.
    const { data: delivery } = await db.from('alert_deliveries').select('alert_id').eq('id', payload.deliveryId).single()
    if (delivery) {
      const { data: siblings } = await db.from('alert_deliveries').select('status').eq('alert_id', delivery.alert_id)
      const anyDelivered = (siblings ?? []).some((s) => s.status === 'delivered')
      if (anyDelivered) {
        await db.from('alerts').update({ status: 'delivered' }).eq('id', delivery.alert_id)
      }
    }
  }
}

// Cron endpoint: fan out one poll job per API-key-based store, rather than
// processing every store inline in this one request. Inline processing
// meant N stores × per-store API round-trips all had to fit inside
// maxDuration = 60 — fine at demo scale, guaranteed to start timing out
// (and silently skipping whatever stores hadn't been reached yet) as the
// customer base grows. QStash gives each store its own request/timeout
// budget and retries independently on failure.
export async function GET(request: NextRequest) {
  if (!(await isAuthorizedWorkerRequest(request, ''))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceRoleClient()
  const { data: stores } = await db
    .from('connected_stores')
    .select('id, team_id, platform')
    .eq('is_active', true)
    // Billing-suspended (trial expired / subscription lapsed) — the
    // trial cron (api/worker/trial) and the Paddle webhook set this;
    // polling a suspended team would burn connector quota for a team
    // that's locked out of the dashboard anyway.
    .is('suspended_at', null)
    // Poll-only platforms (connector.supportsPush === false), plus
    // Trendyol, which has weak/unsigned push support and is polled
    // regardless (see trendyol connector's verifyWebhookSignature comment).
    // Previously missing etsy/amazon here meant those stores never synced
    // at all — Shopify and eBay are push-driven and intentionally excluded.
    .in('platform', ['trendyol', 'hepsiburada', 'etsy', 'amazon'])

  const results = await Promise.allSettled(
    (stores ?? []).map(async (store) => {
      const payload = { type: 'poll_store' as const, platform: store.platform, storeId: store.id, teamId: store.team_id }
      try {
        await enqueuePollJob(payload)
      } catch {
        // QSTASH_TOKEN not set (local dev without Upstash provisioned, or
        // it genuinely isn't configured yet) — fall back to processing
        // inline so `pnpm dev` keeps working without standing up Upstash.
        await syncWithErrorTracking(store.id, store.team_id, db, () => processPollStore(payload, db))
      }
    })
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  return NextResponse.json({ total: results.length, failed })
}

/**
 * Refreshes and persists OAuth credentials before use if they're expired.
 * Without this, connectors that refresh internally (e.g. eBay) do so
 * per-request without saving the new token, causing a refresh on every
 * single sync and eventual rate-limiting.
 */
async function ensureFreshCredentials(
  connector: MarketplaceConnector,
  storeId: string,
  creds: Credentials,
  db: Db,
): Promise<Credentials> {
  if (creds.type !== 'oauth' || !connector.refreshCredentials) return creds
  if (!creds.expiresAt || creds.expiresAt > Date.now()) return creds

  const refreshed = await connector.refreshCredentials(creds)
  await updateStoreCredentials(db, storeId, refreshed)
  return refreshed
}

async function processWebhookEvent(
  payload: Extract<SyncJobPayload, { type: 'webhook_event' }>,
  db: Db,
) {
  const { platform, storeId, teamId } = payload
  if (!isSupportedPlatform(platform)) return

  const connector = await getConnector(platform)
  const creds = await ensureFreshCredentials(connector, storeId, await loadStoreCredentials(db, storeId), db)

  // Fetch fresh inventory for all products in this store
  const { data: products } = await db
    .from('products')
    .select('id, external_id')
    .eq('store_id', storeId)

  if (!products?.length) return
  const productIdByExternalId = new Map(products.map((p) => [p.external_id, p.id]))

  const externalIds = products.map((p) => p.external_id).filter(Boolean) as string[]
  const levels = await connector.getInventoryLevels(creds, externalIds)

  const snapshots = levels
    .map((l) => {
      const productId = productIdByExternalId.get(l.productExternalId)
      if (!productId) return null
      return { product_id: productId, store_id: storeId, team_id: teamId, quantity: l.quantity, platform, variant_external_id: l.variantExternalId }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)

  await writeSnapshots(snapshots, db)
}

/**
 * Upserts every variant of every synced product (currently populated only
 * by the Shopify connector — see Product.variants). Keyed on
 * (product_id, external_id), matching the unique index added alongside
 * teams.locale (20260818000300_locale_and_variants.sql).
 */
async function upsertProductVariants(items: Product[], productIdByExternalId: Map<string, string>, db: Db): Promise<void> {
  const rows = items.flatMap((p) => {
    const productId = productIdByExternalId.get(p.externalId)
    if (!productId || !p.variants?.length) return []
    return p.variants.map((v) => ({
      product_id: productId,
      external_id: v.externalId,
      title: v.title ?? p.title,
      sku: v.sku,
      barcode: v.barcode,
      image_url: v.imageUrl,
    }))
  })
  if (!rows.length) return

  const { error } = await db.from('product_variants').upsert(rows, { onConflict: 'product_id,external_id' })
  if (error) console.error('[sync] product_variants upsert failed', error)
}

async function processPollStore(
  payload: Extract<SyncJobPayload, { type: 'poll_store' }>,
  db: Db,
) {
  const { platform, storeId, teamId } = payload
  if (!isSupportedPlatform(platform)) return

  const connector = await getConnector(platform)
  const creds = await ensureFreshCredentials(connector, storeId, await loadStoreCredentials(db, storeId), db)

  // Sync product catalog first (paginated). Pages are accumulated so their
  // variant data (not returned by the later `products` re-select) can
  // still be upserted once real product ids are known.
  const allItems: Product[] = []
  let cursor: string | null | undefined = undefined
  do {
    const page = await connector.listProducts(creds, cursor ?? undefined)
    const upserts = page.items.map((p) => ({
      store_id: storeId,
      team_id: teamId,
      external_id: p.externalId,
      title: p.title,
      sku: p.sku,
      barcode: p.barcode,
      image_url: p.imageUrl,
      product_url: p.productUrl,
      tags: p.tags,
      platform,
    }))

    if (upserts.length) {
      await db.from('products').upsert(upserts, { onConflict: 'store_id,external_id' })
    }

    allItems.push(...page.items)
    cursor = page.nextCursor
  } while (cursor)

  // Then fetch inventory levels
  const { data: products } = await db
    .from('products')
    .select('id, external_id')
    .eq('store_id', storeId)

  if (!products?.length) return
  const productIdByExternalId = new Map(products.map((p) => [p.external_id, p.id]))

  await upsertProductVariants(allItems, productIdByExternalId, db)

  const externalIds = products.map((p) => p.external_id).filter(Boolean) as string[]
  const levels = await connector.getInventoryLevels(creds, externalIds)

  const snapshots = levels
    .map((l) => {
      const productId = productIdByExternalId.get(l.productExternalId)
      if (!productId) return null
      return { product_id: productId, store_id: storeId, team_id: teamId, quantity: l.quantity, platform, variant_external_id: l.variantExternalId }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)

  await writeSnapshots(snapshots, db)
}

type Snapshot = {
  product_id: string
  store_id: string
  team_id: string
  quantity: number
  platform: string
  variant_external_id?: string | undefined
}

/**
 * Resolves variant_external_id -> product_variants.id for every snapshot
 * that carries one (currently only Shopify, via getInventoryLevels'
 * variantExternalId). Snapshots without variant data — or for products
 * whose variant rows haven't been upserted yet — simply get a null
 * variant_id, same as before this existed.
 */
async function resolveVariantIds(snapshots: Snapshot[], db: Db): Promise<Map<string, string>> {
  const productIds = [...new Set(snapshots.filter((s) => s.variant_external_id).map((s) => s.product_id))]
  const byKey = new Map<string, string>()
  if (!productIds.length) return byKey

  const { data: variants } = await db
    .from('product_variants')
    .select('id, product_id, external_id')
    .in('product_id', productIds)

  for (const v of variants ?? []) {
    byKey.set(`${v.product_id}:${v.external_id}`, v.id)
  }
  return byKey
}

async function writeSnapshots(snapshots: Snapshot[], db: Db) {
  if (!snapshots.length) return

  const variantIdByKey = await resolveVariantIds(snapshots, db)

  const { error: snapshotError } = await db.from('inventory_snapshots').insert(
    snapshots.map((s) => ({
      product_id: s.product_id,
      team_id: s.team_id,
      quantity: s.quantity,
      source: 'poll',
      recorded_at: new Date().toISOString(),
      variant_id: s.variant_external_id ? (variantIdByKey.get(`${s.product_id}:${s.variant_external_id}`) ?? null) : null,
    }))
  )
  if (snapshotError) {
    console.error('[sync] inventory_snapshots insert failed', snapshotError)
  }

  // Update the latest quantity on the products table for quick reads.
  // Parallelized rather than sequential — still N round-trips, but no
  // longer N sequential ones. A single batched UPDATE...FROM(VALUES...)
  // would be better at real scale; tracked as a follow-up if the sync
  // worker's 60s maxDuration becomes the bottleneck.
  await Promise.all(
    snapshots.map((s) =>
      db
        .from('products')
        .update({ current_quantity: s.quantity, last_synced_at: new Date().toISOString() })
        .eq('id', s.product_id)
    )
  )

  // Run rules engine for each team's snapshots
  const teamIds = [...new Set(snapshots.map((s) => s.team_id))]
  for (const teamId of teamIds) {
    const teamSnapshots = snapshots.filter((s) => s.team_id === teamId)
    await runRulesEngine(teamId, teamSnapshots, db)
    // Recomputes store/product/rule/alert/member counts for the billing
    // page — a sync run is the one place product_count and
    // alerts_this_month can change without going through a Server Action.
    await refreshUsageMetrics(db, teamId)
  }
}

function parseQuietHours(json: unknown): QuietHours | null {
  if (!json || typeof json !== 'object') return null
  const obj = json as Record<string, unknown>
  if (typeof obj['start'] === 'string' && typeof obj['end'] === 'string' && typeof obj['tz'] === 'string') {
    return { start: obj['start'], end: obj['end'], tz: obj['tz'] }
  }
  return null
}

function toDomainRule(row: Tables<'alert_rules'>): AlertRule {
  return {
    id: row.id,
    teamId: row.team_id,
    name: row.name,
    thresholdType: row.threshold_type,
    thresholdValue: row.threshold_value,
    channelIds: row.channel_ids,
    storeIds: row.scope_store_ids ?? [],
    productIds: row.scope_product_ids ?? [],
    tags: row.scope_tags ?? [],
    silenceWindowMinutes: row.silence_window_minutes,
    cooldownMinutes: row.cooldown_minutes,
    quietHours: parseQuietHours(row.quiet_hours),
    isActive: row.is_active,
  }
}

interface ProductStats {
  avgDailySales: number
  maxQuantityBaseline: number
  /** Latest known quantity in the lookback window — used only to convert an AI daysUntilStockout into an equivalent avgDailySales. */
  currentQuantity: number
}

/**
 * Batch-computes days_of_supply and percentage inputs for a set of
 * products from their trailing 30-day inventory_snapshots history, in one
 * query rather than one per product.
 */
async function computeProductStats(productIds: string[], teamId: string, db: Db): Promise<Map<string, ProductStats>> {
  const stats = new Map<string, ProductStats>()
  if (!productIds.length) return stats

  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data: history } = await db
    .from('inventory_snapshots')
    .select('product_id, quantity, recorded_at')
    .eq('team_id', teamId)
    .in('product_id', productIds)
    .gte('recorded_at', since30)
    .order('recorded_at', { ascending: true })

  const byProduct = new Map<string, Array<{ quantity: number; recordedAt: number }>>()
  for (const row of history ?? []) {
    const arr = byProduct.get(row.product_id) ?? []
    arr.push({ quantity: row.quantity, recordedAt: new Date(row.recorded_at).getTime() })
    byProduct.set(row.product_id, arr)
  }

  const since14 = Date.now() - 14 * 86_400_000
  for (const [productId, rows] of byProduct) {
    const maxQuantityBaseline = rows.reduce((max, r) => Math.max(max, r.quantity), 0)

    const recent = rows.filter((r) => r.recordedAt >= since14)
    let totalDepletion = 0
    for (let i = 1; i < recent.length; i++) {
      const delta = recent[i - 1]!.quantity - recent[i]!.quantity
      if (delta > 0) totalDepletion += delta
    }
    const daysSpan = recent.length > 1 ? (recent[recent.length - 1]!.recordedAt - recent[0]!.recordedAt) / 86_400_000 : 0
    const avgDailySales = daysSpan > 0 ? totalDepletion / daysSpan : 0
    const currentQuantity = rows[rows.length - 1]!.quantity

    stats.set(productId, { avgDailySales, maxQuantityBaseline, currentQuantity })
  }

  // Prefer the AI worker's prediction (packages/ai, api/worker/predict)
  // over the linear-depletion estimate above where one exists and is
  // still valid — it can factor in seasonality/trend the 14-day slope
  // can't. Falls back to the statistical figure for every other product.
  const { data: predictions } = await db
    .from('ai_predictions')
    .select('product_id, days_until_stockout, predicted_at')
    .eq('team_id', teamId)
    .in('product_id', productIds)
    .gt('valid_until', new Date().toISOString())
    .order('predicted_at', { ascending: false })

  // Bound how far the AI figure is allowed to move the statistically-derived
  // one — an LLM prediction is only trusted to *refine* the 14-day slope,
  // not replace it outright, since it's ultimately derived from
  // marketplace-supplied product titles a seller controls (see the
  // prompt-injection note on packages/ai/src/providers/parse-result.ts).
  // Without this, a crafted title could silently suppress a real
  // stockout alert (inflate days-until-stockout) or trigger a flood of
  // false ones (deflate it) — see 2nd security audit items 25/26.
  const MAX_AI_DEVIATION_FACTOR = 3

  const seen = new Set<string>()
  for (const pred of predictions ?? []) {
    if (seen.has(pred.product_id) || !pred.days_until_stockout || pred.days_until_stockout <= 0) continue
    seen.add(pred.product_id)
    const existing = stats.get(pred.product_id)
    if (!existing || existing.currentQuantity <= 0) continue

    const aiAvgDailySales = existing.currentQuantity / pred.days_until_stockout
    const avgDailySales = existing.avgDailySales > 0
      ? Math.min(
          Math.max(aiAvgDailySales, existing.avgDailySales / MAX_AI_DEVIATION_FACTOR),
          existing.avgDailySales * MAX_AI_DEVIATION_FACTOR,
        )
      // No sales history to sanity-check against (new product) — the AI
      // figure is the only signal available, already bounded upstream by
      // parse-result.ts's 0–365 day clamp.
      : aiAvgDailySales

    stats.set(pred.product_id, { ...existing, avgDailySales })
  }

  return stats
}

async function runRulesEngine(teamId: string, snapshots: Snapshot[], db: Db) {
  const { data: rules } = await db
    .from('alert_rules')
    .select('*')
    .eq('team_id', teamId)
    .eq('is_active', true)

  if (!rules?.length) return

  // Drives which packages/i18n/locales/<locale>/emails.json dictionary the
  // email channel renders with (see AlertPayload.locale). Falls back to the
  // app default rather than failing the whole sync if the team row can't
  // be read for some reason.
  const { data: teamRow } = await db.from('teams').select('locale').eq('id', teamId).single()
  const locale = teamRow?.locale ?? 'tr'

  const { data: products } = await db
    .from('products')
    .select('id, external_id, title, store_id, tags')
    .eq('team_id', teamId)

  const productMap = new Map((products ?? []).map((p) => [p.id, p]))
  const productStats = await computeProductStats(snapshots.map((s) => s.product_id), teamId, db)

  const { data: notifChannels } = await db
    .from('notification_channels')
    .select('*')
    .eq('team_id', teamId)
    .eq('is_active', true)

  // Resolved once per sync run, not per rule/channel — a plan downgrade
  // (or a channel type that was allowed under a since-renamed plan; see
  // the grandfathering note on the plan-rename migration) can leave a
  // team with channels configured that its current plan no longer
  // permits. Those still show up in the UI and can be re-enabled by
  // upgrading, but must not actually fire.
  const { effectivePlan, limits, usage } = await getPlanContext(db, teamId)

  // Running count for this sync pass — usage.alerts_this_month reflects the
  // last refresh_usage_metrics() call, not live, so multiple alerts firing
  // within a single pass have to be tallied locally to actually enforce
  // the monthly cap rather than checking a stale snapshot. This quota
  // existed in packages/plans but was never read here, so a plan's
  // alertsPerMonth allowance had no real ceiling — a team could trigger
  // unbounded platform-billed SMS/email. See 2nd security audit item 9.
  let alertsThisMonth = usage.alerts_this_month

  const now = new Date()

  // Same "no real ceiling" gap as alertsThisMonth above, but for the sms
  // channel specifically: it's billed to the platform's own Twilio account
  // (packages/notifications/src/channels/sms.ts), not the team's, and
  // usage_metrics has no sms-specific column to read a cached count from.
  // Queried once per team per sync pass (not per rule) and tallied locally
  // the same way, since a plan's alertsPerMonth cap doesn't stop a single
  // rule from firing sms repeatedly under its own separate allowance.
  let smsThisMonth = 0
  if (limits.smsPerMonth !== -1) {
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    const { count } = await db
      .from('alert_deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('channel_type', 'sms')
      .gte('created_at', startOfMonth)
      // Excludes rows rejected before ever reaching Twilio (blocked by
      // plan, not quota) — those never cost anything. Written as an OR
      // rather than .neq() because PostgREST's neq drops NULL
      // error_message rows (successful/pending deliveries) entirely.
      .or('error_message.is.null,error_message.neq.channel_not_in_plan')
    smsThisMonth = count ?? 0
  }

  for (const rawRule of rules) {
    const rule = toDomainRule(rawRule)

    for (const snap of snapshots) {
      const product = productMap.get(snap.product_id)
      if (!product) continue

      const inventorySnap = {
        teamId: snap.team_id,
        storeId: snap.store_id,
        productId: snap.product_id,
        productExternalId: product.external_id,
        quantity: snap.quantity,
        platform: snap.platform,
        tags: product.tags ?? [],
      }

      const stats = productStats.get(snap.product_id) ?? { avgDailySales: 0, maxQuantityBaseline: 0, currentQuantity: 0 }
      const shouldAlert = evaluateRule(rule, inventorySnap, stats)
      if (!shouldAlert) continue

      // Cooldown: was an alert fired recently for this rule+product?
      const cooldownAfter = new Date(Date.now() - rule.cooldownMinutes * 60_000).toISOString()
      const { data: recentAlert } = await db
        .from('alerts')
        .select('id')
        .eq('rule_id', rule.id)
        .eq('product_id', snap.product_id)
        .gte('created_at', cooldownAfter)
        .limit(1)
        .maybeSingle()

      if (recentAlert) continue

      // Suppression checks — the threshold genuinely fired, so we still
      // record the event (status: 'suppressed'), just don't dispatch.
      let suppressReason: string | null = null
      if (limits.alertsPerMonth !== -1 && alertsThisMonth >= limits.alertsPerMonth) {
        suppressReason = 'quota_exceeded'
      } else if (isWithinQuietHours(rule.quietHours, now)) {
        suppressReason = 'quiet_hours'
      } else if (rule.silenceWindowMinutes > 0) {
        const silenceAfter = new Date(Date.now() - rule.silenceWindowMinutes * 60_000).toISOString()
        const { data: recentRuleAlert } = await db
          .from('alerts')
          .select('id')
          .eq('rule_id', rule.id)
          .gte('created_at', silenceAfter)
          .limit(1)
          .maybeSingle()
        if (recentRuleAlert) suppressReason = 'silence_window'
      }

      const { data: alertRecord, error: alertError } = await db.from('alerts').insert({
        rule_id: rule.id,
        team_id: teamId,
        store_id: snap.store_id,
        product_id: snap.product_id,
        quantity: snap.quantity,
        threshold_value: rule.thresholdValue,
        status: suppressReason ? 'suppressed' : 'pending',
        payload: suppressReason ? { reason: suppressReason } : null,
        created_at: new Date().toISOString(),
      }).select('id').single()

      if (alertError || !alertRecord) {
        console.error('[sync] alerts insert failed', alertError)
        continue
      }
      // Matches refresh_usage_metrics()'s definition (count of `alerts`
      // rows created this month, suppressed or not) so this local tally
      // stays consistent with what the billing page's usage bar shows.
      alertsThisMonth++
      if (suppressReason) continue

      const matchedChannelRows = (notifChannels ?? []).filter((ch) => rule.channelIds.includes(ch.id))

      if (matchedChannelRows.length === 0) {
        // A rule with no resolvable channels can't be "delivered" — that
        // was a lie the previous version told. Mark it suppressed with a
        // reason so the misconfiguration is visible in the UI.
        await db.from('alerts').update({
          status: 'suppressed',
          payload: { reason: 'no_channels_configured' },
        }).eq('id', alertRecord.id)
        continue
      }

      // A channel the team configured under a since-downgraded (or
      // since-renamed, see grandfathering) plan is never silently
      // dropped — it still gets an alert_deliveries row so the block is
      // visible on the alerts page, it's just marked failed without ever
      // reaching dispatchAlert. sms additionally gets its own monthly cap
      // (smsThisMonth/limits.smsPerMonth, see above) since it's real money
      // on the platform's own Twilio account, independent of the general
      // alertsPerMonth quota.
      const allowedRows: typeof matchedChannelRows = []
      const blockedRows: { ch: (typeof matchedChannelRows)[number]; reason: string }[] = []
      for (const ch of matchedChannelRows) {
        if (!isChannelAllowed(effectivePlan, ch.channel_type)) {
          blockedRows.push({ ch, reason: 'channel_not_in_plan' })
        } else if (ch.channel_type === 'sms' && limits.smsPerMonth !== -1 && smsThisMonth >= limits.smsPerMonth) {
          blockedRows.push({ ch, reason: 'sms_quota_exceeded' })
        } else {
          if (ch.channel_type === 'sms') smsThisMonth++
          allowedRows.push(ch)
        }
      }

      if (blockedRows.length > 0) {
        await db.from('alert_deliveries').insert(
          blockedRows.map(({ ch, reason }) => ({
            alert_id: alertRecord.id,
            team_id: teamId,
            channel_id: ch.id,
            channel_type: ch.channel_type,
            status: 'failed' as const,
            error_message: reason,
            attempts: 0,
          }))
        )
      }

      if (allowedRows.length === 0) {
        await db.from('alerts').update({ status: 'failed' }).eq('id', alertRecord.id)
        continue
      }

      const matchedChannels: NotificationChannel[] = allowedRows.map((ch) => ({
        type: ch.channel_type as NotificationChannel['type'],
        config: ch.config as Record<string, string>,
      }))

      const payload = buildAlertPayload(rule, inventorySnap, product.title ?? product.external_id, matchedChannels, locale)

      const { data: deliveryRows } = await db.from('alert_deliveries').insert(
        allowedRows.map((ch) => ({
          alert_id: alertRecord.id,
          team_id: teamId,
          channel_id: ch.id,
          channel_type: ch.channel_type,
          status: 'pending' as const,
        }))
      ).select('id, channel_id')

      if (!deliveryRows?.length) {
        console.error('[sync] alert_deliveries insert failed for alert', alertRecord.id)
        continue
      }

      // Zips insert-order rows back onto the channels that produced them —
      // relies on Postgres preserving row order for a single multi-row
      // INSERT...RETURNING, which holds in practice but isn't a documented
      // guarantee. `channel_id` on both sides would be a stronger key if
      // this ever needs to become order-independent.
      const targets = matchedChannels.map((channel, i) => ({ deliveryId: deliveryRows[i]!.id, channel }))

      const results = await dispatchAlert(payload, targets)

      await Promise.all(
        results.map((r) =>
          db.from('alert_deliveries').update({
            status: r.success ? 'delivered' : 'failed',
            error_message: r.success ? null : (r.error ?? 'Unknown delivery error'),
            delivered_at: r.success ? new Date().toISOString() : null,
            attempts: 1,
          }).eq('id', r.deliveryId)
        )
      )

      // Roll up: delivered if at least one channel succeeded, otherwise
      // failed. A channel that's about to retry (see notification_retry
      // below) still counts as failed here — the alert row itself is
      // updated again if/when the retry succeeds.
      const anyDelivered = results.some((r) => r.success)
      await db.from('alerts').update({ status: anyDelivered ? 'delivered' : 'failed' }).eq('id', alertRecord.id)
    }
  }
}
