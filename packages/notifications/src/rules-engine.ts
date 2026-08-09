import type { AlertRule, InventorySnapshot, AlertPayload } from './types'

export function evaluateRule(rule: AlertRule, snapshot: InventorySnapshot, avgDailySales: number): boolean {
  if (!rule.enabled) return false

  // Scope check — at least one of storeIds or productIds must match
  if (!rule.allProducts) {
    const inStore = rule.storeIds.length > 0 && rule.storeIds.includes(snapshot.storeId)
    const inProduct = rule.productIds.length > 0 && rule.productIds.includes(snapshot.productId)
    if (!inStore && !inProduct) return false
  }

  switch (rule.thresholdType) {
    case 'absolute':
      return snapshot.quantity <= rule.thresholdValue
    case 'percentage':
      // Not meaningful without a "max stock" baseline — skip for now
      return false
    case 'days_of_supply': {
      if (avgDailySales <= 0) return false
      const daysLeft = snapshot.quantity / avgDailySales
      return daysLeft <= rule.thresholdValue
    }
    default:
      return false
  }
}

export function buildAlertPayload(
  rule: AlertRule,
  snapshot: InventorySnapshot,
  productTitle: string,
): AlertPayload {
  return {
    ruleId: rule.id,
    teamId: rule.teamId,
    storeId: snapshot.storeId,
    productId: snapshot.productId,
    productTitle,
    platform: snapshot.platform,
    currentQuantity: snapshot.quantity,
    thresholdValue: rule.thresholdValue,
    thresholdType: rule.thresholdType,
    channels: rule.channels,
  }
}
