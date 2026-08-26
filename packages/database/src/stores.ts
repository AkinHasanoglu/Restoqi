import type { createServiceRoleClient } from './server'
import type { Database } from './types/database.types'
import { encryptJSON, decryptJSON, generateRowId } from './crypto'
import type { Credentials } from '@stockalert/integrations-core'
import { CredentialsSchema } from '@stockalert/integrations-core'

type Db = ReturnType<typeof createServiceRoleClient>
type PlatformType = Database['public']['Enums']['platform_type']

// Every read/write of connected_stores.encrypted_creds must go through
// this module — nowhere else may touch that column directly (enforce with
// an ESLint no-restricted-syntax rule banning the literal 'encrypted_creds'
// outside this file; see Faz 15).
function storeAad(storeId: string): string {
  return `connected_stores:${storeId}`
}

export interface SaveStoreCredentialsParams {
  teamId: string
  platform: PlatformType
  storeName: string
  externalStoreId: string
  creds: Credentials
}

/**
 * Generates the row id client-side (rather than relying on the DB
 * default) so it's available to bind the AAD before the row exists —
 * this also makes the insert safely retryable on failure.
 *
 * Two inserts, not one: encrypted_creds/webhook_secret live in
 * store_secrets (RLS-enabled, zero policies — service-role only; see the
 * 20260819000000_security_hardening migration) so no client-side role can
 * ever SELECT them, unlike the rest of connected_stores which viewers can
 * read. connected_stores must exist first for store_secrets' FK; if the
 * second insert fails, the orphaned connected_stores row is cleaned up so
 * a caller can safely retry.
 */
export async function saveStoreCredentials(db: Db, params: SaveStoreCredentialsParams): Promise<string> {
  const id = generateRowId()
  const encryptedCreds = encryptJSON(params.creds, storeAad(id))

  const { error: storeError } = await db.from('connected_stores').insert({
    id,
    team_id: params.teamId,
    platform: params.platform,
    store_name: params.storeName,
    external_store_id: params.externalStoreId,
    is_active: true,
  })

  if (storeError) throw new Error(`Failed to save store: ${storeError.message}`)

  const { error: secretsError } = await db.from('store_secrets').insert({
    store_id: id,
    encrypted_creds: encryptedCreds,
  })

  if (secretsError) {
    await db.from('connected_stores').delete().eq('id', id)
    throw new Error(`Failed to save store credentials: ${secretsError.message}`)
  }

  return id
}

export async function loadStoreCredentials(db: Db, storeId: string): Promise<Credentials> {
  const { data, error } = await db
    .from('store_secrets')
    .select('encrypted_creds')
    .eq('store_id', storeId)
    .single()

  if (error || !data?.encrypted_creds) {
    throw new Error(`No stored credentials for store ${storeId}`)
  }

  return decryptJSON(data.encrypted_creds, storeAad(storeId), CredentialsSchema)
}

/** Used after a connector's refreshCredentials() call so refreshed OAuth tokens persist. */
export async function updateStoreCredentials(db: Db, storeId: string, creds: Credentials): Promise<void> {
  const encryptedCreds = encryptJSON(creds, storeAad(storeId))

  const { error } = await db
    .from('store_secrets')
    .update({ encrypted_creds: encryptedCreds })
    .eq('store_id', storeId)

  if (error) throw new Error(`Failed to update store credentials: ${error.message}`)
}
