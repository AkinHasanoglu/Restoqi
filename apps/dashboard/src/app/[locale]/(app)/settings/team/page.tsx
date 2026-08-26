import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { TeamMembersTable } from '../../../../../components/settings/team-members-table'
import { InviteMemberForm } from '../../../../../components/settings/invite-member-form'
import { TeamLocaleForm } from '../../../../../components/settings/team-locale-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@stockalert/ui'
import type { Locale } from '@stockalert/i18n'

export const metadata: Metadata = { title: 'Team Settings' }

export default async function TeamSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) return <p className="text-sm text-muted-foreground">No team found.</p>

  const teamId = membership.team_id

  const [teamResult, membersResult, invitesResult] = await Promise.all([
    supabase.from('teams').select('name, slug, plan, locale').eq('id', teamId).single(),
    supabase.from('team_members').select('id, role, user_id, joined_at').eq('team_id', teamId).order('joined_at'),
    supabase.from('team_invitations').select('id, email, role, expires_at, created_at')
      .eq('team_id', teamId).is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ])

  const team = teamResult.data
  const members = membersResult.data ?? []
  const pendingInvites = invitesResult.data ?? []
  const isAdmin = membership.role === 'owner' || membership.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground">Manage your team members and invitations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{team?.name ?? 'Team'}</CardTitle>
          <CardDescription>
            Slug: <code className="text-xs">{team?.slug}</code> · Plan:{' '}
            <span className="capitalize">{team?.plan}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      <TeamMembersTable
        members={members}
        currentUserId={user.id}
        currentUserRole={membership.role as 'owner' | 'admin' | 'editor' | 'viewer'}
        teamId={teamId}
        pendingInvites={pendingInvites}
      />

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Member</CardTitle>
            <CardDescription>Send an invitation to add a new team member</CardDescription>
          </CardHeader>
          <CardContent>
            <InviteMemberForm teamId={teamId} />
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Notification language</CardTitle>
            <CardDescription>
              The language low-stock, billing, and digest emails are sent in for this team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamLocaleForm teamId={teamId} currentLocale={(team?.locale ?? 'tr') as Locale} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
