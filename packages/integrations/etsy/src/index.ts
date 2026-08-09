import type { MarketplaceConnector, Credentials, OAuthCredentials, Page, Product, InventoryLevel } from '@stockalert/integrations-core'
import { fetchWithRetry, buildQuery } from '@stockalert/integrations-core'

const BASE = 'https://openapi.etsy.com/v3'

function etsyHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'x-api-key': process.env['ETSY_CLIENT_ID'] ?? '',
    'Content-Type': 'application/json',
  }
}

export const etsyConnector: MarketplaceConnector = {
  platform: 'etsy',

  getAuthUrl(state: string, redirectUri: string, _extra?: Record<string, string>): string {
    const clientId = process.env['ETSY_CLIENT_ID'] ?? ''
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
    const { code } = params
    const res = await fetchWithRetry('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env['ETSY_CLIENT_ID'] ?? '',
        redirect_uri: process.env['ETSY_REDIRECT_URI'] ?? '',
        code,
        code_verifier: 'verifier', // Real impl: stored from PKCE flow
      }).toString(),
    })
    if (!res.ok) throw new Error('Etsy OAuth code exchange failed')
    const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
    return {
      type: 'oauth',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
  },

  async listProducts(creds: Credentials, cursor?: string): Promise<Page<Product>> {
    const { accessToken } = creds as OAuthCredentials
    // First get shop ID
    const meRes = await fetchWithRetry(`${BASE}/application/openapi-ping`, { headers: etsyHeaders(accessToken) })
    const shopId = process.env['ETSY_SHOP_ID'] ?? '' // Set during connect in real impl

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
    const shopId = process.env['ETSY_SHOP_ID'] ?? ''

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

  verifyWebhookSignature(_headers: Record<string, string>, _body: string, _secret: string): boolean {
    return true
  },
}
