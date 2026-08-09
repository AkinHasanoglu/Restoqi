import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { NotesClient } from '../../../../components/notes/notes-client'

export const metadata: Metadata = { title: 'Notes' }

export default async function NotesPage() {
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

  const { data: notes } = teamId
    ? await supabase
        .from('team_notes')
        .select('id, title, content, created_at, updated_at')
        .eq('team_id', teamId)
        .order('updated_at', { ascending: false })
    : { data: [] }

  return (
    <NotesClient
      notes={notes ?? []}
      teamId={teamId ?? ''}
      canEdit={canEdit}
    />
  )
}
