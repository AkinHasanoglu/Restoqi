import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { AccountDangerZone } from '../../../../../components/settings/account-danger-zone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@stockalert/ui'

export const metadata: Metadata = { title: 'Account Settings' }

// Relative hrefs (no leading slash) resolve against this page's own path —
// see overview/page.tsx's identical "settings/team" pattern — so this
// works without knowing the current locale. The sidebar's Settings icon
// links straight to /settings/account (components/layout/sidebar.tsx),
// making this page the de facto settings landing page; there's no shared
// settings layout/tabs component yet, so this is the only way to reach
// the other settings pages from here today.
const SETTINGS_LINKS = [
  { href: 'team', label: 'Team' },
  { href: 'billing', label: 'Billing' },
  { href: 'api-keys', label: 'API Keys' },
  { href: 'audit', label: 'Audit Log' },
]

export default async function AccountSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const { data: team } = membership
    ? await supabase.from('teams').select('id, name').eq('id', membership.team_id).single()
    : { data: null }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-sm text-muted-foreground">Manage your account and personal data</p>
      </div>

      <nav className="flex flex-wrap gap-4 border-b pb-3 text-sm">
        <span className="font-medium text-foreground">Account</span>
        {SETTINGS_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4">
            {l.label}
          </Link>
        ))}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To change your password, use the &quot;Forgot password&quot; link on the login page.
          </p>
        </CardContent>
      </Card>

      {team && membership && (
        <AccountDangerZone
          teamId={team.id}
          teamName={team.name}
          isOwner={membership.role === 'owner'}
        />
      )}
    </div>
  )
}
