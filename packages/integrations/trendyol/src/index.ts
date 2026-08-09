import type { MarketplaceConnector, Credentials, ApiKeyCredentials, Page, Product, InventoryLevel } from '@stockalert/integrations-core'
import { fetchWithRetry, buildQuery, timingSafeEqual } from '@stockalert/integrations-core'

function basicAuth(apiKey: string, apiSecret: string) {
  return 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
}

function trendyolHeaders(creds: ApiKeyCredentials) {
  return {
    Authorization: basicAuth(creds.apiKey, creds.apiSecret ?? ''),
    'Content-Type': 'application/json',
    'User-Agent': `StockAlert - SelfIntegration`,
  }
}

export const trendyolConnector: MarketplaceConnector = {
  platform: 'trendyol',

  async connect(params: Record<string, string>): Promise<Credentials> {
    const { apiKey, apiSecret, supplierId } = params
    if (!apiKey || !apiSecret || !supplierId) throw new Error('Trendyol requires apiKey, apiSecret and supplierId')
    // Verify credentials by fetching supplier info
    const res = await fetchWithRetry(
      `https://api.trendyol.com/sapigw/suppliers/${supplierId}`,
      { headers: trendyolHeaders({ type: 'apiKey', apiKey, apiSecret, supplierId }) }
    )
    if (!res.ok) throw new Error('Invalid Trendyol credentials')
    return { type: 'apiKey', apiKey, apiSecret, supplierId }
  },

  async listProducts(creds: Credentials, cursor?: string): Promise<Page<Product>> {
    const { apiKey, apiSecret, supplierId } = creds as ApiKeyCredentials
    const page = cursor ? parseInt(cursor) : 0
    const params = buildQuery({ page, size: 50, approved: 'true' })
    const res = await fetchWithRetry(
      `https://api.trendyol.com/sapigw/suppliers/${supplierId}/products?${params}`,
      { headers: trendyolHeaders({ type: 'apiKey', apiKey, apiSecret, supplierId }) }
    )
    if (!res.ok) throw new Error(`Trendyol products error: ${res.status}`)
    const data = await res.json() as {
      content: Array<{
        barcode: string; title: string; images: Array<{ url: string }>
        stockCode: string; productUrl: string
      }>
      totalPages: number; page: number
    }

    const items: Product[] = data.content.map((p) => ({
      externalId: p.barcode,
      title: p.title,
      sku: p.stockCode,
      barcode: p.barcode,
      imageUrl: p.images[0]?.url ?? null,
      productUrl: p.productUrl,
      tags: [],
    }))

    const hasMore = data.page < data.totalPages - 1
    return { items, nextCursor: hasMore ? String(data.page + 1) : null, hasMore }
  },

  async getInventoryLevels(creds: Credentials, productIds: string[]): Promise<InventoryLevel[]> {
    const { apiKey, apiSecret, supplierId } = creds as ApiKeyCredentials
    const params = buildQuery({ barcode: productIds.join(',') })
    const res = await fetchWithRetry(
      `https://api.trendyol.com/sapigw/suppliers/${supplierId}/products?${params}`,
      { headers: trendyolHeaders({ type: 'apiKey', apiKey, apiSecret, supplierId }) }
    )
    if (!res.ok) return []
    const data = await res.json() as { content: Array<{ barcode: string; quantity: number }> }
    return data.content.map((p) => ({
      productExternalId: p.barcode,
      quantity: p.quantity ?? 0,
    }))
  },

  verifyWebhookSignature(_headers: Record<string, string>, _body: string, _secret: string): boolean {
    // Trendyol uses IP allowlisting, not HMAC
    return true
  },
}
