// Single source of truth for plan names, pricing, limits and feature
// gating. Both apps/dashboard (billing page, server actions, workers) and
// apps/landing (pricing page) read from here instead of keeping their own
// copies — before this package existed the three had drifted to three
// different price points for the same plans.

export type PlanName = 'starter' | 'growth' | 'scale'
export type AlertChannel = 'email' | 'slack' | 'telegram' | 'sms' | 'webhook' | 'n8n'
export type BillingInterval = 'monthly' | 'yearly'

export interface PlanLimits {
  stores: number
  products: number
  rules: number
  alertsPerMonth: number
  seats: number
  // -1 would mean "no ceiling", which is deliberately never used here —
  // SMS is billed to the platform's own Twilio account (see
  // packages/notifications/src/channels/sms.ts), not the team's, so an
  // unlimited value would let a single team's rule spam run up our bill
  // with no backstop. Only 'scale' allows the sms channel at all
  // (isChannelAllowed) — starter/growth are 0 and never reach this cap in
  // practice, but the field stays defined on every plan so callers don't
  // need an `?? 0` fallback.
  smsPerMonth: number
}

export interface PlanConfig {
  name: PlanName
  displayName: string
  monthlyPriceUSD: number
  yearlyPriceUSD: number
  limits: PlanLimits
  allowedChannels: readonly AlertChannel[]
  hasCustomThresholds: boolean
  hasVelocityPrediction: boolean
  hasCsvExport: boolean
}

// -1 = unlimited (kept consistent with the pre-existing PLAN_LIMITS
// convention in apps/dashboard/src/lib/plan-limits.ts).
export const PLAN_CONFIGS: Record<PlanName, PlanConfig> = {
  starter: {
    name: 'starter',
    displayName: 'Starter',
    monthlyPriceUSD: 19,
    yearlyPriceUSD: 190,
    limits: { stores: 1, products: 500, rules: 5, alertsPerMonth: 100, seats: 1, smsPerMonth: 0 },
    allowedChannels: ['email', 'telegram'],
    hasCustomThresholds: false,
    hasVelocityPrediction: false,
    hasCsvExport: false,
  },
  growth: {
    name: 'growth',
    displayName: 'Growth',
    monthlyPriceUSD: 49,
    yearlyPriceUSD: 490,
    limits: { stores: 3, products: 2500, rules: 25, alertsPerMonth: 1000, seats: 3, smsPerMonth: 0 },
    allowedChannels: ['email', 'telegram', 'slack'],
    hasCustomThresholds: true,
    hasVelocityPrediction: false,
    hasCsvExport: true,
  },
  scale: {
    name: 'scale',
    displayName: 'Scale',
    monthlyPriceUSD: 119,
    yearlyPriceUSD: 1190,
    // alertsPerMonth was -1 (unlimited) — the one real ceiling that
    // actually mattered (the sms channel, billed to our own Twilio
    // account) had no cap at all. See smsPerMonth's comment on
    // PlanLimits and 2nd security audit item 9. 25,000/mo is generous for
    // a legitimate high-volume seller (every 5-minute sync tick firing an
    // alert would still be ~2x this) while bounding a runaway rule.
    limits: { stores: 10, products: 15000, rules: -1, alertsPerMonth: 25_000, seats: 10, smsPerMonth: 500 },
    allowedChannels: ['email', 'telegram', 'slack', 'sms', 'webhook', 'n8n'],
    hasCustomThresholds: true,
    hasVelocityPrediction: true,
    hasCsvExport: true,
  },
}

/** Back-compat shape for callers that only need the numeric limits, not the full plan config. */
export const PLAN_LIMITS: Record<PlanName, PlanLimits> = Object.fromEntries(
  Object.entries(PLAN_CONFIGS).map(([name, config]) => [name, config.limits])
) as Record<PlanName, PlanLimits>

/** Back-compat alias for the handful of call sites that only ever checked the store limit. */
export const STORE_LIMITS: Record<string, number> = Object.fromEntries(
  Object.entries(PLAN_LIMITS).map(([plan, limits]) => [plan, limits.stores])
)

export function isChannelAllowed(plan: PlanName, channel: AlertChannel): boolean {
  return PLAN_CONFIGS[plan].allowedChannels.includes(channel)
}

// ============================================================
// Reverse trial
// ============================================================

/** New signups get the full Growth feature set for TRIAL_DAYS with no card required. */
export const TRIAL_PLAN: PlanName = 'growth'
export const TRIAL_DAYS = 14

export interface SubscriptionLike {
  plan: PlanName
  status: string
  trial_ends_at: string | null
}

export interface PlanContext {
  /** The plan whose limits/features actually apply right now — differs from the stored plan during an active trial. */
  effectivePlan: PlanName
  isTrialActive: boolean
  /** Whole days remaining in the trial, or null when not trialing. 0 means "expires today". */
  trialDaysLeft: number | null
  /** false ⇒ the UI should show the read-only lock and block write actions. */
  isAccessAllowed: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Computes access from live wall-clock time rather than trusting
 * subscriptions.status alone. The daily trial-expiry cron
 * (api/worker/trial) is what persists status = 'trial_expired', but a
 * request arriving in the hours between trial_ends_at passing and the
 * next cron run must not slip through as still-trialing — so a
 * 'trialing' row past its trial_ends_at is treated as locked here
 * immediately, independent of what the cron has gotten around to yet.
 */
export function resolveEffectivePlan(sub: SubscriptionLike | null, now: Date = new Date()): PlanContext {
  if (!sub) {
    return { effectivePlan: 'starter', isTrialActive: false, trialDaysLeft: null, isAccessAllowed: false }
  }

  if (sub.status === 'trialing') {
    const trialEndsAt = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null
    const isTrialActive = trialEndsAt !== null && trialEndsAt.getTime() > now.getTime()

    if (isTrialActive) {
      const trialDaysLeft = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY_MS))
      return { effectivePlan: TRIAL_PLAN, isTrialActive: true, trialDaysLeft, isAccessAllowed: true }
    }

    return { effectivePlan: sub.plan, isTrialActive: false, trialDaysLeft: 0, isAccessAllowed: false }
  }

  // past_due keeps access open during Paddle's dunning window (retries +
  // payment-failed email); trial_expired/canceled/paused are locked.
  const isAccessAllowed = sub.status === 'active' || sub.status === 'past_due'
  return { effectivePlan: sub.plan, isTrialActive: false, trialDaysLeft: null, isAccessAllowed }
}
