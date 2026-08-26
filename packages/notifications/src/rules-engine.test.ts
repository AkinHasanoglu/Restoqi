import { describe, it, expect } from 'vitest'
import { evaluateRule, buildAlertPayload, isWithinQuietHours } from './rules-engine'
import type { AlertRule, InventorySnapshot, NotificationChannel, RuleEvaluationContext } from './types'

const baseRule: AlertRule = {
  id: 'rule-1',
  teamId: 'team-1',
  name: 'Low stock',
  thresholdType: 'absolute',
  thresholdValue: 10,
  channelIds: ['channel-1'],
  storeIds: [],
  productIds: [],
  tags: [],
  silenceWindowMinutes: 0,
  cooldownMinutes: 240,
  quietHours: null,
  isActive: true,
}

const baseSnapshot: InventorySnapshot = {
  teamId: 'team-1',
  storeId: 'store-1',
  productId: 'prod-1',
  productExternalId: 'ext-1',
  quantity: 5,
  platform: 'shopify',
  tags: [],
}

const baseChannels: NotificationChannel[] = [{ type: 'email', config: { to: 'ops@example.com' } }]
const noContext: RuleEvaluationContext = { avgDailySales: 0, maxQuantityBaseline: 0 }

describe('evaluateRule', () => {
  it('fires when quantity is at threshold', () => {
    expect(evaluateRule(baseRule, baseSnapshot, noContext)).toBe(true)
  })

  it('does not fire when quantity is above threshold', () => {
    expect(evaluateRule(baseRule, { ...baseSnapshot, quantity: 15 }, noContext)).toBe(false)
  })

  it('fires when quantity is exactly at threshold', () => {
    expect(evaluateRule(baseRule, { ...baseSnapshot, quantity: 10 }, noContext)).toBe(true)
  })

  it('does not fire when rule is inactive', () => {
    expect(evaluateRule({ ...baseRule, isActive: false }, baseSnapshot, noContext)).toBe(false)
  })

  it('respects product scope when scoped by productIds', () => {
    const scopedRule: AlertRule = { ...baseRule, productIds: ['prod-2'] }
    expect(evaluateRule(scopedRule, baseSnapshot, noContext)).toBe(false)
  })

  it('fires for matched product in scope', () => {
    const scopedRule: AlertRule = { ...baseRule, productIds: ['prod-1'] }
    expect(evaluateRule(scopedRule, baseSnapshot, noContext)).toBe(true)
  })

  it('fires for matched store in scope', () => {
    const scopedRule: AlertRule = { ...baseRule, storeIds: ['store-1'] }
    expect(evaluateRule(scopedRule, baseSnapshot, noContext)).toBe(true)
  })

  it('fires for a tag-scoped rule when the product carries a matching tag (regression: previously never fired)', () => {
    const scopedRule: AlertRule = { ...baseRule, tags: ['clearance'] }
    const snap: InventorySnapshot = { ...baseSnapshot, tags: ['clearance', 'seasonal'] }
    expect(evaluateRule(scopedRule, snap, noContext)).toBe(true)
  })

  it('does not fire a tag-scoped rule when the product has none of the matching tags', () => {
    const scopedRule: AlertRule = { ...baseRule, tags: ['clearance'] }
    const snap: InventorySnapshot = { ...baseSnapshot, tags: ['seasonal'] }
    expect(evaluateRule(scopedRule, snap, noContext)).toBe(false)
  })

  it('a rule scoped by store only still ignores tags, and vice versa (each scope dimension is independent)', () => {
    const storeScoped: AlertRule = { ...baseRule, storeIds: ['store-2'] }
    expect(evaluateRule(storeScoped, { ...baseSnapshot, tags: ['clearance'] }, noContext)).toBe(false)

    const tagScoped: AlertRule = { ...baseRule, tags: ['clearance'] }
    expect(evaluateRule(tagScoped, { ...baseSnapshot, storeId: 'store-2' }, noContext)).toBe(true)
  })

  it('evaluates days_of_supply correctly', () => {
    const rule: AlertRule = { ...baseRule, thresholdType: 'days_of_supply', thresholdValue: 7 }
    const snap: InventorySnapshot = { ...baseSnapshot, quantity: 14 }
    // 14 units / 3 sales/day = 4.67 days → below 7 → fires
    expect(evaluateRule(rule, snap, { avgDailySales: 3, maxQuantityBaseline: 0 })).toBe(true)
    // 14 units / 1 sale/day = 14 days → above 7 → does not fire
    expect(evaluateRule(rule, snap, { avgDailySales: 1, maxQuantityBaseline: 0 })).toBe(false)
  })

  it('does not fire days_of_supply when avgDailySales is 0', () => {
    const rule: AlertRule = { ...baseRule, thresholdType: 'days_of_supply', thresholdValue: 7 }
    expect(evaluateRule(rule, baseSnapshot, noContext)).toBe(false)
  })

  it('evaluates percentage against the max-quantity baseline', () => {
    const rule: AlertRule = { ...baseRule, thresholdType: 'percentage', thresholdValue: 20 }
    // 5 / 100 = 5% → below 20% → fires
    expect(evaluateRule(rule, baseSnapshot, { avgDailySales: 0, maxQuantityBaseline: 100 })).toBe(true)
    // 5 / 20 = 25% → above 20% → does not fire
    expect(evaluateRule(rule, baseSnapshot, { avgDailySales: 0, maxQuantityBaseline: 20 })).toBe(false)
  })

  it('does not fire percentage when there is no baseline', () => {
    const rule: AlertRule = { ...baseRule, thresholdType: 'percentage', thresholdValue: 20 }
    expect(evaluateRule(rule, baseSnapshot, noContext)).toBe(false)
  })
})

describe('isWithinQuietHours', () => {
  it('returns false when quietHours is null', () => {
    expect(isWithinQuietHours(null)).toBe(false)
  })

  it('detects a same-day window', () => {
    const quietHours = { start: '09:00', end: '17:00', tz: 'UTC' }
    expect(isWithinQuietHours(quietHours, new Date('2026-01-01T12:00:00Z'))).toBe(true)
    expect(isWithinQuietHours(quietHours, new Date('2026-01-01T20:00:00Z'))).toBe(false)
  })

  it('detects an overnight window crossing midnight', () => {
    const quietHours = { start: '22:00', end: '08:00', tz: 'UTC' }
    expect(isWithinQuietHours(quietHours, new Date('2026-01-01T23:00:00Z'))).toBe(true)
    expect(isWithinQuietHours(quietHours, new Date('2026-01-02T03:00:00Z'))).toBe(true)
    expect(isWithinQuietHours(quietHours, new Date('2026-01-01T12:00:00Z'))).toBe(false)
  })

  it('respects the configured timezone', () => {
    // 22:00 UTC = 01:00 Europe/Istanbul (UTC+3) — inside a 00:00-06:00 Istanbul quiet window.
    const quietHours = { start: '00:00', end: '06:00', tz: 'Europe/Istanbul' }
    expect(isWithinQuietHours(quietHours, new Date('2026-01-01T22:00:00Z'))).toBe(true)
    expect(isWithinQuietHours(quietHours, new Date('2026-01-01T10:00:00Z'))).toBe(false)
  })

  it('stays correct across a DST transition (Europe/Istanbul has been fixed UTC+3 since 2016, but this must not assume a fixed UTC offset)', () => {
    // Regression guard for a naive "subtract a fixed offset" implementation
    // instead of using Intl.DateTimeFormat with the IANA zone — verifies
    // the same wall-clock window resolves correctly on two dates that
    // would have different offsets under a DST-observing zone.
    const quietHours = { start: '22:00', end: '06:00', tz: 'America/New_York' }
    // 03:30 UTC in January (EST, UTC-5) = 22:30 America/New_York previous day -> inside window.
    expect(isWithinQuietHours(quietHours, new Date('2026-01-15T03:30:00Z'))).toBe(true)
    // 03:30 UTC in July (EDT, UTC-4) = 23:30 America/New_York previous day -> inside window.
    expect(isWithinQuietHours(quietHours, new Date('2026-07-15T03:30:00Z'))).toBe(true)
    // 12:00 UTC in July (EDT) = 08:00 America/New_York -> outside window.
    expect(isWithinQuietHours(quietHours, new Date('2026-07-15T12:00:00Z'))).toBe(false)
  })
})

describe('buildAlertPayload', () => {
  it('builds correct payload with channels derived from resolved channels', () => {
    const payload = buildAlertPayload(baseRule, baseSnapshot, 'Test Product', baseChannels, 'tr')
    expect(payload.ruleId).toBe('rule-1')
    expect(payload.productTitle).toBe('Test Product')
    expect(payload.currentQuantity).toBe(5)
    expect(payload.thresholdValue).toBe(10)
    expect(payload.channels).toEqual(['email'])
    expect(payload.locale).toBe('tr')
  })

  it('reflects an empty channel list when nothing resolved', () => {
    const payload = buildAlertPayload(baseRule, baseSnapshot, 'Test Product', [], 'en')
    expect(payload.channels).toEqual([])
  })
})
