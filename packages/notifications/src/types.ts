export type AlertChannel = 'email' | 'slack' | 'telegram' | 'sms' | 'webhook' | 'n8n'
export type ThresholdType = 'absolute' | 'percentage' | 'days_of_supply'

export interface AlertRule {
  id: string
  teamId: string
  name: string
  thresholdType: ThresholdType
  thresholdValue: number
  channels: AlertChannel[]
  // scope
  allProducts: boolean
  storeIds: string[]
  productIds: string[]
  tags: string[]
  // throttle
  silenceWindowMinutes: number
  throttleMinutes: number
  enabled: boolean
}

export interface InventorySnapshot {
  teamId: string
  storeId: string
  productId: string
  productExternalId: string
  quantity: number
  platform: string
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
  channels: AlertChannel[]
}

export interface NotificationChannel {
  type: AlertChannel
  config: Record<string, string>
}
