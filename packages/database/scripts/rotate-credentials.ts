/**
 * Re-encrypts every store_secrets.encrypted_creds and api_keys.encrypted_key
 * row under the current SUPABASE_ENCRYPTION_KEY.
 *
 * Rotation runbook:
 *   1. Generate a new key: openssl rand -base64 32
 *   2. Set it as SUPABASE_ENCRYPTION_KEY_PREVIOUS=<old key>,<any older keys>
 *      and SUPABASE_ENCRYPTION_KEY=<new key> in the deployment env.
 *   3. Deploy (so decrypt() can read both old and new ciphertexts).
 *   4. Run: pnpm --filter @stockalert/database rotate-credentials
 *   5. Verify the summary below reports 0 rows still on an old keyId.
 *   6. Remove the old key from SUPABASE_ENCRYPTION_KEY_PREVIOUS and redeploy.
 *
 * Idempotent: rows already encrypted under the current key are skipped, so
 * this is safe to re-run (e.g. after a partial failure).
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_ENCRYPTION_KEY, and (for old rows) SUPABASE_ENCRYPTION_KEY_PREVIOUS.
 */
import { createClient } from '@supabase/supabase-js'
import { decrypt, encrypt, getKeyring } from '../src/crypto'
import type { Database } from '../src/types/database.types'

const BATCH_SIZE = 100

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

async function rotateConnectedStores(db: ReturnType<typeof createClient<Database>>, currentKeyId: string) {
  let migrated = 0
  let skipped = 0
  let failed = 0

  // AAD is `connected_stores:<store_id>` — store_secrets.store_id IS that
  // id (it's the FK/PK), even though the ciphertext itself now lives in
  // store_secrets rather than connected_stores. See stores.ts's storeAad().
  const { data: rows, error } = await db
    .from('store_secrets')
    .select('store_id, encrypted_creds')
    .not('encrypted_creds', 'is', null)
  if (error) throw new Error(`Failed to list store_secrets: ${error.message}`)

  for (let i = 0; i < (rows ?? []).length; i += BATCH_SIZE) {
    const batch = (rows ?? []).slice(i, i + BATCH_SIZE)
    for (const row of batch) {
      const payload = row.encrypted_creds
      if (!payload) continue

      const keyId = payload.split('.')[1]
      if (keyId === currentKeyId) {
        skipped++
        continue
      }

      try {
        const aad = `connected_stores:${row.store_id}`
        const plaintext = decrypt(payload, aad)
        const reencrypted = encrypt(plaintext, aad)
        const { error: updateError } = await db
          .from('store_secrets')
          .update({ encrypted_creds: reencrypted })
          .eq('store_id', row.store_id)
        if (updateError) throw new Error(updateError.message)
        migrated++
      } catch (err) {
        failed++
        console.error(`[rotate] store_secrets ${row.store_id} failed:`, err)
      }
    }
  }

  return { table: 'store_secrets', migrated, skipped, failed }
}

async function rotateApiKeys(db: ReturnType<typeof createClient<Database>>, currentKeyId: string) {
  let migrated = 0
  let skipped = 0
  let failed = 0

  // AAD is `api_keys:<team_id>:<provider>`, not `api_keys:<id>` — see
  // src/api-keys.ts: unlike connected_stores, this table has a natural
  // stable key (unique(team_id, provider)) that saveApiKey's upsert binds
  // to directly, so both columns are needed here to reconstruct it.
  const { data: rows, error } = await db.from('api_keys').select('id, team_id, provider, encrypted_key')
  if (error) throw new Error(`Failed to list api_keys: ${error.message}`)

  for (const row of rows ?? []) {
    const keyId = row.encrypted_key.split('.')[1]
    if (keyId === currentKeyId) {
      skipped++
      continue
    }

    try {
      const aad = `api_keys:${row.team_id}:${row.provider}`
      const plaintext = decrypt(row.encrypted_key, aad)
      const reencrypted = encrypt(plaintext, aad)
      const { error: updateError } = await db
        .from('api_keys')
        .update({ encrypted_key: reencrypted })
        .eq('id', row.id)
      if (updateError) throw new Error(updateError.message)
      migrated++
    } catch (err) {
      failed++
      console.error(`[rotate] api_keys ${row.id} failed:`, err)
    }
  }

  return { table: 'api_keys', migrated, skipped, failed }
}

async function main() {
  const { current } = getKeyring()
  const db = createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  )

  console.log(`[rotate] Re-encrypting rows not already on current keyId "${current.id}"...`)
  const results = await Promise.all([
    rotateConnectedStores(db, current.id),
    rotateApiKeys(db, current.id),
  ])

  for (const r of results) {
    console.log(`[rotate] ${r.table}: migrated=${r.migrated} already-current=${r.skipped} failed=${r.failed}`)
  }

  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
  if (totalFailed > 0) {
    console.error(`[rotate] ${totalFailed} row(s) failed to re-encrypt — do NOT remove the old key yet.`)
    process.exit(1)
  }
  console.log('[rotate] Done. Safe to remove the old key from SUPABASE_ENCRYPTION_KEY_PREVIOUS once verified.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
