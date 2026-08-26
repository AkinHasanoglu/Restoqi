import type { MarketplaceConnector, Credentials, ApiKeyCredentials, Page, Product, InventoryLevel } from '@stockalert/integrations-core'
import { fetchWithRetry, buildQuery } from '@stockalert/integrations-core'

const BASE = 'https://listing-external.hepsiburada.com'
const MPO_BASE = 'https://mpop.hepsiburada.com'

function hbHeaders(apiKey: string, merchantId: string) {
  return {
    Authorization: `Basic ${Buffer.from(`${merchantId}:${apiKey}`).toString('base64')}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

export const hepsiburadaConnector: MarketplaceConnector = {
  platform: 'hepsiburada',

  async connect(params: Record<string, string>): Promise<Credentials> {
    const { apiKey, merchantId } = params
    if (!apiKey || !merchantId) throw new Error('Hepsiburada requires apiKey and merchantId')
    // Verify credentials
    const res = await fetchWithRetry(
      `${MPO_BASE}/api/product/listing-product?merchantId=${merchantId}&limit=1`,
      { headers: hbHeaders(apiKey, merchantId) }
    )
    if (!res.ok) throw new Error('Invalid Hepsiburada credentials')
    return { type: 'apiKey', apiKey, merchantId }
  },

  async listProducts(creds: Credentials, cursor?: string): Promise<Page<Product>> {
    const { apiKey, merchantId } = creds as ApiKeyCredentials
    const offset = cursor ? parseInt(cursor) : 0
    const params = buildQuery({ merchantId, limit: 50, offset })
    const res = await fetchWithRetry(
      `${MPO_BASE}/api/product/listing-product?${params}`,
      { headers: hbHeaders(apiKey, merchantId ?? '') }
    )
    if (!res.ok) throw new Error(`Hepsiburada products error: ${res.status}`)
    const data = await res.json() as {
      data: Array<{
        hbSku: string; merchantSku: string; name: string
        images: Array<{ url: string }>; productDetailUrl: string
      }>
      totalCount: number
    }

    const items: Product[] = data.data.map((p) => ({
      externalId: p.hbSku,
      title: p.name,
      sku: p.merchantSku,
      barcode: null,
      imageUrl: p.images[0]?.url ?? null,
      productUrl: p.productDetailUrl,
      tags: [],
    }))

    const hasMore = offset + 50 < data.totalCount
    return { items, nextCursor: hasMore ? String(offset + 50) : null, hasMore }
  },

  async getInventoryLevels(creds: Credentials, productIds: string[]): Promise<InventoryLevel[]> {
    const { apiKey, merchantId } = creds as ApiKeyCredentials
    const results: InventoryLevel[] = []
    // Hepsiburada supports batch listing stock check
    const params = buildQuery({ merchantId, sku: productIds.join(',') })
    const res = await fetchWithRetry(
      `${BASE}/listings/merchantlisting/v2?${params}`,
      { headers: hbHeaders(apiKey, merchantId ?? '') }
    )
    if (!res.ok) return results
    const data = await res.json() as { listing: Array<{ merchantSku: string; availableStock: number }> }
    return (data.listing ?? []).map((l) => ({
      productExternalId: l.merchantSku,
      quantity: l.availableStock ?? 0,
    }))
  },

  // No public stock-change webhook product exists for Hepsiburada — poll-only.
  supportsPush: false,
  async verifyWebhookSignature(): Promise<boolean> {
    return false
  },
}
