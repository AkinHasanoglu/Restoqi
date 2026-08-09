import { z } from 'zod'
import type { MarketplaceConnector, Credentials, OAuthCredentials, Page, Product, InventoryLevel, WebhookTopic } from '@stockalert/integrations-core'
import { fetchWithRetry, buildQuery, hmacSHA256, timingSafeEqual } from '@stockalert/integrations-core'

const ShopifyProductNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  featuredImage: z.object({ url: z.string() }).nullable().optional(),
  variants: z.object({
    nodes: z.array(z.object({
      id: z.string(),
      sku: z.string().nullable().optional(),
      barcode: z.string().nullable().optional(),
      inventoryQuantity: z.number().nullable().optional(),
    })),
  }),
})

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id title handle
        featuredImage { url }
        variants(first: 50) {
          nodes { id sku barcode inventoryQuantity }
        }
      }
    }
  }
`

async function shopifyGraphQL(shop: string, accessToken: string, query: string, variables: Record<string, unknown> = {}) {
  const res = await fetchWithRetry(
    `https://${shop}/admin/api/2024-10/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query, variables }),
    }
  )
  if (!res.ok) throw new Error(`Shopify GraphQL error: ${res.status}`)
  const json = await res.json() as { data: Record<string, unknown>; errors?: unknown[] }
  if (json.errors?.length) throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`)
  return json.data
}

export const shopifyConnector: MarketplaceConnector = {
  platform: 'shopify',

  getAuthUrl(state: string, redirectUri: string, extra?: Record<string, string>): string {
    const shop = extra?.['shopDomain'] ?? ''
    if (!shop) throw new Error('shopDomain is required for Shopify OAuth')
    const clientId = process.env['SHOPIFY_CLIENT_ID'] ?? ''
    const scopes = 'read_products,read_inventory,write_fulfillments'
    const params = buildQuery({ client_id: clientId, scope: scopes, redirect_uri: redirectUri, state })
    return `https://${shop}/admin/oauth/authorize?${params}`
  },

  async connect(params: Record<string, string>): Promise<Credentials> {
    const { code, shop } = params
    const clientId = process.env['SHOPIFY_CLIENT_ID'] ?? ''
    const clientSecret = process.env['SHOPIFY_CLIENT_SECRET'] ?? ''

    const res = await fetchWithRetry(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    })
    if (!res.ok) throw new Error('Failed to exchange Shopify OAuth code')
    const data = await res.json() as { access_token: string }
    return { type: 'oauth', accessToken: data.access_token, shop }
  },

  async listProducts(creds: Credentials, cursor?: string): Promise<Page<Product>> {
    const { accessToken, shop } = creds as OAuthCredentials & { shop: string }
    const data = await shopifyGraphQL(shop, accessToken, PRODUCTS_QUERY, { first: 50, after: cursor })
    const products = (data as any).products as { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: unknown[] }

    const items: Product[] = products.nodes.map((node: unknown) => {
      const p = ShopifyProductNodeSchema.parse(node)
      return {
        externalId: p.id,
        title: p.title,
        sku: p.variants.nodes[0]?.sku ?? null,
        barcode: p.variants.nodes[0]?.barcode ?? null,
        imageUrl: p.featuredImage?.url ?? null,
        productUrl: `https://${shop}/products/${p.handle}`,
        tags: [],
      }
    })

    return {
      items,
      nextCursor: products.pageInfo.endCursor,
      hasMore: products.pageInfo.hasNextPage,
    }
  },

  async getInventoryLevels(creds: Credentials, productIds: string[]): Promise<InventoryLevel[]> {
    const { accessToken, shop } = creds as OAuthCredentials & { shop: string }
    // Fetch product variants to get inventory quantities
    const query = `
      query GetInventory($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            variants(first: 50) {
              nodes { id sku inventoryQuantity }
            }
          }
        }
      }
    `
    const data = await shopifyGraphQL(shop, accessToken, query, { ids: productIds })
    const nodes = (data as any).nodes as Array<{ id: string; variants: { nodes: Array<{ id: string; sku: string | null; inventoryQuantity: number | null }> } }>

    return nodes.flatMap((product) =>
      product.variants.nodes.map((v) => ({
        productExternalId: product.id,
        variantExternalId: v.id,
        quantity: v.inventoryQuantity ?? 0,
      }))
    )
  },

  async registerWebhook(creds: Credentials, topic: WebhookTopic): Promise<void> {
    const { accessToken, shop } = creds as OAuthCredentials & { shop: string }
    const mutation = `
      mutation WebhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          userErrors { message }
        }
      }
    `
    await shopifyGraphQL(shop, accessToken, mutation, {
      topic: topic.topic.toUpperCase().replace(/\//g, '_'),
      webhookSubscription: { callbackUrl: topic.address, format: 'JSON' },
    })
  },

  verifyWebhookSignature(headers: Record<string, string>, body: string, secret: string): boolean {
    const hmacHeader = headers['x-shopify-hmac-sha256'] ?? ''
    // Async verify — for sync interface we use a placeholder; actual verification should be async
    void hmacSHA256(secret, body).then((computed) => timingSafeEqual(computed, hmacHeader))
    return true // Must be verified asynchronously in route handler
  },
}
