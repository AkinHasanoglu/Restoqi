import { createServerSupabaseClient } from '@stockalert/database/server'
import type { TeamRole } from '@stockalert/database'
import { getPlanContext } from './plan-limits'

// NOTE: intentionally NOT `'use server'`. These are internal helpers imported
// by files that declare their own `'use server'` — marking this file itself
// as a server action module would turn every export (requireAuth,
// requireTeamRole, getPrimaryTeam) into a publicly callable RPC endpoint.

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { supabase, user }
}

/** Convenience for call sites that only need the authenticated user. */
export async function requireUser(): Promise<Awaited<ReturnType<typeof requireAuth>>['user']> {
  const { user } = await requireAuth()
  return user
}

export async function requireTeamRole(teamId: string, minimumRole: TeamRole = 'viewer') {
  const { supabase, user } = await requireAuth()

  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (!membership) throw new Error('Not a team member')

  const roleHierarchy: TeamRole[] = ['viewer', 'editor', 'admin', 'owner']
  const userLevel = roleHierarchy.indexOf(membership.role as TeamRole)
  const requiredLevel = roleHierarchy.indexOf(minimumRole)

  if (userLevel < requiredLevel) throw new Error('Insufficient permissions')

  return { supabase, user, role: membership.role as TeamRole }
}

/**
 * Most server actions operate against the caller's first/primary team
 * (today's model is single-team-per-user). Centralizes the `team_members`
 * lookup that used to be duplicated — inconsistently — across ~11 call
 * sites in actions/* and app/**\/page.tsx.
 */
export async function getPrimaryTeam(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
): Promise<{ team_id: string; role: TeamRole } | null> {
  const { data } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId)
    .order('joined_at')
    .limit(1)
    .single()

  return data
}

export const SUBSCRIPTION_LOCKED_MESSAGE =
  'Your trial has ended or your subscription is inactive. Please choose a plan to continue.'

/**
 * Returns a user-facing block reason when the team's reverse trial has
 * expired (or its subscription otherwise isn't active/past_due), else
 * null — the real write-time enforcement of the read-only lock described
 * in the trial UI. Deliberately returns a string instead of throwing:
 * thrown errors from server actions get routed through toClientError
 * (errors.ts), which intentionally collapses every exception to a
 * generic "Something went wrong" message — right for unexpected/internal
 * errors, but wrong here, since this is an expected, user-actionable
 * state the caller needs to surface verbatim (same reasoning checkLimit
 * and integrations.ts's checkStoreQuota already follow).
 *
 * For call sites that already need the full PlanContext for another
 * reason (e.g. a seat/store limit check right after), read
 * ctx.isAccessAllowed directly and use SUBSCRIPTION_LOCKED_MESSAGE
 * instead of calling this — avoids a second getPlanContext query.
 */
export async function getSubscriptionLockError(
  db: Parameters<typeof getPlanContext>[0],
  teamId: string
): Promise<string | null> {
  const ctx = await getPlanContext(db, teamId)
  return ctx.isAccessAllowed ? null : SUBSCRIPTION_LOCKED_MESSAGE
}
