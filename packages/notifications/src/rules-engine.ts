import type { AlertRule, InventorySnapshot, AlertPayload, NotificationChannel, QuietHours, RuleEvaluationContext } from './types'

export function evaluateRule(rule: AlertRule, snapshot: InventorySnapshot, context: RuleEvaluationContext): boolean {
  if (!rule.isActive) return false

  // Scope check — empty on all three scope arrays means "all products".
  // A product matches if it's in ANY configured scope dimension (store OR
  // product OR tag), not all three — a rule scoped only by tags previously
  // could never fire at all: isScoped went true from rule.tags alone, but
  // inStore/inProduct were unconditionally false since their own arrays
  // were empty, so every product failed the check regardless of tags.
  const isScoped = rule.storeIds.length > 0 || rule.productIds.length > 0 || rule.tags.length > 0
  if (isScoped) {
    const inStore = rule.storeIds.length > 0 && rule.storeIds.includes(snapshot.storeId)
    const inProduct = rule.productIds.length > 0 && rule.productIds.includes(snapshot.productId)
    const inTags = rule.tags.length > 0 && rule.tags.some((t) => snapshot.tags.includes(t))
    if (!inStore && !inProduct && !inTags) return false
  }

  switch (rule.thresholdType) {
    case 'absolute':
      return snapshot.quantity <= rule.thresholdValue
    case 'percentage': {
      if (context.maxQuantityBaseline <= 0) return false
      const pct = (snapshot.quantity / context.maxQuantityBaseline) * 100
      return pct <= rule.thresholdValue
    }
    case 'days_of_supply': {
      if (context.avgDailySales <= 0) return false
      const daysLeft = snapshot.quantity / context.avgDailySales
      return daysLeft <= rule.thresholdValue
    }
    default:
      return false
  }
}

/**
 * Wall-clock suppression window (distinct from cooldown_minutes, a
 * per-product duration). Compares local time-of-day in `quietHours.tz`
 * against [start, end) — a window where start > end is treated as
 * crossing midnight (e.g. 22:00 -> 08:00).
 */
export function isWithinQuietHours(quietHours: QuietHours | null, now: Date = new Date()): boolean {
  if (!quietHours) return false

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: quietHours.tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const currentTime = formatter.format(now) // "HH:mm"
  const { start, end } = quietHours

  if (start <= end) {
    return currentTime >= start && currentTime < end
  }
  return currentTime >= start || currentTime < end
}

export function buildAlertPayload(
  rule: AlertRule,
  snapshot: InventorySnapshot,
  productTitle: string,
  resolvedChannels: NotificationChannel[],
  locale: string,
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
    channels: resolvedChannels.map((c) => c.type),
    locale,
  }
}
