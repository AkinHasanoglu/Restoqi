'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceRoleClient } from '@stockalert/database/server'
import { requireAuth } from '../lib/auth-guard'

const NoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(10000),
})

async function getEditorMembership(userId: string) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId)
    .order('joined_at')
    .limit(1)
    .single()
  if (!data || !['admin', 'owner', 'editor'].includes(data.role)) return null
  return data
}

export async function createNote(formData: FormData) {
  const user = await requireAuth()
  const membership = await getEditorMembership(user.id)
  if (!membership) return { error: 'Insufficient permissions' }

  const parsed = NoteSchema.safeParse({ title: formData.get('title'), content: formData.get('content') })
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const db = createServiceRoleClient()
  const { error } = await db.from('team_notes').insert({
    team_id: membership.team_id,
    author_id: user.id,
    title: parsed.data.title,
    content: parsed.data.content,
  })

  if (error) return { error: 'Failed to create note' }
  revalidatePath('/notes')
  return { success: true }
}

export async function updateNote(noteId: string, formData: FormData) {
  const user = await requireAuth()
  const membership = await getEditorMembership(user.id)
  if (!membership) return { error: 'Insufficient permissions' }

  const parsed = NoteSchema.safeParse({ title: formData.get('title'), content: formData.get('content') })
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const db = createServiceRoleClient()
  const { error } = await db.from('team_notes')
    .update({ title: parsed.data.title, content: parsed.data.content, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('team_id', membership.team_id)

  if (error) return { error: 'Failed to update note' }
  revalidatePath('/notes')
  return { success: true }
}

export async function deleteNote(noteId: string) {
  const user = await requireAuth()
  const membership = await getEditorMembership(user.id)
  if (!membership) return { error: 'Insufficient permissions' }

  const db = createServiceRoleClient()
  const { error } = await db.from('team_notes').delete().eq('id', noteId).eq('team_id', membership.team_id)

  if (error) return { error: 'Failed to delete note' }
  revalidatePath('/notes')
  return { success: true }
}
