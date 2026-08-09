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

export async function getConnector(platform: string): Promise<MarketplaceConnector> {
  const loader = connectors[platform]
  if (!loader) throw new Error(`Unknown platform: ${platform}`)
  return loader()
}
