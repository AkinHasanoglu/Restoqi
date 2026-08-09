import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { IntegrationsClient } from '../../../../components/integrations/integrations-client'

export const metadata: Metadata = { title: 'Integrations' }

export default async function IntegrationsPage() {
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
  const canManage = membership ? ['admin', 'owner'].includes(membership.role) : false

  const { data: stores } = teamId
    ? await supabase
        .from('connected_stores')
        .select('id, platform, store_name, status, created_at')
        .eq('team_id', teamId)
        .neq('status', 'disconnected')
        .order('created_at')
    : { data: [] }

  // Count products per store
  const storeIds = (stores ?? []).map((s) => s.id)
  const { data: productCounts } = storeIds.length
    ? await supabase
        .from('products')
        .select('store_id')
        .in('store_id', storeIds)
    : { data: [] }

  const countMap: Record<string, number> = {}
  for (const p of productCounts ?? []) {
    countMap[p.store_id] = (countMap[p.store_id] ?? 0) + 1
  }

  const storeRows = (stores ?? []).map((s) => ({
    ...s,
    product_count: countMap[s.id] ?? 0,
  }))

  return (
    <IntegrationsClient stores={storeRows} canManage={canManage} />
  )
}
