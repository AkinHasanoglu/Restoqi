import type { MarketplaceConnector } from './types'

export type { MarketplaceConnector }

// Full list of supported platforms. The actual loader lives in the dashboard
// to avoid a circular dependency (connectors → core → connectors).
export const SUPPORTED_PLATFORMS = [
  'shopify',
  'trendyol',
  'amazon',
  'etsy',
  'ebay',
  'hepsiburada',
  'aliexpress',
] as const
