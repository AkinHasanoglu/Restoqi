'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceRoleClient } from '@stockalert/database/server'
import { saveStoreCredentials } from '@stockalert/database/stores'
import { logAudit } from '@stockalert/database/audit'
import { getConnector } from '../lib/connector-registry'
import { requireAuth, getPrimaryTeam, getSubscriptionLockError, SUBSCRIPTION_LOCKED_MESSAGE, type ActionResult } from '../lib/auth-guard'
import { STORE_LIMITS, refreshUsageMetrics, getPlanContext, enforceStoreQuotaAfterInsert } from '../lib/plan-limits'
import { toClientError } from '../lib/errors'
import { rateLimitManualSync } from '../lib/rate-limit'

/**
 * Previously checked `['active', 'trialing'].includes(subscription.status)`
 * directly, which let a team through as long as the row's status column
 * still said 'trialing' — even after trial_ends_at had passed and before
 * the daily trial-expiry cron got around to flipping it to
 * 'trial_expired'. getPlanContext (via resolveEffectivePlan) checks the
 * actual wall-clock deadline instead of trusting the stored status alone.
 */
async function checkStoreQuota(teamId: string): Promise<string | null> {
  const db = createServiceRoleClient()
  const ctx = await getPlanContext(db, teamId)

  if (!ctx.isAccessAllowed) return SUBSCRIPTION_LOCKED_MESSAGE

  const limit = STORE_LIMITS[ctx.effectivePlan] ?? 1
  if (limit === -1) return null

  const { count } = await db
    .from('connected_stores')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('is_active', true)

  if ((count ?? 0) >= limit) {
    return `Your ${ctx.effectivePlan} plan supports ${limit} connected store(s). Upgrade to connect more.`
  }

  return null
}

const ConnectApiKeySchema = z.object({
  platform: z.enum(['trendyol', 'hepsiburada', 'amazon']),
  storeName: z.string().min(1),
  credentials: z.record(z.string()),
})

const ConnectOAuthSchema = z.object({
  platform: z.enum(['shopify', 'etsy', 'ebay', 'aliexpress']),
  storeName: z.string().min(1),
  oauthCode: z.string().min(1),
  redirectUri: z.string().url(),
  shopDomain: z.string().optional(),
})

const DisconnectStoreSchema = z.object({
  storeId: z.string().uuid(),
})

export async function connectApiKeyStore(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAuth()

    const raw = {
      platform: formData.get('platform'),
      storeName: formData.get('storeName'),
      credentials: JSON.parse(formData.get('credentials') as string ?? '{}') as Record<string, string>,
    }

    const parsed = ConnectApiKeySchema.safeParse(raw)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }

    const { platform, storeName, credentials } = parsed.data

    const membership = await getPrimaryTeam(supabase, user.id)
    if (!membership) return { success: false, error: 'No team found' }
    // Same gate as disconnectStore — connecting a store is a privileged,
    // quota-consuming write; the UI already hides the "connect" button
    // from non-admins (canManage in integrations/page.tsx), but this
    // action is directly callable regardless of what the UI shows.
    if (!['admin', 'owner'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const quotaError = await checkStoreQuota(membership.team_id)
    if (quotaError) return { success: false, error: quotaError }

    try {
      const connector = await getConnector(platform)
      const creds = await connector.connect(credentials)
      const db = createServiceRoleClient()
      const storeId = await saveStoreCredentials(db, {
        teamId: membership.team_id,
        platform,
        storeName,
        externalStoreId: credentials['supplierId'] ?? credentials['merchantId'] ?? credentials['sellerId'] ?? '',
        creds,
      })

      // Backstop for the check-then-act race above: a concurrent request
      // could have passed checkStoreQuota() before this insert landed. See
      // 3rd security audit item 58.
      const raceQuotaError = await enforceStoreQuotaAfterInsert(db, membership.team_id, storeId)
      if (raceQuotaError) return { success: false, error: raceQuotaError }

      await logAudit(supabase, {
        teamId: membership.team_id, userId: user.id, actorEmail: user.email ?? null,
        action: 'store.connected', entityType: 'connected_stores', entityId: storeId,
        metadata: { platform, storeName },
      })
      await refreshUsageMetrics(db, membership.team_id)
    } catch (err) {
      return { success: false, error: toClientError(err, 'Failed to connect store') }
    }

    revalidatePath('/integrations')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}

export async function connectOAuthStore(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAuth()

    const raw = {
      platform: formData.get('platform'),
      storeName: formData.get('storeName'),
      oauthCode: formData.get('oauthCode'),
      redirectUri: formData.get('redirectUri'),
      shopDomain: formData.get('shopDomain') ?? undefined,
    }

    const parsed = ConnectOAuthSchema.safeParse(raw)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }

    const { platform, storeName, oauthCode, redirectUri, shopDomain } = parsed.data

    const membership = await getPrimaryTeam(supabase, user.id)
    if (!membership) return { success: false, error: 'No team found' }
    if (!['admin', 'owner'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const quotaError = await checkStoreQuota(membership.team_id)
    if (quotaError) return { success: false, error: quotaError }

    try {
      const connector = await getConnector(platform)
      const creds = await connector.connect({ code: oauthCode, redirectUri, shop: shopDomain ?? '' })
      const db = createServiceRoleClient()
      const storeId = await saveStoreCredentials(db, {
        teamId: membership.team_id,
        platform,
        storeName,
        externalStoreId: shopDomain ?? '',
        creds,
      })

      const raceQuotaError = await enforceStoreQuotaAfterInsert(db, membership.team_id, storeId)
      if (raceQuotaError) return { success: false, error: raceQuotaError }

      await logAudit(supabase, {
        teamId: membership.team_id, userId: user.id, actorEmail: user.email ?? null,
        action: 'store.connected', entityType: 'connected_stores', entityId: storeId,
        metadata: { platform, storeName },
      })
      await refreshUsageMetrics(db, membership.team_id)
    } catch (err) {
      return { success: false, error: toClientError(err, 'Failed to connect store') }
    }

    revalidatePath('/integrations')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}

export async function disconnectStore(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAuth()

    const parsed = DisconnectStoreSchema.safeParse({ storeId: formData.get('storeId') })
    if (!parsed.success) return { success: false, error: 'Invalid storeId' }

    const membership = await getPrimaryTeam(supabase, user.id)
    if (!membership || !['admin', 'owner'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const db = createServiceRoleClient()
    const { error } = await db
      .from('connected_stores')
      .update({ is_active: false })
      .eq('id', parsed.data.storeId)
      .eq('team_id', membership.team_id)

    if (error) return { success: false, error: 'Failed to disconnect store' }

    await logAudit(supabase, {
      teamId: membership.team_id, userId: user.id, actorEmail: user.email ?? null,
      action: 'store.disconnected', entityType: 'connected_stores', entityId: parsed.data.storeId,
    })
    await refreshUsageMetrics(db, membership.team_id)

    revalidatePath('/integrations')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}

export async function triggerManualSync(storeId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAuth()

    const membership = await getPrimaryTeam(supabase, user.id)
    if (!membership) return { success: false, error: 'No team found' }
    if (!['editor', 'admin', 'owner'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Manual "sync now" would otherwise be a way to bypass the same
    // suspension the automatic poller respects (see worker/sync's GET
    // handler filtering on suspended_at is null).
    const lockError = await getSubscriptionLockError(supabase, membership.team_id)
    if (lockError) return { success: false, error: lockError }

    const { data: store } = await supabase
      .from('connected_stores')
      .select('id, platform, team_id')
      .eq('id', storeId)
      .eq('team_id', membership.team_id)
      .single()

    if (!store) return { success: false, error: 'Store not found' }

    // Each press fans out to a real marketplace API call plus a full
    // alert-dispatch pass (email/SMS cost) — this Server Action had no
    // throttle at all before, unlike API routes which middleware.ts
    // already covers. See 2nd security audit item 9.
    if (!(await rateLimitManualSync(store.id))) {
      return { success: false, error: 'Too many manual syncs — please wait a few minutes and try again.' }
    }

    // Fire-and-forget call to the worker route
    try {
      const workerUrl = `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3001'}/api/worker/sync`
      void fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env['WORKER_SECRET'] ?? ''}`,
        },
        body: JSON.stringify({ type: 'poll_store', platform: store.platform, storeId: store.id, teamId: store.team_id }),
      })
    } catch {
      // Non-blocking
    }

    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}
