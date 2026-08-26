import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { AppShell } from '../../../components/layout/app-shell'
import { getPlanContext } from '../../../lib/plan-limits'

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const userName = user.user_metadata?.['full_name'] as string | undefined
  const userEmail = user.email

  // Fetch user's teams for workspace switcher
  const { data: memberships } = await supabase
    .from('team_members')
    .select('team_id, role, teams(id, name, slug)')
    .eq('user_id', user.id)
    .order('joined_at')

  const teams = (memberships ?? []).flatMap((m) => {
    const t = m.teams as { id: string; name: string; slug: string } | null
    return t ? [t] : []
  })

  const currentTeamId = teams[0]?.id

  // Read-only lock + trial banner both key off the same resolved plan
  // context (reverse-trial aware — see resolveEffectivePlan in
  // @stockalert/plans) so every page under this layout gets the same
  // answer, not just settings/billing.
  const planContext = currentTeamId ? await getPlanContext(supabase, currentTeamId) : null

  return (
    <AppShell
      userEmail={userEmail}
      userName={userName}
      teams={teams}
      currentTeamId={currentTeamId}
      isTrialActive={planContext?.isTrialActive ?? false}
      trialDaysLeft={planContext?.trialDaysLeft ?? null}
      isAccessAllowed={planContext?.isAccessAllowed ?? true}
    >
      {children}
    </AppShell>
  )
}
