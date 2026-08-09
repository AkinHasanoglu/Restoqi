import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@stockalert/database/server'
import { getConnector } from '../../../../lib/connector-registry'
import type { SyncJobPayload } from '@stockalert/queue'
import { evaluateRule, buildAlertPayload, dispatchAlert } from '@stockalert/notifications'
import type { AlertRule, NotificationChannel } from '@stockalert/notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// QStash signs requests with this header; vercel cron uses a bearer token.
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') ?? ''
  // QStash sends upstash-signature; for simplicity we also accept a shared worker secret
  const workerSecret = process.env['WORKER_SECRET']
  if (workerSecret && authHeader === `Bearer ${workerSecret}`) return true
  // Allow Vercel Cron calls (they come from the same deployment)
  if (request.headers.get('x-vercel-cron') === '1') return true
  // In development always allow
  if (process.env['NODE_ENV'] !== 'production') return true
  return false
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json() as SyncJobPayload
  const db = createServiceRoleClient()

  if (payload.type === 'webhook_event') {
    await processWebhookEvent(payload, db)
  } else if (payload.type === 'poll_store') {
    await processPollStore(payload, db)
  }

  return NextResponse.json({ ok: true })
}

// Cron endpoint: trigger polling for all API-key-based stores
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceRoleClient()
  const { data: stores } = await db
    .from('connected_stores')
    .select('id, team_id, platform')
    .eq('status', 'active')
    .in('platform', ['trendyol', 'hepsiburada']) // polling-only platforms

  const results = await Promise.allSettled(
    (stores ?? []).map(async (store) => {
      await processPollStore({ type: 'poll_store', platform: store.platform, storeId: store.id, teamId: store.team_id }, db)
    })
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  return NextResponse.json({ total: results.length, failed })
}

type Db = ReturnType<typeof createServiceRoleClient>

async function processWebhookEvent(
  payload: Extract<SyncJobPayload, { type: 'webhook_event' }>,
  db: Db,
) {
  const { platform, storeId, teamId } = payload

  const { data: store } = await db
    .from('connected_stores')
    .select('credentials')
    .eq('id', storeId)
    .single()

  if (!store) return

  const connector = await getConnector(platform)
  const creds = store.credentials as Record<string, unknown>

  // Fetch fresh inventory for all products in this store
  const { data: products } = await db
    .from('products')
    .select('id, external_id')
    .eq('store_id', storeId)

  if (!products?.length) return

  const externalIds = products.map((p) => p.external_id).filter(Boolean) as string[]
  const levels = await connector.getInventoryLevels(creds as never, externalIds)

  await writeSnapshots(levels.map((l) => ({
    store_id: storeId,
    team_id: teamId,
    product_external_id: l.productExternalId,
    quantity: l.quantity,
    platform,
  })), db)
}

async function processPollStore(
  payload: Extract<SyncJobPayload, { type: 'poll_store' }>,
  db: Db,
) {
  const { platform, storeId, teamId } = payload

  const { data: store } = await db
    .from('connected_stores')
    .select('credentials')
    .eq('id', storeId)
    .single()

  if (!store) return

  const connector = await getConnector(platform)
  const creds = store.credentials as Record<string, unknown>

  // Sync product catalog first (paginated)
  let cursor: string | null | undefined = undefined
  do {
    const page = await connector.listProducts(creds as never, cursor ?? undefined)
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

    cursor = page.nextCursor
  } while (cursor)

  // Then fetch inventory levels
  const { data: products } = await db
    .from('products')
    .select('id, external_id')
    .eq('store_id', storeId)

  if (!products?.length) return

  const externalIds = products.map((p) => p.external_id).filter(Boolean) as string[]
  const levels = await connector.getInventoryLevels(creds as never, externalIds)

  await writeSnapshots(levels.map((l) => ({
    store_id: storeId,
    team_id: teamId,
    product_external_id: l.productExternalId,
    quantity: l.quantity,
    platform,
  })), db)
}

async function writeSnapshots(
  snapshots: Array<{
    store_id: string
    team_id: string
    product_external_id: string
    quantity: number
    platform: string
  }>,
  db: Db,
) {
  if (!snapshots.length) return

  await db.from('inventory_snapshots').insert(
    snapshots.map((s) => ({
      store_id: s.store_id,
      team_id: s.team_id,
      product_external_id: s.product_external_id,
      quantity: s.quantity,
      recorded_at: new Date().toISOString(),
    }))
  )

  // Update the latest quantity on the products table for quick reads
  for (const s of snapshots) {
    await db
      .from('products')
      .update({ current_quantity: s.quantity, last_synced_at: new Date().toISOString() })
      .eq('store_id', s.store_id)
      .eq('external_id', s.product_external_id)
  }

  // Run rules engine for each team's snapshots
  const teamIds = [...new Set(snapshots.map((s) => s.team_id))]
  for (const teamId of teamIds) {
    const teamSnapshots = snapshots.filter((s) => s.team_id === teamId)
    await runRulesEngine(teamId, teamSnapshots, db)
  }
}

async function runRulesEngine(
  teamId: string,
  snapshots: Array<{ store_id: string; team_id: string; product_external_id: string; quantity: number; platform: string }>,
  db: Db,
) {
  const { data: rules } = await db
    .from('alert_rules')
    .select('*')
    .eq('team_id', teamId)
    .eq('enabled', true)

  if (!rules?.length) return

  const { data: products } = await db
    .from('products')
    .select('id, external_id, title, store_id')
    .eq('team_id', teamId)

  const productMap = new Map((products ?? []).map((p) => [`${p.store_id}:${p.external_id}`, p]))

  const { data: notifChannels } = await db
    .from('notification_channels')
    .select('*')
    .eq('team_id', teamId)
    .eq('enabled', true)

  for (const rawRule of rules) {
    const rule = rawRule as unknown as AlertRule & { notification_channel_ids: string[] }

    for (const snap of snapshots) {
      const product = productMap.get(`${snap.store_id}:${snap.product_external_id}`)
      if (!product) continue

      const inventorySnap = {
        teamId: snap.team_id,
        storeId: snap.store_id,
        productId: product.id,
        productExternalId: snap.product_external_id,
        quantity: snap.quantity,
        platform: snap.platform,
      }

      const shouldAlert = evaluateRule(rule, inventorySnap, 0)
      if (!shouldAlert) continue

      // Check throttle: was an alert fired recently for this rule+product?
      const throttleMinutes = rule.throttleMinutes ?? 60
      const throttleAfter = new Date(Date.now() - throttleMinutes * 60_000).toISOString()
      const { data: recentAlert } = await db
        .from('alerts')
        .select('id')
        .eq('rule_id', rule.id)
        .eq('product_id', product.id)
        .gte('triggered_at', throttleAfter)
        .limit(1)
        .single()

      if (recentAlert) continue

      const payload = buildAlertPayload(rule, inventorySnap, product.title ?? product.external_id)

      // Insert alert record
      const { data: alertRecord } = await db.from('alerts').insert({
        rule_id: rule.id,
        team_id: teamId,
        store_id: snap.store_id,
        product_id: product.id,
        current_quantity: snap.quantity,
        threshold_value: rule.thresholdValue,
        status: 'pending',
        triggered_at: new Date().toISOString(),
      }).select('id').single()

      // Dispatch to channels
      const ruleChannelIds: string[] = rule.notification_channel_ids ?? []
      const matchedChannels = (notifChannels ?? [])
        .filter((ch) => ruleChannelIds.includes(ch.id))
        .map((ch) => ({ type: ch.type as NotificationChannel['type'], config: ch.config as Record<string, string> }))

      if (matchedChannels.length) {
        const results = await dispatchAlert(payload, matchedChannels)
        const allOk = results.every((r) => r.success)
        if (alertRecord) {
          await db.from('alerts').update({ status: allOk ? 'delivered' : 'failed' }).eq('id', alertRecord.id)
        }
      } else if (alertRecord) {
        await db.from('alerts').update({ status: 'delivered' }).eq('id', alertRecord.id)
      }
    }
  }
}
