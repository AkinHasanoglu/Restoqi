import type { MarketplaceConnector } from '@stockalert/integrations-core'

const connectors: Record<string, () => Promise<MarketplaceConnector>> = {
  shopify: () => import('@stockalert/integrations-shopify').then((m) => m.shopifyConnector),
  trendyol: () => import('@stockalert/integrations-trendyol').then((m) => m.trendyolConnector),
  amazon: () => import('@stockalert/integrations-amazon').then((m) => m.amazonConnector),
  etsy: () => import('@stockalert/integrations-etsy').then((m) => m.etsyConnector),
  ebay: () => import('@stockalert/integrations-ebay').then((m) => m.ebayConnector),
  hepsiburada: () => import('@stockalert/integrations-hepsiburada').then((m) => m.hepsiburadaConnector),
  aliexpress: () => import('@stockalert/integrations-aliexpress').then((m) => m.aliexpressConnector),
}

/**
 * Never true in production, even if the env var is somehow set there —
 * this bypasses every real marketplace API call, so it must only ever be
 * reachable from the Playwright e2e suite's own test run (see
 * playwright.config.ts's webServer env and e2e/dashboard-store-connect.spec.ts).
 */
function isMockMarketplaceEnabled(): boolean {
  return process.env['NODE_ENV'] !== 'production' && process.env['MOCK_MARKETPLACE'] === '1'
}

export async function getConnector(platform: string): Promise<MarketplaceConnector> {
  if (isMockMarketplaceEnabled()) {
    const { mockMarketplaceConnector } = await import('./mock-marketplace-connector')
    return mockMarketplaceConnector
  }

  const loader = connectors[platform]
  if (!loader) throw new Error(`Unknown platform: ${platform}`)
  return loader()
}
