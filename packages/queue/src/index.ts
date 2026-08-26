import { Client } from '@upstash/qstash'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

export type SyncJobPayload = {
  type: 'webhook_event'
  platform: string
  storeId: string
  teamId: string
  rawBody: string
  headers: Record<string, string>
} | {
  type: 'poll_store'
  platform: string
  storeId: string
  teamId: string
} | {
  // A single failed alert_deliveries row, re-attempted once out of band
  // instead of blocking the sync worker's response on a slow/unreachable
  // channel (see @stockalert/notifications' dispatcher.ts). Deliberately
  // primitive-typed (no NotificationChannel/AlertPayload import) — queue
  // stays a leaf package, notifications depends on it, not the reverse.
  type: 'notification_retry'
  deliveryId: string
  teamId: string
  channelType: string
  channelConfig: Record<string, string>
  alertPayload: Record<string, unknown>
  attempt: number
}

export function getQStashClient() {
  const token = process.env['QSTASH_TOKEN']
  if (!token) throw new Error('QSTASH_TOKEN is not set')
  return new Client({ token })
}

export function getRedis() {
  const url = process.env['UPSTASH_REDIS_REST_URL']
  const token = process.env['UPSTASH_REDIS_REST_TOKEN']
  if (!url || !token) throw new Error('Upstash Redis env vars not set')
  return new Redis({ url, token })
}

export function getStoreSyncRatelimit(redis: Redis) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'rl:store_sync',
  })
}

export async function enqueueWebhookEvent(payload: Extract<SyncJobPayload, { type: 'webhook_event' }>) {
  const client = getQStashClient()
  const workerUrl = process.env['WORKER_URL'] ?? `${process.env['NEXT_PUBLIC_APP_URL']}/api/worker/sync`
  await client.publishJSON({ url: workerUrl, body: payload })
}

export async function enqueuePollJob(payload: Extract<SyncJobPayload, { type: 'poll_store' }>) {
  const client = getQStashClient()
  const workerUrl = process.env['WORKER_URL'] ?? `${process.env['NEXT_PUBLIC_APP_URL']}/api/worker/sync`
  await client.publishJSON({ url: workerUrl, body: payload })
}

/**
 * Small fixed delay rather than the sync/poll jobs' immediate dispatch —
 * most delivery failures (a webhook endpoint mid-deploy, a rate-limited
 * Slack app) clear up within seconds, and QStash's `delay` is simpler than
 * standing up a separate backoff scheduler for one retry.
 */
export async function enqueueNotificationRetry(payload: Extract<SyncJobPayload, { type: 'notification_retry' }>) {
  const client = getQStashClient()
  const workerUrl = process.env['WORKER_URL'] ?? `${process.env['NEXT_PUBLIC_APP_URL']}/api/worker/sync`
  await client.publishJSON({ url: workerUrl, body: payload, delay: '30s' })
}
