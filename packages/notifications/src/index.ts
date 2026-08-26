export type { AlertRule, InventorySnapshot, AlertPayload, NotificationChannel, AlertChannel, ThresholdType, QuietHours, RuleEvaluationContext } from './types'
export { evaluateRule, buildAlertPayload, isWithinQuietHours } from './rules-engine'
export { dispatchAlert, retryChannel } from './dispatcher'
export type { DispatchTarget, DispatchResult } from './dispatcher'
export {
  sendInviteAcceptedEmail, sendPaymentFailedEmail, sendWeeklyDigestEmail,
  sendPolicyUpdateEmail, sendTrialReminderEmail,
} from './channels/transactional'
export type {
  SendInviteAcceptedEmailParams, SendPaymentFailedEmailParams, SendWeeklyDigestEmailParams,
  SendPolicyUpdateEmailParams, SendTrialReminderEmailParams,
} from './channels/transactional'
export { isAllowedSmsDestination } from './channels/sms'
