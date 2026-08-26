export { createClient } from './client'
export { createServerSupabaseClient, createServiceRoleClient } from './server'
export { createMiddlewareClient } from './middleware'
export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums } from './types/database.types'

import type { Database as Db } from './types/database.types'

// Convenience aliases for the enum unions, derived from the (generated,
// do-not-hand-edit) database.types.ts rather than duplicated by hand —
// keeps them impossible to drift from the actual schema.
export type PlatformType = Db['public']['Enums']['platform_type']
export type TeamRole = Db['public']['Enums']['team_role']
export type AlertChannel = Db['public']['Enums']['alert_channel']
export type ThresholdType = Db['public']['Enums']['threshold_type']
export type AlertStatus = Db['public']['Enums']['alert_status']
export type SubscriptionStatus = Db['public']['Enums']['subscription_status']
export type PlanName = Db['public']['Enums']['plan_name']
export type AiProvider = Db['public']['Enums']['ai_provider']
export type AuditAction = Db['public']['Enums']['audit_action']
