import { z } from 'zod'

export const ProductSchema = z.object({
  externalId: z.string(),
  title: z.string(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  productUrl: z.string().url().nullable().optional(),
  tags: z.array(z.string()).default([]),
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

export type OAuthCredentials = {
  type: 'oauth'
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  shop?: string
}

export type ApiKeyCredentials = {
  type: 'apiKey'
  apiKey: string
  apiSecret?: string
  merchantId?: string
  supplierId?: string
}

export type Credentials = OAuthCredentials | ApiKeyCredentials

export interface WebhookTopic {
  topic: string
  address: string
}

export interface MarketplaceConnector {
  platform: string
  connect(params: Record<string, string>): Promise<Credentials>
  getAuthUrl?(state: string, redirectUri: string, extra?: Record<string, string>): string
  refreshCredentials?(creds: OAuthCredentials): Promise<OAuthCredentials>
  listProducts(creds: Credentials, cursor?: string): Promise<Page<Product>>
  getInventoryLevels(creds: Credentials, productIds: string[]): Promise<InventoryLevel[]>
  registerWebhook?(creds: Credentials, topic: WebhookTopic): Promise<void>
  verifyWebhookSignature(headers: Record<string, string>, body: string, secret: string): boolean
}
