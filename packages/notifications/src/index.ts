export type { AlertRule, InventorySnapshot, AlertPayload, NotificationChannel, AlertChannel, ThresholdType } from './types'
export { evaluateRule, buildAlertPayload } from './rules-engine'
export { dispatchAlert } from './dispatcher'
