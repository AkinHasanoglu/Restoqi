import type { createServiceRoleClient } from './server'
import type { createServerSupabaseClient } from './server'
import { encrypt, decrypt } from './crypto'
import type { Database } from './types/database.types'

type Db = ReturnType<typeof createServiceRoleClient> | Awaited<ReturnType<typeof createServerSupabaseClient>>

// 'statistical' is a valid ai_predictions.provider value (no key needed —
// it's the built-in fallback) but never a valid api_keys.provider; a team
// can't "bring their own key" for a provider that doesn't call out anywhere.
export type AiKeyProvider = Exclude<Database['public']['Enums']['ai_provider'], 'statistical'>

// Every read/write of api_keys.encrypted_key must go through this module —
// nowhere else may touch that column directly (same convention as
// stores.ts for store_secrets.encrypted_creds; both enforced by the
// no-restricted-syntax ESLint rule banning the literal column name
// outside its owning module — see Faz 15).
function apiKeyAad(teamId: string, provider: AiKeyProvider): string {
  return `api_keys:${teamId}:${provider}`
}

export interface SaveApiKeyParams {
  teamId: string
  provider: AiKeyProvider
  apiKey: string
}

/**
 * Upserts on (team_id, provider) — a team has at most one key per
 * provider (unique constraint from the initial migration). The AAD is
 * derived from (team_id, provider) rather than a fresh per-call row id —
 * unlike connected_stores (Faz 6), where a fresh id is generated before
 * insert specifically to be idempotent-retryable, this table already has
 * a natural stable key to bind ciphertext to, and deriving from it means
 * a re-saved key doesn't need a pre-fetch of its own previous id.
 */
export async function saveApiKey(db: Db, params: SaveApiKeyParams): Promise<void> {
  const encryptedKey = encrypt(params.apiKey, apiKeyAad(params.teamId, params.provider))

  const { error } = await db.from('api_keys').upsert(
    { team_id: params.teamId, provider: params.provider, encrypted_key: encryptedKey, is_active: true },
    { onConflict: 'team_id,provider' }
  )
  if (error) throw new Error(`Failed to save API key: ${error.message}`)
}

/** Returns the decrypted key, or null if the team has none configured for this provider. */
export async function loadApiKey(db: Db, teamId: string, provider: AiKeyProvider): Promise<string | null> {
  const { data } = await db
    .from('api_keys')
    .select('encrypted_key')
    .eq('team_id', teamId)
    .eq('provider', provider)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return null
  return decrypt(data.encrypted_key, apiKeyAad(teamId, provider))
}

export interface ApiKeySummary {
  provider: AiKeyProvider
  last4: string
  updatedAt: string
}

/** Never returns the decrypted key in full — only enough to render "•••• 1234" in the settings UI. */
export async function listApiKeySummaries(db: Db, teamId: string): Promise<ApiKeySummary[]> {
  const { data } = await db
    .from('api_keys')
    .select('provider, encrypted_key, updated_at')
    .eq('team_id', teamId)
    .eq('is_active', true)

  return (data ?? []).map((row) => {
    const provider = row.provider as AiKeyProvider
    let last4 = '····'
    try {
      last4 = decrypt(row.encrypted_key, apiKeyAad(teamId, provider)).slice(-4)
    } catch {
      // Leaves the placeholder — a corrupt/unrotated ciphertext shouldn't
      // break the whole settings page.
    }
    return { provider, last4, updatedAt: row.updated_at }
  })
}

export async function deleteApiKey(db: Db, teamId: string, provider: AiKeyProvider): Promise<void> {
  const { error } = await db.from('api_keys').delete().eq('team_id', teamId).eq('provider', provider)
  if (error) throw new Error(`Failed to delete API key: ${error.message}`)
}
