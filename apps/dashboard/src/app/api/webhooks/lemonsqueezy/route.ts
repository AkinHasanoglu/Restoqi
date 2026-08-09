import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createServiceRoleClient } from '@stockalert/database/server'

export const runtime = 'nodejs'

function verifySignature(body: string, signature: string, secret: string): boolean {
  const digest = createHmac('sha256', secret).update(body).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
  } catch {
    return false
  }
}

type LsEvent = {
  meta: { event_name: string; custom_data?: { team_id?: string } }
  data: {
    attributes: {
      status: string
      customer_id: number
      product_id: number
      variant_id: number
      renews_at: string | null
      ends_at: string | null
      trial_ends_at: string | null
      urls?: { customer_portal?: string }
    }
  }
}

const PLAN_MAP: Record<number, 'starter' | 'business' | 'enterprise'> = {
  // Populated in Faz 16 with real LemonSqueezy variant IDs
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature') ?? ''
  const secret = process.env['LEMONSQUEEZY_WEBHOOK_SECRET'] ?? ''

  if (secret && !verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: LsEvent
  try {
    event = JSON.parse(rawBody) as LsEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventName = event.meta.event_name
  const teamId = event.meta.custom_data?.team_id
  if (!teamId) return NextResponse.json({ ok: true })

  const attrs = event.data.attributes
  const variantId = attrs.variant_id
  const plan = PLAN_MAP[variantId] ?? 'starter'

  const db = createServiceRoleClient()

  if (['subscription_created', 'subscription_updated', 'subscription_resumed', 'subscription_unpaused'].includes(eventName)) {
    await db.from('subscriptions').upsert({
      team_id: teamId,
      plan,
      status: attrs.status,
      lemonsqueezy_customer_id: String(attrs.customer_id),
      lemonsqueezy_variant_id: String(variantId),
      current_period_end: attrs.renews_at ?? attrs.ends_at ?? null,
      trial_ends_at: attrs.trial_ends_at ?? null,
      customer_portal_url: attrs.urls?.customer_portal ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'team_id' })
  } else if (['subscription_cancelled', 'subscription_expired', 'subscription_paused'].includes(eventName)) {
    await db.from('subscriptions').update({
      status: attrs.status,
      updated_at: new Date().toISOString(),
    }).eq('team_id', teamId)
  }

  return NextResponse.json({ received: true })
}
