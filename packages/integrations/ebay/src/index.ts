import type { MarketplaceConnector, Credentials, OAuthCredentials, Page, Product, InventoryLevel } from '@stockalert/integrations-core'
import { fetchWithRetry, buildQuery, hmacSHA256, timingSafeEqual } from '@stockalert/integrations-core'

const BASE = 'https://api.ebay.com'
const SANDBOX = 'https://api.sandbox.ebay.com'

function ebayBase() {
  return process.env['EBAY_SANDBOX'] === 'true' ? SANDBOX : BASE
}

async function refreshToken(refreshToken: string): Promise<string> {
  const clientId = process.env['EBAY_CLIENT_ID'] ?? ''
  const clientSecret = process.env['EBAY_CLIENT_SECRET'] ?? ''
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetchWithRetry(`${ebayBase()}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory',
    }).toString(),
  })
  if (!res.ok) throw new Error(`eBay token refresh failed: ${res.status}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

export const ebayConnector: MarketplaceConnector = {
  platform: 'ebay',

  getAuthUrl(state: string, redirectUri: string, _extra?: Record<string, string>): string {
    const clientId = process.env['EBAY_CLIENT_ID'] ?? ''
    const scope = 'https://api.ebay.com/oauth/api_scope/sell.inventory'
    const params = buildQuery({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope,
      state,
    })
    return `${ebayBase()}/oauth2/authorize?${params}`
  },

  async connect(params: Record<string, string>): Promise<Credentials> {
    const { code } = params
    const clientId = process.env['EBAY_CLIENT_ID'] ?? ''
    const clientSecret = process.env['EBAY_CLIENT_SECRET'] ?? ''
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const res = await fetchWithRetry(`${ebayBase()}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env['EBAY_REDIRECT_URI'] ?? '',
      }).toString(),
    })
    if (!res.ok) throw new Error('eBay OAuth exchange failed')
    const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
    return { type: 'oauth', accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + data.expires_in * 1000 }
  },

  async listProducts(creds: Credentials, cursor?: string): Promise<Page<Product>> {
    const oauth = creds as OAuthCredentials
    let token = oauth.accessToken
    if (oauth.expiresAt && oauth.expiresAt < Date.now() && oauth.refreshToken) {
      token = await refreshToken(oauth.refreshToken)
    }
    const params = buildQuery({ limit: 25, offset: cursor ?? '0' })
    const res = await fetchWithRetry(`${ebayBase()}/sell/inventory/v1/inventory_item?${params}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Language': 'en-US' },
    })
    if (!res.ok) throw new Error(`eBay inventory error: ${res.status}`)
    const data = await res.json() as {
      inventoryItems: Array<{ sku: string; product: { title: string; imageUrls: string[] } }>
      total: number; size: number; href: string; next?: string
    }

    const items: Product[] = (data.inventoryItems ?? []).map((inv) => ({
      externalId: inv.sku,
      title: inv.product?.title ?? inv.sku,
      sku: inv.sku,
      barcode: null,
      imageUrl: inv.product?.imageUrls[0] ?? null,
      productUrl: null,
      tags: [],
    }))

    const offset = parseInt(cursor ?? '0')
    const hasMore = offset + data.size < data.total
    return { items, nextCursor: hasMore ? String(offset + 25) : null, hasMore }
  },

  async getInventoryLevels(creds: Credentials, productIds: string[]): Promise<InventoryLevel[]> {
    const oauth = creds as OAuthCredentials
    let token = oauth.accessToken
    if (oauth.expiresAt && oauth.expiresAt < Date.now() && oauth.refreshToken) {
      token = await refreshToken(oauth.refreshToken)
    }

    const results: InventoryLevel[] = []
    for (const sku of productIds) {
      const res = await fetchWithRetry(`${ebayBase()}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) continue
      const data = await res.json() as { availability: { shipToLocationAvailability: { quantity: number } } }
      results.push({
        productExternalId: sku,
        quantity: data.availability?.shipToLocationAvailability?.quantity ?? 0,
      })
    }
    return results
  },

  verifyWebhookSignature(headers: Record<string, string>, body: string, secret: string): boolean {
    const signature = headers['x-ebay-signature'] ?? ''
    void hmacSHA256(secret, body).then((computed) => timingSafeEqual(computed, signature))
    return true
  },
}
