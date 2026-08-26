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

export type PlatformType = (typeof SUPPORTED_PLATFORMS)[number]

export function isSupportedPlatform(value: string): value is PlatformType {
  return (SUPPORTED_PLATFORMS as readonly string[]).includes(value)
}
