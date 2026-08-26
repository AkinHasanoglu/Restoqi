'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceRoleClient } from '@stockalert/database/server'
import { logAudit } from '@stockalert/database/audit'
import { requireAuth, getPrimaryTeam, getSubscriptionLockError, type ActionResult } from '../lib/auth-guard'
import { toClientError } from '../lib/errors'

const NoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(10000),
})

async function requireEditor() {
  const { supabase, user } = await requireAuth()
  const membership = await getPrimaryTeam(supabase, user.id)
  if (!membership || !['admin', 'owner', 'editor'].includes(membership.role)) {
    throw new Error('Insufficient permissions')
  }
  return { supabase, user, membership }
}

export async function createNote(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user, membership } = await requireEditor()

    const lockError = await getSubscriptionLockError(supabase, membership.team_id)
    if (lockError) return { success: false, error: lockError }

    const parsed = NoteSchema.safeParse({ title: formData.get('title'), content: formData.get('content') })
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }

    const db = createServiceRoleClient()
    const { data: note, error } = await db.from('team_notes').insert({
      team_id: membership.team_id,
      created_by: user.id,
      title: parsed.data.title,
      content: parsed.data.content,
    }).select('id').single()

    if (error) return { success: false, error: 'Failed to create note' }

    await logAudit(supabase, {
      teamId: membership.team_id, userId: user.id, actorEmail: user.email ?? null,
      action: 'note.created', entityType: 'team_notes', entityId: note?.id, metadata: { title: parsed.data.title },
    })

    revalidatePath('/notes')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}

export async function updateNote(noteId: string, formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user, membership } = await requireEditor()

    const lockError = await getSubscriptionLockError(supabase, membership.team_id)
    if (lockError) return { success: false, error: lockError }

    const parsed = NoteSchema.safeParse({ title: formData.get('title'), content: formData.get('content') })
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }

    const db = createServiceRoleClient()
    const { error } = await db.from('team_notes')
      .update({
        title: parsed.data.title,
        content: parsed.data.content,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .eq('team_id', membership.team_id)

    if (error) return { success: false, error: 'Failed to update note' }

    await logAudit(supabase, {
      teamId: membership.team_id, userId: user.id, actorEmail: user.email ?? null,
      action: 'note.updated', entityType: 'team_notes', entityId: noteId,
    })

    revalidatePath('/notes')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}

export async function deleteNote(noteId: string): Promise<ActionResult> {
  try {
    const { supabase, user, membership } = await requireEditor()

    const lockError = await getSubscriptionLockError(supabase, membership.team_id)
    if (lockError) return { success: false, error: lockError }

    const db = createServiceRoleClient()
    const { error } = await db.from('team_notes').delete().eq('id', noteId).eq('team_id', membership.team_id)

    if (error) return { success: false, error: 'Failed to delete note' }

    await logAudit(supabase, {
      teamId: membership.team_id, userId: user.id, actorEmail: user.email ?? null,
      action: 'note.deleted', entityType: 'team_notes', entityId: noteId,
    })

    revalidatePath('/notes')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}
