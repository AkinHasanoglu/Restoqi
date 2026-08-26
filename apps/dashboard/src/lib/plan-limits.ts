import type { createServiceRoleClient } from '@stockalert/database/server'
import type { createServerSupabaseClient } from '@stockalert/database/server'
import { PLAN_LIMITS, STORE_LIMITS, resolveEffectivePlan, type PlanContext, type PlanLimits, type PlanName } from '@stockalert/plans'

type Db = ReturnType<typeof createServiceRoleClient> | Awaited<ReturnType<typeof createServerSupabaseClient>>

// Re-exported from @stockalert/plans, the single source of truth for plan
// pricing/limits/features shared with apps/landing — kept as named exports
// here so the ~10 existing call sites across actions/*, worker/sync, and
// settings/billing/page.tsx don't all need their imports rewritten.
export { PLAN_LIMITS, STORE_LIMITS }
export type { PlanLimits, PlanName }

export interface UsageRow {
  store_count: number
  product_count: number
  rule_count: number
  alerts_this_month: number
  members_count: number
}

/**
 * Reads the team's usage_metrics row (populated by refreshUsageMetrics,
 * kept current at each mutation site) instead of running ad-hoc count()
 * queries against connected_stores/products/alerts/alert_rules on every
 * page render.
 */
export async function getUsage(db: Db, teamId: string): Promise<UsageRow> {
  const { data } = await db
    .from('usage_metrics')
    .select('store_count, product_count, rule_count, alerts_this_month, members_count')
    .eq('team_id', teamId)
    .maybeSingle()

  return data ?? { store_count: 0, product_count: 0, rule_count: 0, alerts_this_month: 0, members_count: 0 }
}

/** `null` = under the limit (or unlimited); otherwise a user-facing reason the action was blocked. */
export function checkLimit(usage: number, limit: number, planName: PlanName, resource: string): string | null {
  if (limit === -1) return null
  if (usage >= limit) return `Your ${planName} plan supports ${String(limit)} ${resource}. Upgrade to add more.`
  return null
}

/**
 * Recomputes usage_metrics for a team via the refresh_usage_metrics SQL
 * function (packages/database's schema_completion migration). Called
 * after every mutation that changes a counted resource (store connect/
 * disconnect, rule create/delete, member join/remove, a sync run's alerts)
 * so the billing page reads real numbers instead of running its own
 * count() queries. Best-effort — a stale usage number is a UI nit, not
 * worth failing the triggering action over.
 */
export async function refreshUsageMetrics(db: Db, teamId: string): Promise<void> {
  const { error } = await db.rpc('refresh_usage_metrics', { p_team_id: teamId })
  if (error) console.error('[usage-metrics] refresh failed', { teamId, error: error.message })
}

export interface TeamPlanContext extends PlanContext {
  /** The plan actually stored on the row — differs from effectivePlan during a trial (see resolveEffectivePlan). */
  plan: PlanName
  status: string
  limits: PlanLimits
  usage: UsageRow
}

/**
 * Single call site for "what can this team do right now" — combines the
 * subscription row (reverse-trial resolution) with usage_metrics so
 * callers stop hand-rolling their own `subscriptions.select('plan')` +
 * getUsage() pairs (previously duplicated across actions/alerts.ts,
 * actions/integrations.ts, actions/team.ts and the billing page, each
 * with slightly different trial handling).
 */
export async function getPlanContext(db: Db, teamId: string): Promise<TeamPlanContext> {
  const [{ data: sub }, usage] = await Promise.all([
    db.from('subscriptions').select('plan, status, trial_ends_at').eq('team_id', teamId).maybeSingle(),
    getUsage(db, teamId),
  ])

  const resolved = resolveEffectivePlan(
    sub ? { plan: sub.plan, status: sub.status, trial_ends_at: sub.trial_ends_at } : null
  )

  return {
    ...resolved,
    plan: sub?.plan ?? 'starter',
    status: sub?.status ?? 'trial_expired',
    limits: PLAN_LIMITS[resolved.effectivePlan],
    usage,
  }
}

/**
 * Post-insert quota backstop for connected_stores — closes a check-then-act
 * race where two concurrent "connect store" requests both read a
 * still-under-limit count from checkStoreQuota/getStoreQuotaError and both
 * insert, putting the team over its plan's store limit (see 3rd security
 * audit item 58). Call this immediately after saveStoreCredentials() at
 * every connect call site (connectApiKeyStore, connectOAuthStore,
 * api/auth/oauth-callback).
 *
 * Deterministic rather than "roll back if over limit": ranks a team's active
 * stores by created_at and evicts everything past the plan's limit, so a
 * burst of N concurrent connects converges on exactly `limit` active stores
 * instead of every racer independently rolling back its own row and
 * potentially leaving the team with zero. Still has a narrow window (the
 * select and the eviction update aren't one atomic statement), so this
 * reduces the race rather than eliminating it outright — a per-team
 * `pg_advisory_xact_lock` in a dedicated RPC would close it completely if
 * this ever needs to be airtight.
 */
export async function enforceStoreQuotaAfterInsert(
  db: Db,
  teamId: string,
  storeId: string,
): Promise<string | null> {
  const ctx = await getPlanContext(db, teamId)
  const limit = STORE_LIMITS[ctx.effectivePlan] ?? 1
  if (limit === -1) return null

  const { data: active } = await db
    .from('connected_stores')
    .select('id, created_at')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const rows = active ?? []
  if (rows.length <= limit) return null

  const overflowIds = rows.slice(limit).map((r) => r.id)
  if (overflowIds.length) {
    await db.from('connected_stores').update({ is_active: false }).in('id', overflowIds)
  }

  if (!overflowIds.includes(storeId)) return null // this request's store survived the cut

  return `Your ${ctx.effectivePlan} plan supports ${limit} connected store(s). Upgrade to connect more.`
}

/**
 * Post-insert quota backstop for team_members, mirroring
 * enforceStoreQuotaAfterInsert above. inviteMember's own seat check only
 * bounds how many invitations can be *sent* against the team's *current*
 * member count — it has no visibility into other outstanding invitations,
 * so several invitees accepting at once can each independently pass a
 * seat check that was only ever valid for one of them (see 3rd security
 * audit item 58). Call immediately after acceptInvite's team_members insert.
 *
 * Unlike the store variant, this only ever evicts the row this specific call
 * just inserted (never another racer's row) — ranks members by joined_at and
 * deletes memberId's own row if its rank falls past the limit. Simpler and
 * has no cross-request side effects, at the cost of not guaranteeing the
 * team converges to exactly `limit` members when several requests race
 * simultaneously (each only ever removes itself).
 */
export async function enforceSeatQuotaAfterInsert(
  db: Db,
  teamId: string,
  memberId: string,
): Promise<string | null> {
  const ctx = await getPlanContext(db, teamId)
  const limit = ctx.limits.seats
  if (limit === -1) return null

  const { data: members } = await db
    .from('team_members')
    .select('id, joined_at')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true })

  const rows = members ?? []
  const rank = rows.findIndex((r) => r.id === memberId)
  if (rank === -1 || rank < limit) return null // already gone, or within the allowed count

  await db.from('team_members').delete().eq('id', memberId)
  return `This team is at its ${ctx.effectivePlan} plan's seat limit (${limit}). Ask the team owner to upgrade the plan or free up a seat.`
}
