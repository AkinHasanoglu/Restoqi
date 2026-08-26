import { describe, expect, it } from 'vitest'
import { isChannelAllowed, PLAN_CONFIGS, resolveEffectivePlan, TRIAL_PLAN } from './index'

describe('resolveEffectivePlan', () => {
  const now = new Date('2026-08-21T12:00:00Z')

  it('grants the trial plan and unlocks access while trial_ends_at is in the future', () => {
    const ctx = resolveEffectivePlan(
      { plan: 'starter', status: 'trialing', trial_ends_at: '2026-08-27T12:00:00Z' },
      now
    )
    expect(ctx).toEqual({ effectivePlan: TRIAL_PLAN, isTrialActive: true, trialDaysLeft: 6, isAccessAllowed: true })
  })

  it('locks access once trial_ends_at has passed, even before the cron flips status', () => {
    const ctx = resolveEffectivePlan(
      { plan: 'starter', status: 'trialing', trial_ends_at: '2026-08-20T12:00:00Z' },
      now
    )
    expect(ctx.isAccessAllowed).toBe(false)
    expect(ctx.isTrialActive).toBe(false)
    expect(ctx.effectivePlan).toBe('starter')
  })

  it('locks access when trialing with no trial_ends_at at all', () => {
    const ctx = resolveEffectivePlan({ plan: 'starter', status: 'trialing', trial_ends_at: null }, now)
    expect(ctx.isAccessAllowed).toBe(false)
  })

  it('unlocks access for an active subscription using its stored plan', () => {
    const ctx = resolveEffectivePlan({ plan: 'scale', status: 'active', trial_ends_at: null }, now)
    expect(ctx).toEqual({ effectivePlan: 'scale', isTrialActive: false, trialDaysLeft: null, isAccessAllowed: true })
  })

  it('keeps access open during past_due (dunning window)', () => {
    const ctx = resolveEffectivePlan({ plan: 'growth', status: 'past_due', trial_ends_at: null }, now)
    expect(ctx.isAccessAllowed).toBe(true)
    expect(ctx.effectivePlan).toBe('growth')
  })

  it('locks access for trial_expired', () => {
    const ctx = resolveEffectivePlan({ plan: 'starter', status: 'trial_expired', trial_ends_at: null }, now)
    expect(ctx.isAccessAllowed).toBe(false)
  })

  it('locks access for canceled', () => {
    const ctx = resolveEffectivePlan({ plan: 'growth', status: 'canceled', trial_ends_at: null }, now)
    expect(ctx.isAccessAllowed).toBe(false)
  })

  it('locks access for paused', () => {
    const ctx = resolveEffectivePlan({ plan: 'growth', status: 'paused', trial_ends_at: null }, now)
    expect(ctx.isAccessAllowed).toBe(false)
  })

  it('locks access and falls back to starter when there is no subscription row', () => {
    const ctx = resolveEffectivePlan(null, now)
    expect(ctx).toEqual({ effectivePlan: 'starter', isTrialActive: false, trialDaysLeft: null, isAccessAllowed: false })
  })

  it('rounds a sub-day remainder up to 1 day left rather than down to 0', () => {
    const ctx = resolveEffectivePlan(
      { plan: 'starter', status: 'trialing', trial_ends_at: '2026-08-21T12:00:00.001Z' },
      now
    )
    expect(ctx.isTrialActive).toBe(true)
    expect(ctx.trialDaysLeft).toBe(1)
  })

  it('reports trialDaysLeft: 0 once the trial has expired (locked, not "still active with 0 left")', () => {
    const ctx = resolveEffectivePlan(
      { plan: 'starter', status: 'trialing', trial_ends_at: '2026-08-21T11:59:59.999Z' },
      now
    )
    expect(ctx.isAccessAllowed).toBe(false)
    expect(ctx.trialDaysLeft).toBe(0)
  })
})

describe('isChannelAllowed', () => {
  it('restricts starter to email and telegram', () => {
    expect(isChannelAllowed('starter', 'email')).toBe(true)
    expect(isChannelAllowed('starter', 'telegram')).toBe(true)
    expect(isChannelAllowed('starter', 'slack')).toBe(false)
    expect(isChannelAllowed('starter', 'webhook')).toBe(false)
    expect(isChannelAllowed('starter', 'sms')).toBe(false)
    expect(isChannelAllowed('starter', 'n8n')).toBe(false)
  })

  it('adds slack for growth but withholds webhook/sms/n8n', () => {
    expect(isChannelAllowed('growth', 'slack')).toBe(true)
    expect(isChannelAllowed('growth', 'webhook')).toBe(false)
    expect(isChannelAllowed('growth', 'sms')).toBe(false)
    expect(isChannelAllowed('growth', 'n8n')).toBe(false)
  })

  it('allows every channel on scale', () => {
    for (const channel of PLAN_CONFIGS['scale'].allowedChannels) {
      expect(isChannelAllowed('scale', channel)).toBe(true)
    }
    expect(PLAN_CONFIGS['scale'].allowedChannels).toEqual(
      expect.arrayContaining(['email', 'telegram', 'slack', 'sms', 'webhook', 'n8n'])
    )
  })
})

describe('PLAN_CONFIGS pricing', () => {
  it('prices yearly at 10x monthly (2 months free) for every plan', () => {
    for (const plan of Object.values(PLAN_CONFIGS)) {
      expect(plan.yearlyPriceUSD).toBe(plan.monthlyPriceUSD * 10)
    }
  })
})

describe('smsPerMonth', () => {
  it('is 0 for plans that do not even allow the sms channel', () => {
    expect(PLAN_CONFIGS['starter'].limits.smsPerMonth).toBe(0)
    expect(PLAN_CONFIGS['growth'].limits.smsPerMonth).toBe(0)
  })

  it('is a finite cap on scale, never -1 — sms is billed to our own Twilio account, not the team\'s', () => {
    expect(PLAN_CONFIGS['scale'].limits.smsPerMonth).toBeGreaterThan(0)
    expect(PLAN_CONFIGS['scale'].limits.smsPerMonth).not.toBe(-1)
  })
})

describe('alertsPerMonth', () => {
  it('is never -1 on any plan — every alertsPerMonth allowance must be enforceable by the sync worker\'s quota check', () => {
    for (const plan of Object.values(PLAN_CONFIGS)) {
      expect(plan.limits.alertsPerMonth).not.toBe(-1)
    }
  })
})
