'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceRoleClient } from '@stockalert/database/server'
import { getConnector } from '../lib/connector-registry'
import { requireAuth } from '../lib/auth-guard'

const STORE_LIMITS: Record<string, number> = {
  starter: 1,
  business: 5,
  enterprise: -1,
}

async function checkStoreQuota(teamId: string): Promise<{ error: string } | null> {
  const db = createServiceRoleClient()

  const { data: subscription } = await db
    .from('subscriptions')
    .select('plan, status')
    .eq('team_id', teamId)
    .single()

  if (!subscription || !['active', 'trialing'].includes(subscription.status as string)) {
    return { error: 'An active subscription is required to connect stores.' }
  }

  const limit = STORE_LIMITS[subscription.plan as string] ?? 1
  if (limit === -1) return null

  const { count } = await db
    .from('connected_stores')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('status', 'active')

  if ((count ?? 0) >= limit) {
    return {
      error: `Your ${subscription.plan} plan supports ${limit} connected store(s). Upgrade to connect more.`,
    }
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

export async function connectApiKeyStore(formData: FormData) {
  const user = await requireAuth()

  const raw = {
    platform: formData.get('platform'),
    storeName: formData.get('storeName'),
    credentials: JSON.parse(formData.get('credentials') as string ?? '{}') as Record<string, string>,
  }

  const parsed = ConnectApiKeySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const { platform, storeName, credentials } = parsed.data

  const supabase = await createServerSupabaseClient()
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .order('joined_at')
    .limit(1)
    .single()

  if (!membership) return { error: 'No team found' }

  const quotaError = await checkStoreQuota(membership.team_id)
  if (quotaError) return quotaError

  // Verify credentials via the connector
  try {
    const connector = await getConnector(platform)
    const creds = await connector.connect(credentials)
    const db = createServiceRoleClient()
    await db.from('connected_stores').insert({
      team_id: membership.team_id,
      platform,
      store_name: storeName,
      external_store_id: credentials['supplierId'] ?? credentials['merchantId'] ?? credentials['sellerId'] ?? '',
      credentials: creds as unknown as Record<string, unknown>,
      status: 'active',
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to connect store' }
  }

  revalidatePath('/integrations')
  return { success: true }
}

export async function connectOAuthStore(formData: FormData) {
  const user = await requireAuth()

  const raw = {
    platform: formData.get('platform'),
    storeName: formData.get('storeName'),
    oauthCode: formData.get('oauthCode'),
    redirectUri: formData.get('redirectUri'),
    shopDomain: formData.get('shopDomain') ?? undefined,
  }

  const parsed = ConnectOAuthSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const { platform, storeName, oauthCode, redirectUri, shopDomain } = parsed.data

  const supabase = await createServerSupabaseClient()
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .order('joined_at')
    .limit(1)
    .single()

  if (!membership) return { error: 'No team found' }

  const quotaError = await checkStoreQuota(membership.team_id)
  if (quotaError) return quotaError

  try {
    const connector = await getConnector(platform)
    const creds = await connector.connect({ code: oauthCode, redirectUri, shop: shopDomain ?? '' })
    const db = createServiceRoleClient()
    await db.from('connected_stores').insert({
      team_id: membership.team_id,
      platform,
      store_name: storeName,
      external_store_id: shopDomain ?? '',
      credentials: creds as unknown as Record<string, unknown>,
      status: 'active',
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to connect store' }
  }

  revalidatePath('/integrations')
  return { success: true }
}

export async function disconnectStore(formData: FormData) {
  const user = await requireAuth()

  const parsed = DisconnectStoreSchema.safeParse({ storeId: formData.get('storeId') })
  if (!parsed.success) return { error: 'Invalid storeId' }

  const supabase = await createServerSupabaseClient()
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)
    .order('joined_at')
    .limit(1)
    .single()

  if (!membership || !['admin', 'owner'].includes(membership.role)) {
    return { error: 'Insufficient permissions' }
  }

  const db = createServiceRoleClient()
  const { error } = await db
    .from('connected_stores')
    .update({ status: 'disconnected' })
    .eq('id', parsed.data.storeId)
    .eq('team_id', membership.team_id)

  if (error) return { error: 'Failed to disconnect store' }

  revalidatePath('/integrations')
  return { success: true }
}

export async function triggerManualSync(storeId: string) {
  const user = await requireAuth()

  const supabase = await createServerSupabaseClient()
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .order('joined_at')
    .limit(1)
    .single()

  if (!membership) return { error: 'No team found' }

  const { data: store } = await supabase
    .from('connected_stores')
    .select('id, platform, team_id')
    .eq('id', storeId)
    .eq('team_id', membership.team_id)
    .single()

  if (!store) return { error: 'Store not found' }

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

  return { success: true }
}
