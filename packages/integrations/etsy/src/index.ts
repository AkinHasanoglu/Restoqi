import type { MarketplaceConnector, Credentials, OAuthCredentials, Page, Product, InventoryLevel } from '@stockalert/integrations-core'
import { fetchWithRetry, buildQuery, requireEnv, requireParam } from '@stockalert/integrations-core'

const BASE = 'https://openapi.etsy.com/v3'

function etsyHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'x-api-key': requireEnv('ETSY_CLIENT_ID'),
    'Content-Type': 'application/json',
  }
}

export const etsyConnector: MarketplaceConnector = {
  platform: 'etsy',

  getAuthUrl(state: string, redirectUri: string, _extra?: Record<string, string>): string {
    const clientId = requireEnv('ETSY_CLIENT_ID')
    const scopes = 'listings_r inventory_r'
    const codeChallenge = 'challenge' // Real impl: PKCE S256
    const params = buildQuery({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })
    return `https://www.etsy.com/oauth/connect?${params}`
  },

  async connect(params: Record<string, string>): Promise<Credentials> {
    const code = requireParam(params, 'code', 'Etsy')
    const res = await fetchWithRetry('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: requireEnv('ETSY_CLIENT_ID'),
        redirect_uri: requireEnv('ETSY_REDIRECT_URI'),
        code,
        code_verifier: 'verifier', // Real impl: stored from PKCE flow
      }).toString(),
    })
    if (!res.ok) throw new Error('Etsy OAuth code exchange failed')
    const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
    const accessToken = data.access_token

    // Etsy's OAuth redirect carries no shop identifier (unlike Shopify's
    // `shop` query param) — the only way to learn it is to ask, right
    // here, while we still have a fresh token. Without this, every
    // subsequent listProducts/getInventoryLevels call has no shop to
    // scope its requests to and Etsy never actually syncs.
    const meRes = await fetchWithRetry(`${BASE}/application/users/me`, { headers: etsyHeaders(accessToken) })
    if (!meRes.ok) throw new Error(`Etsy connect: failed to resolve shop id (${String(meRes.status)})`)
    const me = await meRes.json() as { user_id: number; shop_id: number | null }
    if (!me.shop_id) throw new Error('Etsy connect: this account has no shop — nothing to sync')

    return {
      type: 'oauth',
      accessToken,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      shop: String(me.shop_id),
    }
  },

  async listProducts(creds: Credentials, cursor?: string): Promise<Page<Product>> {
    const { accessToken, shop: shopId } = creds as OAuthCredentials & { shop: string }

    const offset = cursor ? parseInt(cursor) : 0
    const params = buildQuery({ limit: 25, offset, state: 'active' })
    const res = await fetchWithRetry(
      `${BASE}/application/shops/${shopId}/listings?${params}`,
      { headers: etsyHeaders(accessToken) }
    )
    if (!res.ok) throw new Error(`Etsy listings error: ${res.status}`)
    const data = await res.json() as {
      results: Array<{ listing_id: number; title: string; url: string; images: Array<{ url_fullxfull: string }> }>
      count: number
    }

    const items: Product[] = data.results.map((l) => ({
      externalId: String(l.listing_id),
      title: l.title,
      sku: null,
      barcode: null,
      imageUrl: l.images[0]?.url_fullxfull ?? null,
      productUrl: l.url,
      tags: [],
    }))

    const hasMore = offset + 25 < data.count
    return { items, nextCursor: hasMore ? String(offset + 25) : null, hasMore }
  },

  async getInventoryLevels(creds: Credentials, productIds: string[]): Promise<InventoryLevel[]> {
    const { accessToken } = creds as OAuthCredentials

    const results: InventoryLevel[] = []
    for (const listingId of productIds) {
      const res = await fetchWithRetry(
        `${BASE}/application/listings/${listingId}/inventory`,
        { headers: etsyHeaders(accessToken) }
      )
      if (!res.ok) continue
      const data = await res.json() as { products: Array<{ property_values: unknown[]; offerings: Array<{ quantity: number }> }> }
      const quantity = data.products[0]?.offerings[0]?.quantity ?? 0
      results.push({ productExternalId: listingId, quantity })
    }
    return results
  },

  // Etsy API v3 has no push webhooks — poll-only.
  supportsPush: false,
  async verifyWebhookSignature(): Promise<boolean> {
    return false
  },
}
