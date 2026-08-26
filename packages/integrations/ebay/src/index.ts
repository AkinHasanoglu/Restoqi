import { createHash, createVerify } from 'node:crypto'
import type { MarketplaceConnector, Credentials, OAuthCredentials, Page, Product, InventoryLevel, WebhookVerifyInput, WebhookChallengeInput, WebhookChallengeResponse } from '@stockalert/integrations-core'
import { fetchWithRetry, buildQuery, requireEnv, requireParam } from '@stockalert/integrations-core'

const BASE = 'https://api.ebay.com'
const SANDBOX = 'https://api.sandbox.ebay.com'

function ebayBase() {
  return process.env['EBAY_SANDBOX'] === 'true' ? SANDBOX : BASE
}

// App-level (client_credentials) token, separate from the per-seller user
// OAuth token used elsewhere in this connector — needed to call eBay's
// notification public-key endpoint, which isn't scoped to any one seller.
let appTokenCache: { token: string; expiresAt: number } | null = null

async function getAppToken(): Promise<string> {
  if (appTokenCache && appTokenCache.expiresAt > Date.now()) return appTokenCache.token
  const clientId = requireEnv('EBAY_CLIENT_ID')
  const clientSecret = requireEnv('EBAY_CLIENT_SECRET')
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetchWithRetry(`${ebayBase()}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope',
    }).toString(),
  })
  if (!res.ok) throw new Error(`eBay app token fetch failed: ${res.status}`)
  const data = await res.json() as { access_token: string; expires_in: number }
  appTokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 }
  return appTokenCache.token
}

// Keyed by `kid` from the x-ebay-signature header — eBay rotates signing
// keys, so a single cached key would eventually start rejecting valid
// signatures.
const publicKeyCache = new Map<string, string>()

async function getPublicKeyPem(kid: string): Promise<string> {
  const cached = publicKeyCache.get(kid)
  if (cached) return cached
  const token = await getAppToken()
  const res = await fetchWithRetry(`${ebayBase()}/commerce/notification/v1/public_key/${kid}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`eBay public key fetch failed: ${res.status}`)
  const data = await res.json() as { key: string }
  publicKeyCache.set(kid, data.key)
  return data.key
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = requireEnv('EBAY_CLIENT_ID')
  const clientSecret = requireEnv('EBAY_CLIENT_SECRET')
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
  const data = await res.json() as { access_token: string; expires_in: number }
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}

export const ebayConnector: MarketplaceConnector = {
  platform: 'ebay',

  getAuthUrl(state: string, redirectUri: string, _extra?: Record<string, string>): string {
    const clientId = requireEnv('EBAY_CLIENT_ID')
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
    const code = requireParam(params, 'code', 'eBay')
    const clientId = requireEnv('EBAY_CLIENT_ID')
    const clientSecret = requireEnv('EBAY_CLIENT_SECRET')
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const res = await fetchWithRetry(`${ebayBase()}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: requireEnv('EBAY_REDIRECT_URI'),
      }).toString(),
    })
    if (!res.ok) throw new Error('eBay OAuth exchange failed')
    const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
    return { type: 'oauth', accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + data.expires_in * 1000 }
  },

  // Persisted centrally: sync/route.ts calls refreshCredentials() (below)
  // and writes the result back via updateStoreCredentials() *before*
  // invoking listProducts/getInventoryLevels, so this ad-hoc in-request
  // refresh is a fallback for the rare case a token expires mid-run —
  // its result is intentionally not persisted here.
  async refreshCredentials(creds: OAuthCredentials): Promise<OAuthCredentials> {
    if (!creds.refreshToken) throw new Error('No refresh token')
    const { accessToken, expiresIn } = await refreshAccessToken(creds.refreshToken)
    return { ...creds, accessToken, expiresAt: Date.now() + expiresIn * 1000 }
  },

  async listProducts(creds: Credentials, cursor?: string): Promise<Page<Product>> {
    const oauth = creds as OAuthCredentials
    let token = oauth.accessToken
    if (oauth.expiresAt && oauth.expiresAt < Date.now() && oauth.refreshToken) {
      token = (await refreshAccessToken(oauth.refreshToken)).accessToken
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
      token = (await refreshAccessToken(oauth.refreshToken)).accessToken
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

  supportsPush: true,

  // x-ebay-signature is base64(JSON({alg, kid, signature})) — an ECDSA
  // signature over the raw body, verified against a public key fetched
  // (and cached) from eBay's notification API, keyed by `kid`.
  async verifyWebhookSignature({ headers, rawBody }: WebhookVerifyInput): Promise<boolean> {
    const sigHeader = headers['x-ebay-signature'] ?? ''
    if (!sigHeader) return false

    let sig: { alg: string; kid: string; signature: string }
    try {
      sig = JSON.parse(Buffer.from(sigHeader, 'base64').toString('utf8')) as typeof sig
    } catch {
      return false
    }
    if (!sig.kid || !sig.signature) return false

    try {
      const publicKeyPem = await getPublicKeyPem(sig.kid)
      const verifier = createVerify('SHA256')
      verifier.update(rawBody)
      verifier.end()
      return verifier.verify(publicKeyPem, Buffer.from(sig.signature, 'base64'))
    } catch {
      return false
    }
  },

  // eBay's mandatory GET handshake before it will activate a webhook
  // endpoint (Marketplace Account Deletion notifications in particular —
  // without this, eBay never enables the subscription).
  async verifyChallenge({ url, query }: WebhookChallengeInput): Promise<WebhookChallengeResponse | null> {
    const challengeCode = query['challenge_code']
    if (!challengeCode) return null

    const verificationToken = requireEnv('EBAY_VERIFICATION_TOKEN')
    const hash = createHash('sha256')
    hash.update(challengeCode)
    hash.update(verificationToken)
    hash.update(url)

    return {
      status: 200,
      body: JSON.stringify({ challengeResponse: hash.digest('hex') }),
      contentType: 'application/json',
    }
  },
}
