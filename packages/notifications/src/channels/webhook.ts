import type { AlertPayload } from '../types'
import { safeFetch } from '@stockalert/integrations-core'

// webhookUrl comes from notification_channels.config, entered by a team
// admin via createNotificationChannel — no server-side URL validation
// existed before this, so an admin (or anyone who compromises an admin
// session) could point a channel at an internal service and have the
// sync worker fetch it. safeFetch enforces https + rejects
// private/loopback/link-local/metadata addresses.
export async function sendWebhookAlert(payload: AlertPayload, webhookUrl: string) {
  const res = await safeFetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'low_stock_alert',
      product_title: payload.productTitle,
      platform: payload.platform,
      current_quantity: payload.currentQuantity,
      threshold_value: payload.thresholdValue,
      threshold_type: payload.thresholdType,
      store_id: payload.storeId,
      product_id: payload.productId,
      timestamp: new Date().toISOString(),
    }),
  })
  if (!res.ok) throw new Error(`Webhook failed: ${res.status}`)
}

export async function sendN8nAlert(payload: AlertPayload, n8nWebhookUrl: string) {
  return sendWebhookAlert(payload, n8nWebhookUrl)
}
