import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createServiceRoleClient } from '@stockalert/database/server'
import { isSupportedPlatform } from '@stockalert/integrations-core'
import { getConnector } from '../../../../lib/connector-registry'
import { enqueueWebhookEvent } from '@stockalert/queue'
import { rateLimitApi, rateLimitStore, isFirstDelivery } from '../../../../lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function collectHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => { headers[key] = value })
  return headers
}

function collectQuery(request: NextRequest): Record<string, string> {
  const query: Record<string, string> = {}
  request.nextUrl.searchParams.forEach((value, key) => { query[key] = value })
  return query
}

// eBay's mandatory GET handshake before it will activate a webhook
// subscription, and the equivalent for any other platform with a
// challenge-response verification step (e.g. an SNS subscription confirm).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params
  if (!isSupportedPlatform(platform)) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 404 })
  }

  const connector = await getConnector(platform)
  if (!connector.verifyChallenge) {
    return NextResponse.json({ error: 'Not supported' }, { status: 404 })
  }

  const challenge = await connector.verifyChallenge({ url: request.url, query: collectQuery(request) })
  if (!challenge) {
    return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 })
  }

  return new NextResponse(challenge.body, {
    status: challenge.status,
    headers: { 'Content-Type': challenge.contentType },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const limited = await rateLimitApi(request)
  if (limited) return limited

  const { platform } = await params

  if (!isSupportedPlatform(platform)) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 404 })
  }

  const connector = await getConnector(platform)
  if (!connector.supportsPush) {
    return NextResponse.json({ error: `${platform} does not support webhooks (poll-only)` }, { status: 405 })
  }

  const rawBody = await request.text()
  const headers = collectHeaders(request)
  const query = collectQuery(request)
  const ip = headers['x-forwarded-for']?.split(',')[0]?.trim() ?? ''

  // Look up the store by the platform-specific shop identifier
  const shopId = headers['x-shopify-shop-domain']
    ?? headers['x-store-id']
    ?? query['storeId']
    ?? ''

  const db = createServiceRoleClient()
  const { data: store } = await db
    .from('connected_stores')
    .select('id, team_id, store_secrets(webhook_secret)')
    .eq('platform', platform)
    .eq('external_store_id', shopId)
    .single()

  // webhook_secret now lives in store_secrets (RLS-enabled, zero policies —
  // service-role only; see 20260819000000_security_hardening). The
  // embedded select above returns it as a nested object via the FK.
  const webhookSecret = store?.store_secrets?.webhook_secret

  if (!store || !webhookSecret) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  const withinStoreLimit = await rateLimitStore(store.id)
  if (!withinStoreLimit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Fail closed in EVERY environment — a signature-check bypass, even a
  // dev-only one guarded by NODE_ENV, is exactly how bypasses end up live
  // in production. There is no environment where an unverified webhook
  // should be accepted.
  let valid: boolean
  try {
    valid = await connector.verifyWebhookSignature({
      headers,
      rawBody,
      secret: webhookSecret,
      url: request.url,
      ip,
      query,
    })
  } catch (err) {
    console.error(`[webhook] ${platform} signature verification threw`, err)
    return NextResponse.json({ error: 'Signature verification error' }, { status: 401 })
  }

  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Replay protection: dedupe on whatever event-id-shaped header the
  // platform sends, falling back to a body hash so identical retried
  // payloads within the window are still caught.
  const eventId = headers['x-shopify-webhook-id']
    ?? headers['x-ebay-notification-id']
    ?? createHash('sha256').update(rawBody).digest('hex')
  const isNew = await isFirstDelivery(store.id, eventId)
  if (!isNew) {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
  }

  // Enqueue for async processing
  try {
    await enqueueWebhookEvent({
      type: 'webhook_event',
      platform,
      storeId: store.id,
      teamId: store.team_id,
      rawBody,
      headers,
    })
  } catch {
    // QStash not configured locally — log and accept
    console.warn('[webhook] QStash not configured, skipping enqueue')
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
