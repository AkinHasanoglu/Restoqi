import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@stockalert/database/server'
import { logAudit } from '@stockalert/database/audit'
import { sendPaymentFailedEmail } from '@stockalert/notifications'
import { isFirstDelivery } from '../../../../lib/rate-limit'
import { verifyPaddleSignature, buildPaddlePlanMap, assertPlanMapConfigured } from '../../../../lib/paddle'

export const runtime = 'nodejs'

// Paddle Billing subscription.status values map 1:1 onto our
// subscription_status enum (trialing/active/past_due/paused/canceled) —
// unlike LemonSqueezy, no status-vocabulary mapping table is needed.
type PaddleSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled'

type PaddleEvent = {
  event_id: string
  event_type: string
  occurred_at: string
  data: {
    id: string
    subscription_id?: string | null
    customer_id: string
    status?: PaddleSubscriptionStatus
    items?: Array<{ price: { id: string } }>
    current_billing_period?: { starts_at: string; ends_at: string } | null
    canceled_at?: string | null
    management_urls?: { update_payment_method?: string | null; cancel?: string | null } | null
    custom_data?: { team_id?: string } | null
  }
}

// Validates the fields this route actually reads/writes from — not the
// full Paddle event shape, to avoid this drifting out of sync with
// Paddle's API on every field they add. Signature verification (above)
// already establishes the payload came from Paddle; this guards against
// type confusion in what gets upserted (e.g. `status` landing in the DB's
// subscription_status enum column) rather than against a hostile sender.
// Was a bare `JSON.parse(rawBody) as PaddleEvent` cast — see 2nd security
// audit item 2.
const PaddleEventSchema = z.object({
  event_id: z.string().min(1),
  event_type: z.string().min(1),
  occurred_at: z.string(),
  data: z.object({
    id: z.string().min(1),
    subscription_id: z.string().nullish(),
    customer_id: z.string(),
    status: z.enum(['trialing', 'active', 'past_due', 'paused', 'canceled']).optional(),
    items: z.array(z.object({ price: z.object({ id: z.string() }) })).optional(),
    current_billing_period: z.object({ starts_at: z.string(), ends_at: z.string() }).nullish(),
    canceled_at: z.string().nullish(),
    management_urls: z.object({
      update_payment_method: z.string().nullish(),
      cancel: z.string().nullish(),
    }).nullish(),
    custom_data: z.object({ team_id: z.string().optional() }).nullish(),
  }),
})

const PLAN_MAP = buildPaddlePlanMap()

const ACTIVE_EVENTS = new Set([
  'subscription.created',
  'subscription.updated',
  'subscription.activated',
  'subscription.trialing',
  'subscription.past_due',
  'subscription.resumed',
])
const INACTIVE_EVENTS = new Set(['subscription.paused', 'subscription.canceled'])

type Db = ReturnType<typeof createServiceRoleClient>

/** Not every Paddle event echoes custom_data — fall back to a lookup by the subscription id we already have on file. */
async function resolveTeamId(event: PaddleEvent, db: Db): Promise<string | null> {
  if (event.data.custom_data?.team_id) return event.data.custom_data.team_id

  const subscriptionId = event.data.subscription_id ?? event.data.id
  const { data } = await db
    .from('subscriptions')
    .select('team_id')
    .eq('paddle_subscription_id', subscriptionId)
    .maybeSingle()

  return data?.team_id ?? null
}

async function handleSubscriptionEvent(event: PaddleEvent, teamId: string, db: Db) {
  const priceId = event.data.items?.[0]?.price.id ?? ''
  const { plan, interval } = PLAN_MAP[priceId] ?? { plan: 'starter' as const, interval: null }
  const status = event.data.status ?? 'active'

  if (ACTIVE_EVENTS.has(event.event_type)) {
    await db.from('subscriptions').upsert({
      team_id: teamId,
      plan,
      status,
      billing_interval: interval,
      paddle_subscription_id: event.data.id,
      paddle_customer_id: event.data.customer_id,
      paddle_price_id: priceId,
      current_period_end: event.data.current_billing_period?.ends_at ?? null,
      customer_portal_url: event.data.management_urls?.update_payment_method ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'team_id' })

    // A paying (or freshly re-trialing) subscription lifts any
    // billing-driven suspension from a prior trial_expired/canceled
    // period. is_active is untouched — a store the user disconnected
    // themselves must not come back just because billing recovered.
    await db.from('connected_stores').update({ suspended_at: null }).eq('team_id', teamId)
  } else if (INACTIVE_EVENTS.has(event.event_type)) {
    await db.from('subscriptions').update({
      status,
      canceled_at: event.data.canceled_at ?? null,
      updated_at: new Date().toISOString(),
    }).eq('team_id', teamId)

    await db.from('connected_stores').update({ suspended_at: new Date().toISOString() }).eq('team_id', teamId)
  }

  await logAudit(db, {
    teamId, userId: null, actorEmail: null,
    action: 'subscription.changed', entityType: 'subscriptions', entityId: event.data.id,
    metadata: { eventType: event.event_type, status, plan },
  })
}

/** Best-effort: the owner's email is looked up via the GoTrue admin API (service-role only), not a table join. */
async function findOwnerEmail(teamId: string, db: Db): Promise<string | null> {
  const { data: owner } = await db
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()
  if (!owner) return null

  const { data, error } = await db.auth.admin.getUserById(owner.user_id)
  if (error || !data.user?.email) return null
  return data.user.email
}

async function handleTransactionEvent(event: PaddleEvent, teamId: string, db: Db) {
  if (event.event_type === 'transaction.payment_failed') {
    const [{ data: team }, ownerEmail] = await Promise.all([
      db.from('teams').select('name, locale').eq('id', teamId).single(),
      findOwnerEmail(teamId, db),
    ])

    if (ownerEmail) {
      const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? ''
      try {
        await sendPaymentFailedEmail({
          toEmail: ownerEmail,
          locale: team?.locale ?? 'tr',
          teamName: team?.name ?? 'StockAlert',
          updatePaymentUrl: event.data.management_urls?.update_payment_method ?? `${appUrl}/settings/billing`,
        })
      } catch (err) {
        // A failed dunning email must not fail webhook processing (Paddle
        // would retry the whole event) — surface it via the audit metadata instead.
        console.error('[paddle] payment-failed email send failed', err)
      }
    }
  }

  await logAudit(db, {
    teamId, userId: null, actorEmail: null,
    action: 'subscription.changed', entityType: 'subscriptions', entityId: event.data.id,
    metadata: { eventType: event.event_type },
  })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signatureHeader = request.headers.get('paddle-signature') ?? ''
  const secret = process.env['PADDLE_WEBHOOK_SECRET'] ?? ''

  // Fail closed in EVERY environment, not just production — this was
  // previously gated on NODE_ENV === 'production', so a missing secret in
  // any other environment (staging, preview deploys, a misconfigured
  // self-host) silently skipped verification entirely: anyone could grant
  // themselves a Scale plan by POSTing a fake subscription.created
  // event with no signature at all. NODE_ENV is not a security boundary.
  if (!secret) {
    console.error('[paddle] PADDLE_WEBHOOK_SECRET is not set — refusing to process webhooks unverified')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }
  if (!verifyPaddleSignature(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Only reachable once the request is verified as genuinely from Paddle —
  // a misconfigured PLAN_MAP is an operational error, not something an
  // unauthenticated caller should be able to trigger/probe for.
  assertPlanMapConfigured(PLAN_MAP)

  let json: unknown
  try {
    json = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = PaddleEventSchema.safeParse(json)
  if (!parsed.success) {
    console.error('[paddle] payload failed validation', parsed.error.flatten())
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const event: PaddleEvent = parsed.data

  const db = createServiceRoleClient()

  // Paddle retries webhook deliveries — dedupe on event_id so a retried
  // delivery doesn't re-run side effects (namespaced globally, not
  // per-store, since Paddle events aren't scoped to a connected_stores row).
  const isNew = await isFirstDelivery('paddle', event.event_id)
  if (!isNew) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  const teamId = await resolveTeamId(event, db)
  if (!teamId) return NextResponse.json({ ok: true })

  if (event.event_type.startsWith('subscription.')) {
    await handleSubscriptionEvent(event, teamId, db)
  } else if (event.event_type === 'transaction.completed' || event.event_type === 'transaction.payment_failed') {
    await handleTransactionEvent(event, teamId, db)
  }

  return NextResponse.json({ received: true })
}
