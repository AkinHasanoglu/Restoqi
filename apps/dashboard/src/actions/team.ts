'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAuth, requireTeamRole, type ActionResult } from '../lib/auth-guard'
import { createServerSupabaseClient } from '@stockalert/database/server'
import type { TeamRole } from '@stockalert/database/types'

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

    // Check if user is already a member
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .single()

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

    revalidatePath('/settings/team')
    return { success: true, data: { token } }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
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
    const { supabase } = await requireTeamRole(teamId, 'admin')

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

    revalidatePath('/settings/team')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
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
    const { supabase } = await requireTeamRole(teamId, 'admin')

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

    revalidatePath('/settings/team')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
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

    revalidatePath('/')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
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
      .select('id, team_id, email, role, expires_at, accepted_at')
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
    const { error: memberError } = await supabase.from('team_members').insert({
      team_id: invitation.team_id,
      user_id: user.id,
      role: invitation.role as TeamRole,
    })

    if (memberError) return { success: false, error: 'Failed to join team' }

    await supabase
      .from('team_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    return { success: true, data: { teamId: invitation.team_id } }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
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

    revalidatePath('/')
    return { success: true, data: { teamId: team.id } }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
