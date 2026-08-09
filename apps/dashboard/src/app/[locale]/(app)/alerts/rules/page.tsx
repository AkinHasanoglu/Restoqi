import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { AlertRulesClient } from '../../../../../components/alerts/alert-rules-client'

export const metadata: Metadata = { title: 'Alert Rules' }

export default async function RulesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)
    .order('joined_at')
    .limit(1)
    .single()

  const teamId = membership?.team_id
  const canEdit = membership ? ['admin', 'owner', 'editor'].includes(membership.role) : false

  const [rulesResult, storesResult, channelsResult] = await Promise.all([
    teamId
      ? supabase.from('alert_rules').select('*').eq('team_id', teamId).order('created_at')
      : Promise.resolve({ data: [] }),
    teamId
      ? supabase.from('connected_stores').select('id, store_name, platform').eq('team_id', teamId).eq('status', 'active')
      : Promise.resolve({ data: [] }),
    teamId
      ? supabase.from('notification_channels').select('*').eq('team_id', teamId).eq('enabled', true)
      : Promise.resolve({ data: [] }),
  ])

  return (
    <AlertRulesClient
      rules={(rulesResult.data ?? []) as never[]}
      stores={storesResult.data ?? []}
      channels={channelsResult.data ?? []}
      canEdit={canEdit}
    />
  )
}
