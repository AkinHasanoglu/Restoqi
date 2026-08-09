import { NextRequest, NextResponse } from 'next/server'
import { SUPPORTED_PLATFORMS } from '@stockalert/integrations-core'
import { getConnector } from '../../../../lib/connector-registry'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform') ?? ''
  const state = searchParams.get('state') ?? ''
  const redirectUri = searchParams.get('redirectUri') ?? ''
  const shopDomain = searchParams.get('shopDomain') ?? ''

  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
  }

  try {
    const connector = await getConnector(platform)
    if (!connector.getAuthUrl) {
      return NextResponse.json({ error: 'Platform does not support OAuth' }, { status: 400 })
    }
    const extra: Record<string, string> = {}
    if (shopDomain) extra['shopDomain'] = shopDomain
    const authUrl = connector.getAuthUrl(state, redirectUri, extra)
    return NextResponse.redirect(authUrl)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
