'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAuth, requireTeamRole, type ActionResult } from '../lib/auth-guard'
import { createServiceRoleClient } from '@stockalert/database/server'
import { toClientError } from '../lib/errors'

const deleteTeamSchema = z.object({
  teamId: z.string().uuid(),
  confirmName: z.string().min(1),
})

/**
 * Hard delete — every child row cascades via ON DELETE CASCADE (see the
 * initial migration's FK definitions: connected_stores, products, alerts,
 * alert_rules, subscriptions, api_keys, team_notes, audit_logs, etc. all
 * reference teams(id) on delete cascade). Owner-only (both the
 * requireTeamRole check below and the team_delete RLS policy enforce
 * this independently), and gated on typing the team's exact name so this
 * can't be triggered by a stray click.
 *
 * Not logged via logAudit: audit_logs.team_id itself cascades away with
 * the team, so a pre-delete audit row would just vanish along with
 * everything else — console.error is the actually-durable record here
 * (server/Vercel logs, and Sentry if it's picking up console output).
 */
export async function deleteTeam(formData: FormData): Promise<ActionResult> {
  try {
    const parsed = deleteTeamSchema.safeParse({
      teamId: formData.get('teamId'),
      confirmName: formData.get('confirmName'),
    })
    if (!parsed.success) return { success: false, error: 'Invalid input' }

    const { teamId, confirmName } = parsed.data
    const { supabase, user } = await requireTeamRole(teamId, 'owner')

    const { data: team } = await supabase.from('teams').select('name').eq('id', teamId).single()
    if (!team) return { success: false, error: 'Team not found' }
    if (team.name !== confirmName) return { success: false, error: 'Team name does not match' }

    console.error('[account] team.deleted', { teamId, name: team.name, byUserId: user.id })

    const { error } = await supabase.from('teams').delete().eq('id', teamId)
    if (error) return { success: false, error: 'Failed to delete team' }

    revalidatePath('/')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e, 'Failed to delete team') }
  }
}

/**
 * Deletes the caller's entire account: every team they own is hard-deleted
 * (cascading all its data — see deleteTeam above), membership in any team
 * they don't own is just removed, then the auth.users row itself is
 * deleted via the Admin API — there is no client-callable self-delete in
 * Supabase Auth, only `auth.admin.deleteUser`, which requires the
 * service-role key.
 *
 * Order matters: teams/memberships are removed first, the auth user last.
 * If something fails partway through the team loop, the account still
 * exists and the failure is visible to the user to retry. If the account
 * delete itself failed *before* data cleanup, the account would survive
 * with all its data intact — arguably worse for a deletion request than
 * the reverse (account gone, teams already cleaned up) if the admin API
 * call is the one that fails.
 *
 * The caller is responsible for signing out and redirecting afterward
 * (see components/settings/account — mirrors the existing logout pattern
 * in components/layout/topbar.tsx) — a server action can't itself clear
 * the browser's session cookie.
 */
export async function deleteAccount(): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAuth()

    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', user.id)

    for (const m of memberships ?? []) {
      if (m.role === 'owner') {
        const { error } = await supabase.from('teams').delete().eq('id', m.team_id)
        if (error) return { success: false, error: 'Failed to delete owned team data. Nothing was deleted — try again.' }
      } else {
        const { error } = await supabase.from('team_members').delete().eq('team_id', m.team_id).eq('user_id', user.id)
        if (error) return { success: false, error: 'Failed to leave a team. Nothing was deleted — try again.' }
      }
    }

    console.error('[account] account.deleted', { userId: user.id, email: user.email })

    const adminDb = createServiceRoleClient()
    const { error } = await adminDb.auth.admin.deleteUser(user.id)
    if (error) {
      return {
        success: false,
        error: 'Team data was removed, but the account itself could not be deleted. Contact support.',
      }
    }

    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e, 'Failed to delete account') }
  }
}

export interface DataExportTeam {
  team: { id: string; name: string; slug: string; role: string }
  products: unknown[]
  alertRules: unknown[]
  notes: unknown[]
}

export interface DataExport {
  exportedAt: string
  user: { id: string; email: string | null }
  teams: DataExportTeam[]
}

/**
 * GDPR/KVKK data portability — everything visible to the caller across
 * every team they belong to. Deliberately never touches store_secrets,
 * api_keys, or connected_stores' credential columns — those are secrets
 * the platform holds on the team's behalf, not "your data" in the
 * portability sense, and exporting them would hand out live API keys.
 */
export async function exportMyData(): Promise<ActionResult<DataExport>> {
  try {
    const { supabase, user } = await requireAuth()

    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id, role, teams(id, name, slug)')
      .eq('user_id', user.id)

    const teams = await Promise.all(
      (memberships ?? []).map(async (m) => {
        const teamMeta = m.teams as unknown as { id: string; name: string; slug: string } | null
        const [{ data: products }, { data: alertRules }, { data: notes }] = await Promise.all([
          supabase
            .from('products')
            .select('id, title, sku, current_quantity, platform, created_at')
            .eq('team_id', m.team_id),
          supabase
            .from('alert_rules')
            .select('id, name, threshold_type, threshold_value, is_active, created_at')
            .eq('team_id', m.team_id),
          supabase.from('team_notes').select('id, title, content, created_at, updated_at').eq('team_id', m.team_id),
        ])
        return {
          team: { id: m.team_id, name: teamMeta?.name ?? '', slug: teamMeta?.slug ?? '', role: m.role },
          products: products ?? [],
          alertRules: alertRules ?? [],
          notes: notes ?? [],
        }
      }),
    )

    return {
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        user: { id: user.id, email: user.email ?? null },
        teams,
      },
    }
  } catch (e) {
    return { success: false, error: toClientError(e, 'Failed to export data') }
  }
}
