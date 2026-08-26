import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

let redisClient: Redis | null | undefined
let apiRatelimit: Ratelimit | null = null
let authRatelimit: Ratelimit | null = null
let storeRatelimit: Ratelimit | null = null
let manualSyncRatelimit: Ratelimit | null = null

/** Returns null (never throws) when Upstash isn't configured — every caller degrades to "allow". */
function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient
  const url = process.env['UPSTASH_REDIS_REST_URL']
  const token = process.env['UPSTASH_REDIS_REST_TOKEN']
  redisClient = url && token ? new Redis({ url, token }) : null
  // A misconfigured production deploy silently running with every rate
  // limit disabled (auth brute-force, manual-sync cost abuse, webhook
  // flooding) is exactly the kind of thing nobody notices until it's
  // exploited — this makes it loud instead. Not fail-closed: taking down
  // login/signup because Redis env vars are missing would be a worse
  // outage than a temporarily-unlimited rate. See 2nd security audit item 9.
  if (!redisClient && process.env['NODE_ENV'] === 'production') {
    console.error('[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set in production — all rate limits are disabled')
  }
  return redisClient
}

function getApiRatelimit(): Ratelimit | null {
  if (apiRatelimit) return apiRatelimit
  const redis = getRedisClient()
  if (!redis) return null
  apiRatelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'rl:api' })
  return apiRatelimit
}

function getAuthRatelimit(): Ratelimit | null {
  if (authRatelimit) return authRatelimit
  const redis = getRedisClient()
  if (!redis) return null
  authRatelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:auth' })
  return authRatelimit
}

function getStoreRatelimit(): Ratelimit | null {
  if (storeRatelimit) return storeRatelimit
  const redis = getRedisClient()
  if (!redis) return null
  storeRatelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:store_sync' })
  return storeRatelimit
}

function getManualSyncRatelimit(): Ratelimit | null {
  if (manualSyncRatelimit) return manualSyncRatelimit
  const redis = getRedisClient()
  if (!redis) return null
  // Deliberately tighter than rateLimitStore's 10/min — that one guards a
  // webhook route against a misbehaving *marketplace*; this guards a
  // "Sync now" button a *user* can click, which fans out to a real
  // marketplace API call plus a full alert-dispatch pass (email/SMS cost)
  // per press. See 2nd security audit item 9.
  manualSyncRatelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '5 m'), prefix: 'rl:manual_sync' })
  return manualSyncRatelimit
}

function requestIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous'
}

/** Moderate per-IP limit (20/min) for general API routes. */
export async function rateLimitApi(request: NextRequest): Promise<NextResponse | null> {
  const rl = getApiRatelimit()
  if (!rl) return null

  const { success } = await rl.limit(requestIp(request))
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  return null
}

/**
 * Strict per-IP limit (5/min) for unauthenticated auth-adjacent surfaces
 * (login/signup/forgot-password/accept-invite pages).
 */
export async function rateLimitAuth(request: NextRequest): Promise<NextResponse | null> {
  const rl = getAuthRatelimit()
  if (!rl) return null

  const { success } = await rl.limit(requestIp(request))
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  return null
}

/**
 * Same limiter as rateLimitAuth, for use from Server Actions (which don't
 * receive a NextRequest, so pull the IP from the request-scoped headers()
 * instead). login/signup/forgot-password/magic-link used to call Supabase
 * directly from the browser, bypassing this file entirely — this closes
 * that gap. Returns true when allowed (or when Redis isn't configured —
 * same fail-open posture as every other limiter here). See 2nd security
 * audit item 5.
 */
export async function checkAuthRateLimit(): Promise<boolean> {
  const rl = getAuthRatelimit()
  if (!rl) return true
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous'
  const { success } = await rl.limit(ip)
  return success
}

/**
 * Per-store limiter for webhook routes — on top of the per-IP limiter,
 * so one compromised or misbehaving store can't flood the sync queue
 * even from a rotating set of IPs.
 */
export async function rateLimitStore(storeId: string): Promise<boolean> {
  const rl = getStoreRatelimit()
  if (!rl) return true
  const { success } = await rl.limit(storeId)
  return success
}

/** Per-store limit (3 per 5 min) for the "Sync now" Server Action. */
export async function rateLimitManualSync(storeId: string): Promise<boolean> {
  const rl = getManualSyncRatelimit()
  if (!rl) return true
  const { success } = await rl.limit(storeId)
  return success
}

/**
 * Replay protection: returns true the first time a given event is seen
 * for a store, false on any subsequent delivery within the TTL window.
 * Gracefully allows (returns true) when Redis isn't configured — this is
 * a defense-in-depth measure, not the primary authorization control.
 */
export async function isFirstDelivery(storeId: string, eventId: string, ttlSeconds = 300): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) return true
  const key = `webhook:seen:${storeId}:${eventId}`
  // NX = only set if not already present; returns null if the key existed.
  const result = await redis.set(key, '1', { nx: true, ex: ttlSeconds })
  return result !== null
}
