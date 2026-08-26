import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client for e2e setup/teardown and assertions —
 * creating pre-confirmed users, seeding rows the UI can't reach, and
 * reading tables (alerts, alert_deliveries, audit_logs) the tests verify
 * side effects against. Never imported by application code, only specs.
 */
export function createAdminClient() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run this spec ' +
      '(it talks to Supabase directly, not just through the app) — see docs/deployment-checklist.md.'
    )
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}

/** Creates and auto-confirms a throwaway user — bypasses the email confirmation step entirely. */
export async function createConfirmedUser(email: string, password: string, fullName?: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  })
  if (error || !data.user) throw new Error(`Failed to create test user ${email}: ${error?.message ?? 'unknown error'}`)
  return data.user
}

export function uniqueTestEmail(prefix: string): string {
  return `${prefix}+${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}@e2e.stockalert.test`
}
