import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { listApiKeySummaries } from '@stockalert/database/api-keys'
import { ApiKeysForm } from '../../../../../components/settings/api-keys-form'

export const metadata: Metadata = { title: 'API Keys Settings' }

export default async function ApiKeysSettingsPage() {
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

  if (!membership) return <p className="text-sm text-muted-foreground">No team found.</p>

  const isAdmin = membership.role === 'owner' || membership.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-sm text-muted-foreground">Bring your own LLM key for AI-powered stock predictions</p>
      </div>

      {isAdmin ? (
        <ApiKeysForm teamId={membership.team_id} existingKeys={await listApiKeySummaries(supabase, membership.team_id)} />
      ) : (
        <p className="text-sm text-muted-foreground">Only team admins and owners can manage API keys.</p>
      )}
    </div>
  )
}
