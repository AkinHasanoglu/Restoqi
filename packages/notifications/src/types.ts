export type AlertChannel = 'email' | 'slack' | 'telegram' | 'sms' | 'webhook' | 'n8n'
export type ThresholdType = 'absolute' | 'percentage' | 'days_of_supply'

export interface QuietHours {
  /** "HH:mm", local to `tz`. May cross midnight (start > end). */
  start: string
  end: string
  tz: string
}

export interface AlertRule {
  id: string
  teamId: string
  name: string
  thresholdType: ThresholdType
  thresholdValue: number
  // Points at specific notification_channels rows, not raw channel-type
  // enum values — a bare type can't carry delivery config (webhook URL,
  // bot token, recipient). See schema_completion migration's D1 note.
  channelIds: string[]
  // scope — empty on all three means "applies to all products" (no
  // separate boolean; see D6)
  storeIds: string[]
  productIds: string[]
  tags: string[]
  // throttle
  silenceWindowMinutes: number
  cooldownMinutes: number
  quietHours: QuietHours | null
  isActive: boolean
}

export interface RuleEvaluationContext {
  /** Trailing ~14-day average units depleted per day, for days_of_supply. */
  avgDailySales: number
  /** Trailing ~30-day maximum quantity seen, used as the 100% baseline for percentage. */
  maxQuantityBaseline: number
}

export interface InventorySnapshot {
  teamId: string
  storeId: string
  productId: string
  productExternalId: string
  quantity: number
  platform: string
  /** The product's own tags (products.tags) — matched against AlertRule.tags for tag-scoped rules. */
  tags: string[]
}

export interface AlertPayload {
  ruleId: string
  teamId: string
  storeId: string
  productId: string
  productTitle: string
  platform: string
  currentQuantity: number
  thresholdValue: number
  thresholdType: ThresholdType
  // Derived from the resolved channels passed to buildAlertPayload, not
  // stored on the rule (see AlertRule.channelIds above).
  channels: AlertChannel[]
  // teams.locale — a plain `text` column (CHECK-constrained, not a Postgres
  // enum), so it's typed as `string` here rather than importing
  // @stockalert/i18n's Locale union just for this one field. Channels that
  // render user-facing copy (email) use it to pick a dictionary; channels
  // that don't (webhook, sms) can ignore it.
  locale: string
}

export interface NotificationChannel {
  type: AlertChannel
  config: Record<string, string>
}
