import type { NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { Receiver } from '@upstash/qstash'

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length || bufA.length === 0) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Shared by every cron/queue-triggered route under api/worker/* (sync,
 * digest, predict). Two legitimate callers, both verified by secret
 * rather than by a client-settable header:
 *  - Vercel Cron: injects `Authorization: Bearer ${CRON_SECRET}`
 *    automatically once CRON_SECRET is set as an env var. This is NOT the
 *    same as the `x-vercel-cron` header, which any external caller can
 *    set on a plain POST.
 *  - QStash: signs the request body; verified via its signing keys, not
 *    just the presence of a header.
 * `WORKER_SECRET` remains as a bearer fallback for internal calls (e.g.
 * the "sync now" button in triggerManualSync).
 */
export async function isAuthorizedWorkerRequest(request: NextRequest, rawBody: string): Promise<boolean> {
  const authHeader = request.headers.get('authorization') ?? ''

  const [scheme, token] = authHeader.split(' ')
  const bearerToken = scheme === 'Bearer' ? token : undefined

  const workerSecret = process.env['WORKER_SECRET']
  if (workerSecret && bearerToken && safeEqual(bearerToken, workerSecret)) return true

  const cronSecret = process.env['CRON_SECRET']
  if (cronSecret && bearerToken && safeEqual(bearerToken, cronSecret)) return true

  const signature = request.headers.get('upstash-signature')
  const currentSigningKey = process.env['QSTASH_CURRENT_SIGNING_KEY']
  if (signature && currentSigningKey) {
    try {
      const receiver = new Receiver({
        currentSigningKey,
        nextSigningKey: process.env['QSTASH_NEXT_SIGNING_KEY'] ?? currentSigningKey,
      })
      return await receiver.verify({ signature, body: rawBody })
    } catch {
      return false
    }
  }

  return false
}
