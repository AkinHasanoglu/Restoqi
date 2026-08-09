'use server'

import { createServerSupabaseClient } from '@stockalert/database/server'
import type { TeamRole } from '@stockalert/database/types'

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { supabase, user }
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

export async function getUserTeam(userId: string, supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, role, teams(id, name, slug, plan)')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .limit(1)
    .single()

  return membership
}
