import type { AlertPayload } from '../types'

export async function sendWebhookAlert(payload: AlertPayload, webhookUrl: string) {
  const res = await fetch(webhookUrl, {
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
