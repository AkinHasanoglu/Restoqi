'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAuth, requireTeamRole, getSubscriptionLockError, SUBSCRIPTION_LOCKED_MESSAGE, type ActionResult } from '../lib/auth-guard'
import { createServerSupabaseClient, createServiceRoleClient } from '@stockalert/database/server'
import { logAudit } from '@stockalert/database/audit'
import type { TeamRole } from '@stockalert/database'
import { locales } from '@stockalert/i18n'
import { sendInviteAcceptedEmail } from '@stockalert/notifications'
import { PLAN_LIMITS, checkLimit, refreshUsageMetrics, getPlanContext, enforceSeatQuotaAfterInsert } from '../lib/plan-limits'
import { toClientError } from '../lib/errors'

const inviteSchema = z.object({
  teamId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']),
})

export async function inviteMember(formData: FormData): Promise<ActionResult<{ token: string }>> {
  try {
    const parsed = inviteSchema.safeParse({
      teamId: formData.get('teamId'),
      email: formData.get('email'),
      role: formData.get('role'),
    })
    if (!parsed.success) return { success: false, error: 'Invalid input' }

    const { teamId, email, role } = parsed.data
    const { supabase, user } = await requireTeamRole(teamId, 'admin')

    // Check if invite already exists for this email
    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('team_id', teamId)
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) return { success: false, error: 'Invitation already sent to this email' }

    const ctx = await getPlanContext(supabase, teamId)
    if (!ctx.isAccessAllowed) return { success: false, error: SUBSCRIPTION_LOCKED_MESSAGE }
    const seatError = checkLimit(ctx.usage.members_count, PLAN_LIMITS[ctx.effectivePlan].seats, ctx.effectivePlan, 'seats')
    if (seatError) return { success: false, error: seatError }

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase.from('team_invitations').insert({
      team_id: teamId,
      email,
      role: role as TeamRole,
      token,
      invited_by: user.id,
      expires_at: expiresAt,
    })

    if (error) return { success: false, error: 'Failed to create invitation' }

    await logAudit(supabase, {
      teamId, userId: user.id, actorEmail: user.email ?? null,
      action: 'member.invited', entityType: 'team_invitations', metadata: { email, role },
    })

    revalidatePath('/settings/team')
    return { success: true, data: { token } }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}

const changeRoleSchema = z.object({
  teamId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: z.enum(['admin', 'editor', 'viewer']),
})

export async function changeRole(formData: FormData): Promise<ActionResult> {
  try {
    const parsed = changeRoleSchema.safeParse({
      teamId: formData.get('teamId'),
      memberId: formData.get('memberId'),
      role: formData.get('role'),
    })
    if (!parsed.success) return { success: false, error: 'Invalid input' }

    const { teamId, memberId, role } = parsed.data
    const { supabase, user } = await requireTeamRole(teamId, 'admin')

    const lockError = await getSubscriptionLockError(supabase, teamId)
    if (lockError) return { success: false, error: lockError }

    // Cannot change owner's role
    const { data: target } = await supabase
      .from('team_members')
      .select('role')
      .eq('id', memberId)
      .eq('team_id', teamId)
      .single()

    if (!target) return { success: false, error: 'Member not found' }
    if (target.role === 'owner') return { success: false, error: 'Cannot change owner role' }

    const { error } = await supabase
      .from('team_members')
      .update({ role: role as TeamRole })
      .eq('id', memberId)
      .eq('team_id', teamId)

    if (error) return { success: false, error: 'Failed to update role' }

    await logAudit(supabase, {
      teamId, userId: user.id, actorEmail: user.email ?? null,
      action: 'member.role_changed', entityType: 'team_members', entityId: memberId,
      metadata: { fromRole: target.role, toRole: role },
    })

    revalidatePath('/settings/team')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}

const removeMemberSchema = z.object({
  teamId: z.string().uuid(),
  memberId: z.string().uuid(),
})

export async function removeMember(formData: FormData): Promise<ActionResult> {
  try {
    const parsed = removeMemberSchema.safeParse({
      teamId: formData.get('teamId'),
      memberId: formData.get('memberId'),
    })
    if (!parsed.success) return { success: false, error: 'Invalid input' }

    const { teamId, memberId } = parsed.data
    const { supabase, user } = await requireTeamRole(teamId, 'admin')

    const { data: target } = await supabase
      .from('team_members')
      .select('role')
      .eq('id', memberId)
      .eq('team_id', teamId)
      .single()

    if (!target) return { success: false, error: 'Member not found' }
    if (target.role === 'owner') return { success: false, error: 'Cannot remove team owner' }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)
      .eq('team_id', teamId)

    if (error) return { success: false, error: 'Failed to remove member' }

    await logAudit(supabase, {
      teamId, userId: user.id, actorEmail: user.email ?? null,
      action: 'member.removed', entityType: 'team_members', entityId: memberId,
    })
    await refreshUsageMetrics(supabase, teamId)

    revalidatePath('/settings/team')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}

export async function leaveTeam(teamId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAuth()

    const { data: membership } = await supabase
      .from('team_members')
      .select('id, role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) return { success: false, error: 'Not a member of this team' }
    if (membership.role === 'owner') return { success: false, error: 'Owner cannot leave. Transfer ownership first.' }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', membership.id)

    if (error) return { success: false, error: 'Failed to leave team' }

    await logAudit(supabase, {
      teamId, userId: user.id, actorEmail: user.email ?? null,
      action: 'member.removed', entityType: 'team_members', entityId: membership.id,
      metadata: { selfLeave: true },
    })
    await refreshUsageMetrics(supabase, teamId)

    revalidatePath('/')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}

const acceptInviteSchema = z.object({
  token: z.string().uuid(),
})

export async function acceptInvite(token: string): Promise<ActionResult<{ teamId: string }>> {
  try {
    const parsed = acceptInviteSchema.safeParse({ token })
    if (!parsed.success) return { success: false, error: 'Invalid token' }

    const { supabase, user } = await requireAuth()

    const { data: invitation } = await supabase
      .from('team_invitations')
      .select('id, team_id, email, role, expires_at, accepted_at, invited_by')
      .eq('token', token)
      .single()

    if (!invitation) return { success: false, error: 'Invalid or expired invitation' }
    if (invitation.accepted_at) return { success: false, error: 'Invitation already accepted' }
    if (new Date(invitation.expires_at) < new Date()) return { success: false, error: 'Invitation has expired' }
    if (invitation.email !== user.email) return { success: false, error: 'This invitation was sent to a different email address' }

    // Check not already a member
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', invitation.team_id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      await supabase
        .from('team_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)
      return { success: true, data: { teamId: invitation.team_id } }
    }

    // Add to team
    const { data: newMember, error: memberError } = await supabase.from('team_members').insert({
      team_id: invitation.team_id,
      user_id: user.id,
      role: invitation.role as TeamRole,
    }).select('id').single()

    if (memberError || !newMember) return { success: false, error: 'Failed to join team' }

    // Backstop for a check-then-act race: inviteMember's seat check only
    // bounds how many invitations can be sent against the team's *current*
    // member count — it can't see other outstanding invitations, so several
    // invitees accepting at once can each pass a check that was only ever
    // valid for one of them. Evicts *this* membership (not the invitation
    // itself) if it lands past the seat limit, so the invite can still be
    // retried once a seat frees up. See 3rd security audit item 58.
    const seatQuotaError = await enforceSeatQuotaAfterInsert(supabase, invitation.team_id, newMember.id)
    if (seatQuotaError) return { success: false, error: seatQuotaError }

    await supabase
      .from('team_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    await logAudit(supabase, {
      teamId: invitation.team_id, userId: user.id, actorEmail: user.email ?? null,
      action: 'member.joined', entityType: 'team_members', metadata: { role: invitation.role },
    })
    await refreshUsageMetrics(supabase, invitation.team_id)

    // Best-effort — notifies whoever sent the invite. Uses the service-role
    // client only for the GoTrue admin lookup (the inviter's email isn't
    // otherwise reachable from the invitee's own RLS-scoped session), and
    // must never fail the join itself.
    try {
      const adminDb = createServiceRoleClient()
      const [{ data: inviter }, { data: team }] = await Promise.all([
        adminDb.auth.admin.getUserById(invitation.invited_by),
        supabase.from('teams').select('name, locale').eq('id', invitation.team_id).single(),
      ])
      if (inviter.user?.email) {
        await sendInviteAcceptedEmail({
          toEmail: inviter.user.email,
          locale: team?.locale ?? 'tr',
          memberName: user.user_metadata?.['full_name'] ?? user.email ?? 'A teammate',
          memberEmail: user.email ?? '',
          teamName: team?.name ?? 'StockAlert',
          teamUrl: `${process.env['NEXT_PUBLIC_APP_URL'] ?? ''}/settings/team`,
        })
      }
    } catch (err) {
      console.error('[team] invite-accepted email send failed', err)
    }

    return { success: true, data: { teamId: invitation.team_id } }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}

const createTeamSchema = z.object({
  name: z.string().min(2).max(64),
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
})

export async function createTeam(formData: FormData): Promise<ActionResult<{ teamId: string }>> {
  try {
    const parsed = createTeamSchema.safeParse({
      name: formData.get('name'),
      slug: formData.get('slug'),
    })
    if (!parsed.success) return { success: false, error: 'Invalid input: ' + parsed.error.issues[0]?.message }

    const { name, slug } = parsed.data
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('teams')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) return { success: false, error: 'Slug already taken' }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ name, slug })
      .select('id')
      .single()

    if (teamError || !team) return { success: false, error: 'Failed to create team' }

    const { error: memberError } = await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: user.id,
      role: 'owner',
    })

    if (memberError) return { success: false, error: 'Failed to set up team membership' }

    await logAudit(supabase, {
      teamId: team.id, userId: user.id, actorEmail: user.email ?? null,
      action: 'team.created', entityType: 'teams', entityId: team.id, metadata: { name, slug },
    })

    revalidatePath('/')
    return { success: true, data: { teamId: team.id } }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}

const updateTeamLocaleSchema = z.object({
  teamId: z.string().uuid(),
  locale: z.enum(locales),
})

/**
 * Drives which packages/i18n/locales/<locale>/emails.json dictionary
 * outbound alert/transactional emails render with (see AlertPayload.locale
 * in @stockalert/notifications and its use in the sync worker's
 * runRulesEngine). Distinct from the dashboard UI's own locale, which is
 * per-user via the URL segment, not per-team.
 */
export async function updateTeamLocale(formData: FormData): Promise<ActionResult> {
  try {
    const parsed = updateTeamLocaleSchema.safeParse({
      teamId: formData.get('teamId'),
      locale: formData.get('locale'),
    })
    if (!parsed.success) return { success: false, error: 'Invalid input' }

    const { teamId, locale } = parsed.data
    const { supabase, user } = await requireTeamRole(teamId, 'admin')

    const { error } = await supabase.from('teams').update({ locale }).eq('id', teamId)
    if (error) return { success: false, error: 'Failed to update team language' }

    await logAudit(supabase, {
      teamId, userId: user.id, actorEmail: user.email ?? null,
      action: 'team.updated', entityType: 'teams', entityId: teamId, metadata: { locale },
    })

    revalidatePath('/settings/team')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}
