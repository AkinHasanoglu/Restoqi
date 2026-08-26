import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { saveApiKey, loadApiKey, listApiKeySummaries, deleteApiKey } from './api-keys'
import { __resetKeyringCacheForTests, isEncrypted } from './crypto'

const KEY = Buffer.alloc(32, 7).toString('base64')
const originalEnv = { ...process.env }

beforeEach(() => {
  process.env['SUPABASE_ENCRYPTION_KEY'] = KEY
  process.env['NODE_ENV'] = 'test'
  __resetKeyringCacheForTests()
})

afterEach(() => {
  process.env = { ...originalEnv }
  __resetKeyringCacheForTests()
})

// Minimal fake standing in for the Supabase query builder's `.from('api_keys')`
// chain — just enough of the surface api-keys.ts actually calls
// (select/eq/maybeSingle/upsert/delete) against an in-memory row array, not
// a full PostgREST simulation.
interface ApiKeyRow {
  id: string
  team_id: string
  provider: string
  encrypted_key: string
  is_active: boolean
  updated_at: string
}

function makeFakeDb(initialRows: ApiKeyRow[] = []) {
  const rows: ApiKeyRow[] = [...initialRows]

  function table() {
    let filters: Array<[string, unknown]> = []
    let mode: 'select' | 'delete' = 'select'

    const builder = {
      select() {
        mode = 'select'
        return builder
      },
      eq(key: string, value: unknown) {
        filters = [...filters, [key, value]]
        return builder
      },
      delete() {
        mode = 'delete'
        return builder
      },
      async maybeSingle() {
        const matches = rows.filter((r) => filters.every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v))
        return { data: matches[0] ?? null, error: null }
      },
      async upsert(row: Omit<ApiKeyRow, 'id' | 'is_active' | 'updated_at'> & { is_active: boolean }) {
        const existingIdx = rows.findIndex((r) => r.team_id === row.team_id && r.provider === row.provider)
        const saved: ApiKeyRow = {
          id: existingIdx >= 0 ? rows[existingIdx]!.id : `row-${String(rows.length + 1)}`,
          team_id: row.team_id,
          provider: row.provider,
          encrypted_key: row.encrypted_key,
          is_active: row.is_active,
          updated_at: new Date().toISOString(),
        }
        if (existingIdx >= 0) rows[existingIdx] = saved
        else rows.push(saved)
        return { error: null }
      },
      // Awaiting the builder directly (no maybeSingle/single) resolves
      // with every matching row — mirrors real supabase-js's thenable
      // query builders.
      then(resolve: (value: { data: ApiKeyRow[] | null; error: null }) => void) {
        if (mode === 'delete') {
          const before = rows.length
          const remaining = rows.filter((r) => !filters.every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v))
          rows.length = 0
          rows.push(...remaining)
          resolve({ data: null, error: null })
          void before
          return
        }
        const matches = rows.filter((r) => filters.every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v))
        resolve({ data: matches, error: null })
      },
    }
    return builder
  }

  return { from: () => table(), _rows: rows }
}

describe('saveApiKey / loadApiKey', () => {
  it('round-trips a key through encryption', async () => {
    const db = makeFakeDb()
    await saveApiKey(db as never, { teamId: 'team-1', provider: 'anthropic', apiKey: 'sk-ant-abc123' })
    const loaded = await loadApiKey(db as never, 'team-1', 'anthropic')
    expect(loaded).toBe('sk-ant-abc123')
  })

  it('stores the key encrypted, not in plaintext', async () => {
    const db = makeFakeDb()
    await saveApiKey(db as never, { teamId: 'team-1', provider: 'openai', apiKey: 'sk-secret-value' })
    const raw = db._rows[0]!.encrypted_key
    expect(raw).not.toContain('sk-secret-value')
    expect(isEncrypted(raw)).toBe(true)
  })

  it('upserts on (team_id, provider) — saving twice replaces, not duplicates', async () => {
    const db = makeFakeDb()
    await saveApiKey(db as never, { teamId: 'team-1', provider: 'anthropic', apiKey: 'sk-ant-first' })
    await saveApiKey(db as never, { teamId: 'team-1', provider: 'anthropic', apiKey: 'sk-ant-second' })
    expect(db._rows).toHaveLength(1)
    expect(await loadApiKey(db as never, 'team-1', 'anthropic')).toBe('sk-ant-second')
  })

  it('keeps different teams\' keys independent even for the same provider', async () => {
    const db = makeFakeDb()
    await saveApiKey(db as never, { teamId: 'team-1', provider: 'anthropic', apiKey: 'sk-team-1' })
    await saveApiKey(db as never, { teamId: 'team-2', provider: 'anthropic', apiKey: 'sk-team-2' })
    expect(await loadApiKey(db as never, 'team-1', 'anthropic')).toBe('sk-team-1')
    expect(await loadApiKey(db as never, 'team-2', 'anthropic')).toBe('sk-team-2')
  })

  it('returns null when no key is configured for that provider', async () => {
    const db = makeFakeDb()
    expect(await loadApiKey(db as never, 'team-1', 'anthropic')).toBeNull()
  })
})

describe('listApiKeySummaries', () => {
  it('never returns the full decrypted key — only the last 4 characters', async () => {
    const db = makeFakeDb()
    await saveApiKey(db as never, { teamId: 'team-1', provider: 'anthropic', apiKey: 'sk-ant-1234567890' })
    const summaries = await listApiKeySummaries(db as never, 'team-1')
    expect(summaries).toHaveLength(1)
    expect(summaries[0]!.last4).toBe('7890')
    expect(JSON.stringify(summaries)).not.toContain('sk-ant-1234567890')
  })
})

describe('deleteApiKey', () => {
  it('removes the row so loadApiKey returns null afterward', async () => {
    const db = makeFakeDb()
    await saveApiKey(db as never, { teamId: 'team-1', provider: 'anthropic', apiKey: 'sk-ant-x' })
    await deleteApiKey(db as never, 'team-1', 'anthropic')
    expect(await loadApiKey(db as never, 'team-1', 'anthropic')).toBeNull()
  })
})
