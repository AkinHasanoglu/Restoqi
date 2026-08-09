import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@stockalert/database/server'
import { SUPPORTED_PLATFORMS } from '@stockalert/integrations-core'
import { getConnector } from '../../../../lib/connector-registry'

const STORE_LIMITS: Record<string, number> = { starter: 1, business: 5, enterprise: -1 }

async function getStoreQuotaError(teamId: string, db: ReturnType<typeof createServiceRoleClient>): Promise<string | null> {
  const { data: subscription } = await db
    .from('subscriptions')
    .select('plan, status')
    .eq('team_id', teamId)
    .single()

  if (!subscription || !['active', 'trialing'].includes(subscription.status as string)) {
    return 'subscription_required'
  }

  const limit = STORE_LIMITS[subscription.plan as string] ?? 1
  if (limit === -1) return null

  const { count } = await db
    .from('connected_stores')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('status', 'active')

  if ((count ?? 0) >= limit) return 'plan_limit_reached'
  return null
}

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform') ?? ''
  const code = searchParams.get('code') ?? ''
  const shop = searchParams.get('shop') ?? ''
  const error = searchParams.get('error')

  const appBase = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3001'
  const redirectUri = `${appBase}/api/auth/oauth-callback?platform=${platform}`

  if (error) {
    return NextResponse.redirect(`${appBase}/integrations?error=${encodeURIComponent(error)}`)
  }

  if (!SUPPORTED_PLATFORMS.includes(platform) || !code) {
    return NextResponse.redirect(`${appBase}/integrations?error=invalid_request`)
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${appBase}/login`)

    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .order('joined_at')
      .limit(1)
      .single()

    if (!membership) return NextResponse.redirect(`${appBase}/integrations?error=no_team`)

    const db = createServiceRoleClient()
    const quotaError = await getStoreQuotaError(membership.team_id, db)
    if (quotaError) return NextResponse.redirect(`${appBase}/integrations?error=${quotaError}`)

    const connector = await getConnector(platform)
    const creds = await connector.connect({ code, redirectUri, shop })

    await db.from('connected_stores').insert({
      team_id: membership.team_id,
      platform,
      store_name: shop || platform,
      external_store_id: shop,
      credentials: creds as unknown as Record<string, unknown>,
      status: 'active',
    })

    return NextResponse.redirect(`${appBase}/integrations?connected=1`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(`${appBase}/integrations?error=${encodeURIComponent(msg)}`)
  }
}
