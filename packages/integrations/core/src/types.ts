import { z } from 'zod'

export const ProductVariantSchema = z.object({
  externalId: z.string(),
  title: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
})

export type ProductVariant = z.infer<typeof ProductVariantSchema>

export const ProductSchema = z.object({
  externalId: z.string(),
  title: z.string(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  productUrl: z.string().url().nullable().optional(),
  tags: z.array(z.string()).default([]),
  // Populated by connectors that can cheaply return full variant listings
  // in the same listProducts call (currently Shopify). Optional rather
  // than defaulted so the other six connectors' existing object literals
  // don't all need a `variants: []` — omission means "no variant data",
  // handled the same as an empty array downstream.
  variants: z.array(ProductVariantSchema).optional(),
})

export type Product = z.infer<typeof ProductSchema>

export const InventoryLevelSchema = z.object({
  productExternalId: z.string(),
  variantExternalId: z.string().optional(),
  quantity: z.number().int(),
  locationId: z.string().optional(),
  locationName: z.string().optional(),
})

export type InventoryLevel = z.infer<typeof InventoryLevelSchema>

export const PageSchema = z.object({
  items: z.array(z.unknown()),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean(),
})

export interface Page<T> {
  items: T[]
  nextCursor?: string | null
  hasMore: boolean
}

export const OAuthCredentialsSchema = z.object({
  type: z.literal('oauth'),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number().optional(),
  shop: z.string().optional(),
})
export type OAuthCredentials = z.infer<typeof OAuthCredentialsSchema>

export const ApiKeyCredentialsSchema = z.object({
  type: z.literal('apiKey'),
  apiKey: z.string(),
  apiSecret: z.string().optional(),
  merchantId: z.string().optional(),
  supplierId: z.string().optional(),
})
export type ApiKeyCredentials = z.infer<typeof ApiKeyCredentialsSchema>

export const CredentialsSchema = z.union([OAuthCredentialsSchema, ApiKeyCredentialsSchema])
export type Credentials = z.infer<typeof CredentialsSchema>

export interface WebhookTopic {
  topic: string
  address: string
}

export interface WebhookVerifyInput {
  headers: Record<string, string>
  rawBody: string
  /** Per-store secret (store_secrets.webhook_secret), where the platform uses one. */
  secret: string
  /** Full inbound URL — eBay's challenge hash and some signature schemes bind to it. */
  url: string
  /** First hop of the caller's IP, for platforms (Trendyol) that rely on IP allowlisting. */
  ip: string
  query: Record<string, string>
}

export interface WebhookChallengeInput {
  url: string
  query: Record<string, string>
}

export interface WebhookChallengeResponse {
  status: number
  body: string
  contentType: string
}

export interface MarketplaceConnector {
  platform: string
  connect(params: Record<string, string>): Promise<Credentials>
  getAuthUrl?(state: string, redirectUri: string, extra?: Record<string, string>): string
  refreshCredentials?(creds: OAuthCredentials): Promise<OAuthCredentials>
  listProducts(creds: Credentials, cursor?: string): Promise<Page<Product>>
  getInventoryLevels(creds: Credentials, productIds: string[]): Promise<InventoryLevel[]>
  registerWebhook?(creds: Credentials, topic: WebhookTopic): Promise<void>
  /** false = poll-only; the webhook route responds 405 for this platform. */
  supportsPush: boolean
  verifyWebhookSignature(input: WebhookVerifyInput): Promise<boolean>
  /** Handles a platform's GET verification handshake (eBay, Amazon SNS subscription confirm). */
  verifyChallenge?(input: WebhookChallengeInput): Promise<WebhookChallengeResponse | null>
}
