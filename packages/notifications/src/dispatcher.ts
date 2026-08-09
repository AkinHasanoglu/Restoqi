import type { AlertPayload, AlertChannel, NotificationChannel } from './types'
import { sendEmailAlert } from './channels/email'
import { sendSlackAlert } from './channels/slack'
import { sendTelegramAlert } from './channels/telegram'
import { sendSmsAlert } from './channels/sms'
import { sendWebhookAlert, sendN8nAlert } from './channels/webhook'

export async function dispatchAlert(
  payload: AlertPayload,
  channels: NotificationChannel[],
): Promise<Array<{ channel: AlertChannel; success: boolean; error?: string }>> {
  const results = await Promise.allSettled(
    channels.map(async (ch) => {
      switch (ch.type) {
        case 'email':
          await sendEmailAlert(payload, ch.config['to'] ?? '')
          return ch.type
        case 'slack':
          await sendSlackAlert(payload, ch.config['webhookUrl'] ?? '')
          return ch.type
        case 'telegram':
          await sendTelegramAlert(payload, ch.config['botToken'] ?? '', ch.config['chatId'] ?? '')
          return ch.type
        case 'sms':
          await sendSmsAlert(payload, ch.config['to'] ?? '')
          return ch.type
        case 'webhook':
          await sendWebhookAlert(payload, ch.config['url'] ?? '')
          return ch.type
        case 'n8n':
          await sendN8nAlert(payload, ch.config['webhookUrl'] ?? '')
          return ch.type
        default:
          throw new Error(`Unknown channel: ${ch.type}`)
      }
    })
  )

  return results.map((r, i) => ({
    channel: channels[i]!.type,
    success: r.status === 'fulfilled',
    error: r.status === 'rejected' ? String((r as PromiseRejectedResult).reason) : undefined,
  }))
}
