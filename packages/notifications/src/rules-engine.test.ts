import { describe, it, expect } from 'vitest'
import { evaluateRule, buildAlertPayload } from './rules-engine'
import type { AlertRule, InventorySnapshot } from './types'

const baseRule: AlertRule = {
  id: 'rule-1',
  teamId: 'team-1',
  name: 'Low stock',
  thresholdType: 'absolute',
  thresholdValue: 10,
  channels: ['email'],
  allProducts: true,
  storeIds: [],
  productIds: [],
  tags: [],
  silenceWindowMinutes: 0,
  throttleMinutes: 60,
  enabled: true,
}

const baseSnapshot: InventorySnapshot = {
  teamId: 'team-1',
  storeId: 'store-1',
  productId: 'prod-1',
  productExternalId: 'ext-1',
  quantity: 5,
  platform: 'shopify',
}

describe('evaluateRule', () => {
  it('fires when quantity is at threshold', () => {
    expect(evaluateRule(baseRule, baseSnapshot, 0)).toBe(true)
  })

  it('does not fire when quantity is above threshold', () => {
    expect(evaluateRule(baseRule, { ...baseSnapshot, quantity: 15 }, 0)).toBe(false)
  })

  it('fires when quantity is exactly at threshold', () => {
    expect(evaluateRule(baseRule, { ...baseSnapshot, quantity: 10 }, 0)).toBe(true)
  })

  it('does not fire when rule is disabled', () => {
    expect(evaluateRule({ ...baseRule, enabled: false }, baseSnapshot, 0)).toBe(false)
  })

  it('respects product scope when allProducts is false', () => {
    const scopedRule: AlertRule = { ...baseRule, allProducts: false, productIds: ['prod-2'] }
    expect(evaluateRule(scopedRule, baseSnapshot, 0)).toBe(false)
  })

  it('fires for matched product in scope', () => {
    const scopedRule: AlertRule = { ...baseRule, allProducts: false, productIds: ['prod-1'] }
    expect(evaluateRule(scopedRule, baseSnapshot, 0)).toBe(true)
  })

  it('evaluates days_of_supply correctly', () => {
    const rule: AlertRule = { ...baseRule, thresholdType: 'days_of_supply', thresholdValue: 7 }
    const snap: InventorySnapshot = { ...baseSnapshot, quantity: 14 }
    // 14 units / 3 sales/day = 4.67 days → below 7 → fires
    expect(evaluateRule(rule, snap, 3)).toBe(true)
    // 14 units / 1 sale/day = 14 days → above 7 → does not fire
    expect(evaluateRule(rule, snap, 1)).toBe(false)
  })

  it('does not fire days_of_supply when avgDailySales is 0', () => {
    const rule: AlertRule = { ...baseRule, thresholdType: 'days_of_supply', thresholdValue: 7 }
    expect(evaluateRule(rule, baseSnapshot, 0)).toBe(false)
  })
})

describe('buildAlertPayload', () => {
  it('builds correct payload', () => {
    const payload = buildAlertPayload(baseRule, baseSnapshot, 'Test Product')
    expect(payload.ruleId).toBe('rule-1')
    expect(payload.productTitle).toBe('Test Product')
    expect(payload.currentQuantity).toBe(5)
    expect(payload.thresholdValue).toBe(10)
    expect(payload.channels).toEqual(['email'])
  })
})
