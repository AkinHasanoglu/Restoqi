import type { AlertPayload } from '../types'
import { safeFetch } from '@stockalert/integrations-core'

// Same SSRF concern as sendWebhookAlert: webhookUrl is admin-supplied
// config, not necessarily hooks.slack.com — validate before fetching.
export async function sendSlackAlert(payload: AlertPayload, webhookUrl: string) {
  const text = `⚠️ *Low Stock Alert*: *${payload.productTitle}* (${payload.platform}) has only *${payload.currentQuantity} units* left — below threshold of ${payload.thresholdValue}.`
  const res = await safeFetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`Slack webhook failed: ${res.status}`)
}
