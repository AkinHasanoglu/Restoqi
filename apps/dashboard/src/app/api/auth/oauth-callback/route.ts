import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@stockalert/database/server'
import { saveStoreCredentials } from '@stockalert/database/stores'
import { logAudit } from '@stockalert/database/audit'
import { isSupportedPlatform } from '@stockalert/integrations-core'
import { getConnector } from '../../../../lib/connector-registry'
import { getPrimaryTeam } from '../../../../lib/auth-guard'
import { STORE_LIMITS, refreshUsageMetrics, getPlanContext, enforceStoreQuotaAfterInsert } from '../../../../lib/plan-limits'
import { stateCookieName, safeEqual } from '../../../../lib/oauth-state'

/**
 * Previously checked `['active', 'trialing'].includes(subscription.status)`
 * directly, same bug as actions/integrations.ts's checkStoreQuota: a
 * 'trialing' row past its trial_ends_at (before the daily trial-expiry
 * cron flips it to 'trial_expired') would slip through. getPlanContext
 * resolves the actual wall-clock deadline instead.
 */
async function getStoreQuotaError(teamId: string, db: ReturnType<typeof createServiceRoleClient>): Promise<string | null> {
  const ctx = await getPlanContext(db, teamId)
  if (!ctx.isAccessAllowed) return 'subscription_required'

  const limit = STORE_LIMITS[ctx.effectivePlan] ?? 1
  if (limit === -1) return null

  const { count } = await db
    .from('connected_stores')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('is_active', true)

  if ((count ?? 0) >= limit) return 'plan_limit_reached'
  return null
}

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform') ?? ''
  const code = searchParams.get('code') ?? ''
  const shop = searchParams.get('shop') ?? ''
  const state = searchParams.get('state') ?? ''
  const error = searchParams.get('error')

  const appBase = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3001'
  const redirectUri = `${appBase}/api/auth/oauth-callback?platform=${platform}`

  if (error) {
    return NextResponse.redirect(`${appBase}/integrations?error=${encodeURIComponent(error)}`)
  }

  if (!isSupportedPlatform(platform) || !code) {
    return NextResponse.redirect(`${appBase}/integrations?error=invalid_request`)
  }

  // Anti-CSRF: state was generated server-side in oauth-start and bound to
  // an httpOnly cookie scoped to this path. Without this check, an
  // attacker could get a victim to open this URL with the attacker's own
  // authorization `code`, causing the victim's session to persist the
  // attacker's store credentials into the victim's team (connection
  // CSRF) — the state cookie proves this request actually originated
  // from oauth-start on this browser, not from an arbitrary link.
  const expectedState = request.cookies.get(stateCookieName(platform))?.value ?? ''
  const stateValid = Boolean(state) && Boolean(expectedState) && safeEqual(state, expectedState)

  // Single-use: every exit from this point on clears the state cookie,
  // whether the flow succeeds or fails partway through.
  function redirectAndClearState(url: string): NextResponse {
    const response = NextResponse.redirect(url)
    response.cookies.delete(stateCookieName(platform))
    return response
  }

  if (!stateValid) {
    return redirectAndClearState(`${appBase}/integrations?error=invalid_state`)
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirectAndClearState(`${appBase}/login`)

    const membership = await getPrimaryTeam(supabase, user.id)

    if (!membership) return redirectAndClearState(`${appBase}/integrations?error=no_team`)
    // Same admin/owner gate as connectApiKeyStore/connectOAuthStore and
    // disconnectStore — oauth-start already checks this, but this route
    // is a valid unauthenticated-looking GET (it's a browser redirect
    // target), so it re-checks independently rather than trusting that
    // the request came through oauth-start's own guard.
    if (!['admin', 'owner'].includes(membership.role)) {
      return redirectAndClearState(`${appBase}/integrations?error=insufficient_permissions`)
    }

    const db = createServiceRoleClient()
    const quotaError = await getStoreQuotaError(membership.team_id, db)
    if (quotaError) return redirectAndClearState(`${appBase}/integrations?error=${quotaError}`)

    const connector = await getConnector(platform)
    const creds = await connector.connect({ code, redirectUri, shop })

    // Prefer a shop/store id the connector itself resolved during connect()
    // (Etsy's OAuth redirect carries none, so its connector looks up
    // shop_id via the API) over the `shop` query param, which only
    // Shopify's redirect actually provides.
    const resolvedShop = 'shop' in creds && typeof creds.shop === 'string' ? creds.shop : shop

    const storeId = await saveStoreCredentials(db, {
      teamId: membership.team_id,
      platform,
      storeName: resolvedShop || platform,
      externalStoreId: resolvedShop,
      creds,
    })

    // Backstop for the check-then-act race in getStoreQuotaError above: a
    // concurrent request (e.g. the same user double-clicking "connect",
    // or a second admin) could have passed that check before this insert
    // landed. See 3rd security audit item 58.
    const raceQuotaError = await enforceStoreQuotaAfterInsert(db, membership.team_id, storeId)
    if (raceQuotaError) return redirectAndClearState(`${appBase}/integrations?error=plan_limit_reached`)

    await logAudit(supabase, {
      teamId: membership.team_id, userId: user.id, actorEmail: user.email ?? null,
      action: 'store.connected', entityType: 'connected_stores', entityId: storeId,
      metadata: { platform, storeName: shop || platform },
    })
    await refreshUsageMetrics(db, membership.team_id)

    // Best-effort: a failed webhook subscription shouldn't block the
    // connection itself (poll-only platforms and platforms with no
    // registerWebhook implementation simply skip this).
    if (connector.supportsPush && connector.registerWebhook) {
      try {
        await connector.registerWebhook(creds, {
          topic: 'inventory_levels/update',
          address: `${appBase}/api/webhooks/${platform}`,
        })
      } catch (err) {
        console.error(`[oauth-callback] ${platform} webhook registration failed`, err)
      }
    }

    return redirectAndClearState(`${appBase}/integrations?connected=1`)
  } catch (err) {
    console.error(`[oauth-callback] ${platform} failed`, err)
    return redirectAndClearState(`${appBase}/integrations?error=connection_failed`)
  }
}
