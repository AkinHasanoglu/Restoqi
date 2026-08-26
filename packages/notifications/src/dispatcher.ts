import type { AlertPayload, AlertChannel, NotificationChannel } from './types'
import { sendEmailAlert } from './channels/email'
import { sendSlackAlert } from './channels/slack'
import { sendTelegramAlert } from './channels/telegram'
import { sendSmsAlert } from './channels/sms'
import { sendWebhookAlert, sendN8nAlert } from './channels/webhook'
import { enqueueNotificationRetry } from '@stockalert/queue'

const CHANNEL_TIMEOUT_MS = 10_000

export interface DispatchTarget {
  deliveryId: string
  channel: NotificationChannel
}

export interface DispatchResult {
  deliveryId: string
  channel: AlertChannel
  success: boolean
  error?: string
}

async function sendToChannel(payload: AlertPayload, channel: NotificationChannel): Promise<void> {
  switch (channel.type) {
    case 'email':
      return sendEmailAlert(payload, channel.config['to'] ?? '')
    case 'slack':
      return sendSlackAlert(payload, channel.config['webhookUrl'] ?? '')
    case 'telegram':
      return sendTelegramAlert(payload, channel.config['botToken'] ?? '', channel.config['chatId'] ?? '')
    case 'sms':
      return sendSmsAlert(payload, channel.config['to'] ?? '')
    case 'webhook':
      return sendWebhookAlert(payload, channel.config['url'] ?? '')
    case 'n8n':
      return sendN8nAlert(payload, channel.config['webhookUrl'] ?? '')
    default: {
      const exhaustive: never = channel.type
      throw new Error(`Unknown channel: ${String(exhaustive)}`)
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${String(ms)}ms`)), ms)
    }),
  ])
}

/**
 * Fans out one alert to N channels in parallel. Each channel gets its own
 * timeout so one hung webhook (e.g. a rate-limited Slack app) can't block
 * the others or the sync worker's overall request — previously a single
 * `Promise.allSettled` with no per-item timeout meant a channel that never
 * resolves would hang the entire sync run until the platform's own request
 * timeout kicked in.
 *
 * A channel that fails is not retried in-process (a second synchronous
 * attempt inside the same request would just re-hit the same timeout).
 * Instead it's queued once via QStash (enqueueNotificationRetry) and
 * re-attempted out of band by the worker's `notification_retry` branch —
 * best-effort: if QStash isn't configured, the delivery still correctly
 * shows as failed, it just won't self-heal.
 */
export async function dispatchAlert(
  payload: AlertPayload,
  targets: DispatchTarget[],
): Promise<DispatchResult[]> {
  return Promise.all(
    targets.map(async ({ deliveryId, channel }): Promise<DispatchResult> => {
      try {
        await withTimeout(sendToChannel(payload, channel), CHANNEL_TIMEOUT_MS, `${channel.type} delivery`)
        return { deliveryId, channel: channel.type, success: true }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        try {
          await enqueueNotificationRetry({
            type: 'notification_retry',
            deliveryId,
            teamId: payload.teamId,
            channelType: channel.type,
            channelConfig: channel.config,
            alertPayload: payload as unknown as Record<string, unknown>,
            attempt: 1,
          })
        } catch (queueErr) {
          console.error('[dispatcher] failed to enqueue notification retry', queueErr)
        }
        return { deliveryId, channel: channel.type, success: false, error }
      }
    })
  )
}

/**
 * Re-attempts a single channel exactly once. Called from the sync worker's
 * `notification_retry` branch, reconstructing the channel from the queue
 * payload's plain `channelType`/`channelConfig` rather than a live
 * notification_channels row (the channel may have been edited or deleted
 * since the original attempt — retrying with what was actually sent the
 * first time is the correct behavior).
 */
export async function retryChannel(
  payload: AlertPayload,
  channel: NotificationChannel,
): Promise<{ success: boolean; error?: string }> {
  try {
    await withTimeout(sendToChannel(payload, channel), CHANNEL_TIMEOUT_MS, `${channel.type} retry`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
