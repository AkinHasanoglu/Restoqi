import type { MarketplaceConnector, Credentials, Page, Product, InventoryLevel } from '@stockalert/integrations-core'

/**
 * Fixture connector used only when MOCK_MARKETPLACE=1 (see
 * connector-registry.ts) — never calls a real marketplace API. Lets the
 * Playwright e2e suite (store-connect, core-alert-flow) exercise the full
 * connect -> sync -> alert pipeline deterministically, without live
 * Shopify/eBay/etc. credentials.
 */
export const mockMarketplaceConnector: MarketplaceConnector = {
  platform: 'shopify',

  async connect(): Promise<Credentials> {
    return { type: 'oauth', accessToken: 'mock-access-token', shop: 'mock-shop.myshopify.com' }
  },

  async listProducts(): Promise<Page<Product>> {
    const items: Product[] = [
      {
        externalId: 'mock-product-1',
        title: 'Mock Widget',
        sku: 'MOCK-1',
        barcode: null,
        imageUrl: null,
        productUrl: null,
        tags: ['e2e-fixture'],
      },
    ]
    return { items, nextCursor: null, hasMore: false }
  },

  async getInventoryLevels(_creds: Credentials, productIds: string[]): Promise<InventoryLevel[]> {
    // Fixed low quantity so a seeded "absolute <= 5" rule reliably fires
    // in core-alert-flow.spec.ts without depending on real inventory data.
    return productIds.map((productExternalId) => ({ productExternalId, quantity: 3 }))
  },

  supportsPush: true,

  async verifyWebhookSignature(): Promise<boolean> {
    return true
  },
}
