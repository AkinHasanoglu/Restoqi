import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { isSupportedPlatform } from '@stockalert/integrations-core'
import { getConnector } from '../../../../lib/connector-registry'
import { requireAuth, getPrimaryTeam } from '../../../../lib/auth-guard'
import { stateCookieName } from '../../../../lib/oauth-state'

export const runtime = 'nodejs'

// 10 minutes is generous for the full OAuth redirect round trip (user
// approves on the marketplace's own site) while keeping the replay window
// small if the cookie were ever intercepted.
const STATE_COOKIE_MAX_AGE = 600

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform') ?? ''
  const redirectUri = searchParams.get('redirectUri') ?? ''
  const shopDomain = searchParams.get('shopDomain') ?? ''

  if (!isSupportedPlatform(platform)) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
  }

  // Connecting a store is a privileged, quota-consuming write — the UI
  // already hides it from non-admins (canManage in integrations/page.tsx),
  // but that's not enforcement. This route previously had no auth check
  // at all: any anonymous visitor could hit it directly and it would
  // still complete the redirect to the marketplace's OAuth consent page.
  // Checked before redirectUri below, not after — auth is the primary
  // gate on this route, not an afterthought behind input validation.
  try {
    const { supabase, user } = await requireAuth()
    const membership = await getPrimaryTeam(supabase, user.id)
    if (!membership || !['admin', 'owner'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // redirectUri must point back into this app — otherwise an attacker
  // could redirect the OAuth authorization code (and, for some
  // providers, the access token) to a host they control. A prefix check
  // (`redirectUri.startsWith(appBase)`) is the wrong primitive for this:
  // `${appBase}.evil.tld` or `${appBase}@evil.tld` both pass startsWith
  // while resolving to a completely different host. Compare parsed
  // origins instead. See 2nd security audit item 10.
  const appBase = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3001'
  let redirectOrigin: string
  try {
    redirectOrigin = new URL(redirectUri).origin
  } catch {
    return NextResponse.json({ error: 'Invalid redirectUri' }, { status: 400 })
  }
  if (redirectOrigin !== new URL(appBase).origin) {
    return NextResponse.json({ error: 'Invalid redirectUri' }, { status: 400 })
  }

  try {
    const connector = await getConnector(platform)
    if (!connector.getAuthUrl) {
      return NextResponse.json({ error: 'Platform does not support OAuth' }, { status: 400 })
    }

    // Generated server-side — never trust a client-supplied state — and
    // bound to an httpOnly cookie the callback verifies with a
    // constant-time compare. Closes a connection-CSRF hole where an
    // attacker could otherwise graft their own marketplace store into a
    // victim's team by getting them to open a crafted callback URL: the
    // old flow generated `state` in the browser and stored it in
    // sessionStorage, but the callback never read it back at all.
    const state = randomUUID()
    const extra: Record<string, string> = {}
    if (shopDomain) extra['shopDomain'] = shopDomain
    const authUrl = connector.getAuthUrl(state, redirectUri, extra)

    const response = NextResponse.redirect(authUrl)
    response.cookies.set(stateCookieName(platform), state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_COOKIE_MAX_AGE,
      path: '/api/auth/oauth-callback',
    })
    return response
  } catch (err) {
    console.error(`[oauth-start] ${platform} failed`, err)
    return NextResponse.json({ error: 'Failed to start OAuth flow' }, { status: 500 })
  }
}
