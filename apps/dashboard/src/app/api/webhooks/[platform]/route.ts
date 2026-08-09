import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@stockalert/database/server'
import { SUPPORTED_PLATFORMS } from '@stockalert/integrations-core'
import { getConnector } from '../../../../lib/connector-registry'
import { enqueueWebhookEvent } from '@stockalert/queue'
import { rateLimit } from '../../../../lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const limited = await rateLimit(request)
  if (limited) return limited

  const { platform } = await params

  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 404 })
  }

  const rawBody = await request.text()
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => { headers[key] = value })

  // Look up the store by the platform-specific shop identifier
  const shopId = headers['x-shopify-shop-domain']
    ?? headers['x-store-id']
    ?? new URL(request.url).searchParams.get('storeId')
    ?? ''

  const db = createServiceRoleClient()
  const { data: store } = await db
    .from('connected_stores')
    .select('id, team_id, webhook_secret')
    .eq('platform', platform)
    .eq('external_store_id', shopId)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  // Verify signature using the platform connector
  try {
    const connector = await getConnector(platform)
    const webhookSecret = (store.webhook_secret as string | null) ?? ''
    const valid = connector.verifyWebhookSignature(headers, rawBody, webhookSecret)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } catch {
    // If connector has no verifyWebhookSignature or throws, let it through in dev
    if (process.env['NODE_ENV'] === 'production') {
      return NextResponse.json({ error: 'Signature verification error' }, { status: 500 })
    }
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
