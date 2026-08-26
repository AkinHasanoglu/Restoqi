import type { createServiceRoleClient } from './server'
import type { createServerSupabaseClient } from './server'
import type { Database, Json } from './types/database.types'

type Db = ReturnType<typeof createServiceRoleClient> | Awaited<ReturnType<typeof createServerSupabaseClient>>
type AuditAction = Database['public']['Enums']['audit_action']

export interface LogAuditParams {
  teamId: string
  userId: string | null
  /**
   * Denormalized at write time rather than joined from auth.users — an
   * audit log is a point-in-time record, and a live join would rewrite
   * history if the user's email changes or the account is deleted later.
   * Also sidesteps auth.users not being PostgREST-embeddable.
   */
  actorEmail: string | null
  action: AuditAction
  entityType?: string
  entityId?: string
  metadata?: Record<string, Json>
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Never throws — an audit write failure must not fail the user's actual
 * action. Logs to the console (Sentry wiring lands in Faz 11) and moves on.
 */
export async function logAudit(db: Db, params: LogAuditParams): Promise<void> {
  try {
    const { error } = await db.from('audit_logs').insert({
      team_id: params.teamId,
      user_id: params.userId,
      actor_email: params.actorEmail,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? {},
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    })
    if (error) {
      console.error('[audit] insert failed', { action: params.action, error: error.message })
    }
  } catch (err) {
    console.error('[audit] insert threw', { action: params.action, err })
  }
}
