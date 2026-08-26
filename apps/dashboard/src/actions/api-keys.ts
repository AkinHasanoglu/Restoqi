'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTeamRole, type ActionResult } from '../lib/auth-guard'
import { createServiceRoleClient } from '@stockalert/database/server'
import { saveApiKey, deleteApiKey, type AiKeyProvider } from '@stockalert/database/api-keys'
import { logAudit } from '@stockalert/database/audit'
import { toClientError } from '../lib/errors'

// Bring-your-own-key: a team's own Anthropic/OpenAI key, preferred over
// the platform's own key for that team's ai_predictions runs (see
// api/worker/predict/route.ts's fetchApiKeys). Admin-gated to match the
// api_keys table's RLS policies (api_keys_select/api_keys_modify both
// require has_team_role(team_id, 'admin')) — a viewer/editor being able
// to plant a key that gets billed to their own account isn't a role
// StockAlert's RBAC otherwise trusts with billing-adjacent actions.
const saveApiKeySchema = z.object({
  teamId: z.string().uuid(),
  provider: z.enum(['anthropic', 'openai']),
  apiKey: z.string().min(20, 'That doesn\'t look like a valid API key'),
})

export async function saveApiKeyAction(formData: FormData): Promise<ActionResult> {
  try {
    const parsed = saveApiKeySchema.safeParse({
      teamId: formData.get('teamId'),
      provider: formData.get('provider'),
      apiKey: formData.get('apiKey'),
    })
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }

    const { teamId, provider, apiKey } = parsed.data
    const { supabase, user } = await requireTeamRole(teamId, 'admin')

    const db = createServiceRoleClient()
    await saveApiKey(db, { teamId, provider: provider as AiKeyProvider, apiKey })

    // Never log the key itself — only that a key for this provider changed.
    await logAudit(supabase, {
      teamId, userId: user.id, actorEmail: user.email ?? null,
      action: 'api_key.updated', entityType: 'api_keys', metadata: { provider },
    })

    revalidatePath('/settings/api-keys')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e, 'Failed to save API key') }
  }
}

const deleteApiKeySchema = z.object({
  teamId: z.string().uuid(),
  provider: z.enum(['anthropic', 'openai']),
})

export async function deleteApiKeyAction(formData: FormData): Promise<ActionResult> {
  try {
    const parsed = deleteApiKeySchema.safeParse({
      teamId: formData.get('teamId'),
      provider: formData.get('provider'),
    })
    if (!parsed.success) return { success: false, error: 'Invalid input' }

    const { teamId, provider } = parsed.data
    const { supabase, user } = await requireTeamRole(teamId, 'admin')

    const db = createServiceRoleClient()
    await deleteApiKey(db, teamId, provider as AiKeyProvider)

    await logAudit(supabase, {
      teamId, userId: user.id, actorEmail: user.email ?? null,
      action: 'api_key.updated', entityType: 'api_keys', metadata: { provider, deleted: true },
    })

    revalidatePath('/settings/api-keys')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e, 'Failed to delete API key') }
  }
}
