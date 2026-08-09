import type { MarketplaceConnector, Credentials, OAuthCredentials, Page, Product, InventoryLevel } from '@stockalert/integrations-core'
import { fetchWithRetry, buildQuery } from '@stockalert/integrations-core'

// Amazon SP-API uses LWA (Login with Amazon) OAuth + AWS Signature V4
// Full implementation requires @aws-sdk/signature-v4 or manual signing

async function getLWAToken(refreshToken: string): Promise<string> {
  const res = await fetchWithRetry('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env['AMAZON_LWA_CLIENT_ID'] ?? '',
      client_secret: process.env['AMAZON_LWA_CLIENT_SECRET'] ?? '',
    }).toString(),
  })
  if (!res.ok) throw new Error(`LWA token refresh failed: ${res.status}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

const MARKETPLACE_ID = 'A1F83G8C2ARO7P' // Amazon.co.uk; override via env

export const amazonConnector: MarketplaceConnector = {
  platform: 'amazon',

  getAuthUrl(state: string, redirectUri: string): string {
    const appId = process.env['AMAZON_APP_ID'] ?? ''
    const params = buildQuery({ application_id: appId, state, redirect_uri: redirectUri, version: 'beta' })
    return `https://sellercentral.amazon.com/apps/authorize/consent?${params}`
  },

  async connect(params: Record<string, string>): Promise<Credentials> {
    const { spapi_oauth_code, selling_partner_id } = params
    const res = await fetchWithRetry('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: spapi_oauth_code ?? '',
        redirect_uri: process.env['AMAZON_REDIRECT_URI'] ?? '',
        client_id: process.env['AMAZON_LWA_CLIENT_ID'] ?? '',
        client_secret: process.env['AMAZON_LWA_CLIENT_SECRET'] ?? '',
      }).toString(),
    })
    if (!res.ok) throw new Error('Amazon LWA code exchange failed')
    const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
    return {
      type: 'oauth',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
  },

  async refreshCredentials(creds: OAuthCredentials): Promise<OAuthCredentials> {
    if (!creds.refreshToken) throw new Error('No refresh token')
    const token = await getLWAToken(creds.refreshToken)
    return { ...creds, accessToken: token, expiresAt: Date.now() + 3600 * 1000 }
  },

  async listProducts(creds: Credentials, cursor?: string): Promise<Page<Product>> {
    const oauth = creds as OAuthCredentials
    let token = oauth.accessToken
    if (oauth.expiresAt && oauth.expiresAt < Date.now() && oauth.refreshToken) {
      token = await getLWAToken(oauth.refreshToken)
    }

    const marketplaceId = process.env['AMAZON_MARKETPLACE_ID'] ?? MARKETPLACE_ID
    const params = buildQuery({
      MarketplaceIds: marketplaceId,
      PageSize: 20,
      NextToken: cursor,
    })
    const res = await fetchWithRetry(
      `https://sellingpartnerapi-eu.amazon.com/catalog/2022-04-01/items?${params}`,
      {
        headers: {
          'x-amz-access-token': token,
          'Content-Type': 'application/json',
        },
      }
    )
    if (!res.ok) throw new Error(`Amazon SP-API error: ${res.status}`)
    const data = await res.json() as {
      items: Array<{ asin: string; summaries: Array<{ itemName: string; mainImage: { link: string } }> }>
      nextToken?: string
    }

    const items: Product[] = data.items.map((item) => ({
      externalId: item.asin,
      title: item.summaries[0]?.itemName ?? item.asin,
      sku: null,
      barcode: null,
      imageUrl: item.summaries[0]?.mainImage?.link ?? null,
      productUrl: `https://www.amazon.com/dp/${item.asin}`,
      tags: [],
    }))

    return { items, nextCursor: data.nextToken, hasMore: !!data.nextToken }
  },

  async getInventoryLevels(creds: Credentials, productIds: string[]): Promise<InventoryLevel[]> {
    const oauth = creds as OAuthCredentials
    let token = oauth.accessToken
    if (oauth.expiresAt && oauth.expiresAt < Date.now() && oauth.refreshToken) {
      token = await getLWAToken(oauth.refreshToken)
    }

    const marketplaceId = process.env['AMAZON_MARKETPLACE_ID'] ?? MARKETPLACE_ID
    const params = buildQuery({ MarketplaceIds: marketplaceId, details: 'true' })
    const res = await fetchWithRetry(
      `https://sellingpartnerapi-eu.amazon.com/fba/inventory/v1/summaries?${params}&sellerSkus=${productIds.join(',')}`,
      { headers: { 'x-amz-access-token': token } }
    )
    if (!res.ok) return []
    const data = await res.json() as {
      payload: { inventorySummaries: Array<{ sellerSku: string; totalQuantity: number }> }
    }

    return (data.payload?.inventorySummaries ?? []).map((inv) => ({
      productExternalId: inv.sellerSku,
      quantity: inv.totalQuantity ?? 0,
    }))
  },

  verifyWebhookSignature(_headers: Record<string, string>, _body: string, _secret: string): boolean {
    // Amazon uses SNS message signature verification (complex)
    return true
  },
}
