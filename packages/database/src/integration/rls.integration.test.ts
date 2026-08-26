/**
 * Integration suite against a real (local) Supabase instance — not part of
 * the default `vitest run` used by `pnpm turbo test` (see
 * package.json's "test:integration" script and CI's dedicated `database`
 * job). Requires `supabase start` (packages/database's config.toml runs
 * the API on port 55321) to already be running.
 *
 * Skips itself entirely — rather than failing — when SUPABASE_SERVICE_ROLE_KEY
 * isn't set, so a plain `pnpm turbo test` without local Supabase running
 * stays green and fast.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? 'http://127.0.0.1:55321'
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']

const hasLocalSupabase = Boolean(ANON_KEY && SERVICE_ROLE_KEY)

function admin(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

/** A client authenticated as a specific user, for exercising real RLS (not service-role, which bypasses it). */
async function asUser(email: string, password: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY!, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Failed to sign in as ${email}: ${error.message}`)
  return client
}

async function createConfirmedUser(db: SupabaseClient<Database>, email: string, password: string, fullName?: string) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  })
  if (error || !data.user) throw new Error(`createUser(${email}) failed: ${error?.message ?? 'unknown'}`)
  return data.user
}

function uniqueEmail(prefix: string): string {
  return `${prefix}+${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}@integration.stockalert.test`
}

describe.skipIf(!hasLocalSupabase)('RLS + handle_new_user (requires local Supabase)', () => {
  const db = admin()
  const password = 'Sup3r-Secret-Passw0rd!'

  it('handle_new_user creates exactly one team + owner membership + trialing subscription + usage_metrics row', async () => {
    const email = uniqueEmail('signup')
    const user = await createConfirmedUser(db, email, password, 'New User')

    const { data: memberships } = await db.from('team_members').select('team_id, role').eq('user_id', user.id)
    expect(memberships).toHaveLength(1)
    expect(memberships![0]!.role).toBe('owner')

    const teamId = memberships![0]!.team_id
    const { data: subscription } = await db.from('subscriptions').select('status').eq('team_id', teamId).single()
    expect(subscription?.status).toBe('trialing')

    const { data: usage } = await db.from('usage_metrics').select('team_id').eq('team_id', teamId).maybeSingle()
    expect(usage).not.toBeNull()
  })

  it('a Turkish full name produces a slug that passes the CHECK constraint (regression: previously failed)', async () => {
    // lower() ran AFTER the character-class replace in the original
    // handle_new_user, so "Şeyma Öztürk" left uppercase/accented remnants
    // that violated `slug ~ '^[a-z0-9-]{2,50}$'` and made signup itself fail.
    const email = uniqueEmail('turkish-name')
    const user = await createConfirmedUser(db, email, password, 'Şeyma Öztürk')

    const { data: memberships } = await db.from('team_members').select('team_id').eq('user_id', user.id)
    expect(memberships).toHaveLength(1)

    const { data: team } = await db.from('teams').select('slug').eq('id', memberships![0]!.team_id).single()
    expect(team?.slug).toMatch(/^[a-z0-9-]{2,50}$/)
  })

  it('an editor in team A sees zero rows querying team B\'s alert_rules', async () => {
    const emailA = uniqueEmail('team-a-owner')
    const emailB = uniqueEmail('team-b-owner')
    const userA = await createConfirmedUser(db, emailA, password)
    await createConfirmedUser(db, emailB, password)

    const { data: membershipA } = await db.from('team_members').select('team_id').eq('user_id', userA.id).single()
    const teamAId = membershipA!.team_id

    const { data: membershipB } = await db
      .from('team_members')
      .select('team_id')
      .eq('user_id', (await db.auth.admin.listUsers()).data.users.find((u) => u.email === emailB)!.id)
      .single()
    const teamBId = membershipB!.team_id

    await db.from('alert_rules').insert({
      team_id: teamBId,
      name: 'Team B private rule',
      threshold_type: 'absolute',
      threshold_value: 5,
      channel_ids: [],
    })

    const clientA = await asUser(emailA, password)
    const { data: visibleToA } = await clientA.from('alert_rules').select('id').eq('team_id', teamBId)
    expect(visibleToA).toHaveLength(0)
  })

  it('audit_logs rejects UPDATE and DELETE even from an admin (append-only)', async () => {
    const email = uniqueEmail('audit-owner')
    const user = await createConfirmedUser(db, email, password)
    const { data: membership } = await db.from('team_members').select('team_id').eq('user_id', user.id).single()
    const teamId = membership!.team_id

    const { data: entry } = await db
      .from('audit_logs')
      .insert({ team_id: teamId, user_id: user.id, actor_email: email, action: 'team.updated' })
      .select('id')
      .single()
    expect(entry).toBeTruthy()

    const client = await asUser(email, password)
    const { error: updateError } = await client.from('audit_logs').update({ metadata: { tampered: true } }).eq('id', entry!.id)
    expect(updateError).not.toBeNull()

    const { error: deleteError } = await client.from('audit_logs').delete().eq('id', entry!.id)
    expect(deleteError).not.toBeNull()

    // Still there, unmodified.
    const { data: stillThere } = await db.from('audit_logs').select('metadata').eq('id', entry!.id).single()
    expect(stillThere?.metadata).not.toEqual({ tampered: true })
  })

  it('members_self_join lets an invitee insert their own membership row for a live, matching invitation', async () => {
    const ownerEmail = uniqueEmail('invite-flow-owner')
    const inviteeEmail = uniqueEmail('invite-flow-member')
    const owner = await createConfirmedUser(db, ownerEmail, password)
    await createConfirmedUser(db, inviteeEmail, password)

    const { data: ownerMembership } = await db.from('team_members').select('team_id').eq('user_id', owner.id).single()
    const teamId = ownerMembership!.team_id

    const inviteeId = (await db.auth.admin.listUsers()).data.users.find((u) => u.email === inviteeEmail)!.id

    await db.from('team_invitations').insert({
      team_id: teamId,
      email: inviteeEmail,
      role: 'editor',
      invited_by: owner.id,
    })

    const inviteeClient = await asUser(inviteeEmail, password)
    const { error } = await inviteeClient.from('team_members').insert({ team_id: teamId, user_id: inviteeId, role: 'editor' })
    expect(error).toBeNull()

    const { data: confirmed } = await db.from('team_members').select('role').eq('team_id', teamId).eq('user_id', inviteeId).single()
    expect(confirmed?.role).toBe('editor')
  })

  // Regression coverage for the pre-launch security audit's four critical
  // findings — each was independently exploitable via the anon client
  // with nothing more than a normal authenticated session; see
  // 20260819000000_security_hardening.sql for the fix each test guards.

  it('members_self_join rejects a role that does not match the invitation (regression: role escalation)', async () => {
    const ownerEmail = uniqueEmail('escalation-owner')
    const inviteeEmail = uniqueEmail('escalation-member')
    const owner = await createConfirmedUser(db, ownerEmail, password)
    await createConfirmedUser(db, inviteeEmail, password)

    const { data: ownerMembership } = await db.from('team_members').select('team_id').eq('user_id', owner.id).single()
    const teamId = ownerMembership!.team_id
    const inviteeId = (await db.auth.admin.listUsers()).data.users.find((u) => u.email === inviteeEmail)!.id

    // Invited as viewer...
    await db.from('team_invitations').insert({
      team_id: teamId,
      email: inviteeEmail,
      role: 'viewer',
      invited_by: owner.id,
    })

    // ...but tries to self-insert as owner instead of accepting as invited.
    const inviteeClient = await asUser(inviteeEmail, password)
    const { error } = await inviteeClient.from('team_members').insert({ team_id: teamId, user_id: inviteeId, role: 'owner' })
    expect(error).not.toBeNull()

    const { data: notMember } = await db.from('team_members').select('id').eq('team_id', teamId).eq('user_id', inviteeId).maybeSingle()
    expect(notMember).toBeNull()
  })

  it('subscriptions has no client-reachable UPDATE policy (regression: free plan upgrade)', async () => {
    const email = uniqueEmail('billing-bypass-owner')
    const owner = await createConfirmedUser(db, email, password)
    const { data: membership } = await db.from('team_members').select('team_id').eq('user_id', owner.id).single()
    const teamId = membership!.team_id

    const { data: before } = await db.from('subscriptions').select('plan').eq('team_id', teamId).single()
    expect(before?.plan).toBe('starter')

    const client = await asUser(email, password)
    const { error } = await client.from('subscriptions').update({ plan: 'scale', status: 'active' }).eq('team_id', teamId)
    // RLS with zero UPDATE policies makes the row invisible to the
    // update's WHERE clause, not a permission error — PostgREST reports
    // this as a successful no-op (0 rows affected), not an error. The
    // real assertion is the row afterward.
    void error

    const { data: after } = await db.from('subscriptions').select('plan').eq('team_id', teamId).single()
    expect(after?.plan).toBe('starter')
  })

  it('store_secrets is not selectable by any client-side role, including the team owner (regression: plaintext webhook_secret exposure)', async () => {
    const email = uniqueEmail('store-secrets-owner')
    const owner = await createConfirmedUser(db, email, password)
    const { data: membership } = await db.from('team_members').select('team_id').eq('user_id', owner.id).single()
    const teamId = membership!.team_id

    const { data: store } = await db
      .from('connected_stores')
      .insert({ team_id: teamId, platform: 'shopify', store_name: 'RLS test store', external_store_id: `rls-test-${Date.now()}` })
      .select('id')
      .single()
    await db.from('store_secrets').insert({ store_id: store!.id, encrypted_creds: 'not-a-real-ciphertext' })

    const client = await asUser(email, password)
    const { data, error } = await client.from('store_secrets').select('webhook_secret, encrypted_creds').eq('store_id', store!.id)
    // RLS-enabled with zero policies: PostgREST returns an empty result
    // set, not a 4xx — this is what "the owner can see literally nothing
    // here" looks like from the client's perspective.
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
})
