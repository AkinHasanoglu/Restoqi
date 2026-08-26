import { createHmac, timingSafeEqual } from 'node:crypto'

// Paddle sends `Paddle-Signature: ts=<unix_seconds>;h1=<hex hmac>`.
// The signed payload is `${ts}:${rawBody}`, not the raw body alone.
// https://developer.paddle.com/webhooks/signature-verification
const MAX_SIGNATURE_AGE_SECONDS = 5 * 60

export function verifyPaddleSignature(rawBody: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(';').map((p) => p.split('=') as [string, string])
  )
  const ts = parts['ts']
  const h1 = parts['h1']
  if (!ts || !h1) return false

  const age = Math.abs(Date.now() / 1000 - Number(ts))
  if (!Number.isFinite(age) || age > MAX_SIGNATURE_AGE_SECONDS) return false

  const digest = createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(h1))
  } catch {
    return false
  }
}

import type { BillingInterval, PlanName } from '@stockalert/plans'

/** @deprecated use PlanName from @stockalert/plans */
export type PaddlePlan = PlanName

export interface PaddlePriceMapping {
  plan: PlanName
  interval: BillingInterval
}

// ANNUAL (not YEARLY) to match the pre-existing env var naming convention
// this project already shipped with; only the plan segment (BUSINESS →
// GROWTH, ENTERPRISE → SCALE) changed for the starter/growth/scale rename.
const PLAN_PRICE_ENV_VARS = [
  ['NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_MONTHLY', 'starter', 'monthly'],
  ['NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_ANNUAL', 'starter', 'yearly'],
  ['NEXT_PUBLIC_PADDLE_PRICE_ID_GROWTH_MONTHLY', 'growth', 'monthly'],
  ['NEXT_PUBLIC_PADDLE_PRICE_ID_GROWTH_ANNUAL', 'growth', 'yearly'],
  ['NEXT_PUBLIC_PADDLE_PRICE_ID_SCALE_MONTHLY', 'scale', 'monthly'],
  ['NEXT_PUBLIC_PADDLE_PRICE_ID_SCALE_ANNUAL', 'scale', 'yearly'],
] as const satisfies ReadonlyArray<readonly [string, PlanName, BillingInterval]>

/**
 * Takes an env record rather than reading `process.env` directly so tests
 * can pass a fake one instead of mutating global process state between
 * cases. Maps a Paddle price id to both the plan AND the billing interval
 * it was purchased on — the webhook handler persists both onto the
 * subscriptions row.
 */
export function buildPaddlePlanMap(env: Record<string, string | undefined> = process.env): Record<string, PaddlePriceMapping> {
  const map: Record<string, PaddlePriceMapping> = {}
  for (const [envKey, plan, interval] of PLAN_PRICE_ENV_VARS) {
    const priceId = env[envKey]
    if (priceId) map[priceId] = { plan, interval }
  }
  return map
}

/**
 * A silently-empty plan map is exactly the bug this guards against — every
 * subscription would fall back to 'starter' regardless of what was
 * actually purchased. Callers check this at request time rather than
 * module load: `next build` evaluates every route module for static
 * analysis with NODE_ENV=production regardless of whether real secrets
 * are configured yet, so a module-scope throw would fail the build
 * itself, not just an unconfigured deployment.
 */
export function assertPlanMapConfigured(planMap: Record<string, PaddlePriceMapping>, nodeEnv = process.env['NODE_ENV']): void {
  if (nodeEnv === 'production' && Object.keys(planMap).length === 0) {
    throw new Error(
      'No NEXT_PUBLIC_PADDLE_PRICE_ID_* environment variables are configured — ' +
      'every Paddle subscription would silently be mapped to the starter plan.'
    )
  }
}
