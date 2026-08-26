import type { MarketplaceConnector, Credentials, OAuthCredentials, Page, Product, InventoryLevel, WebhookVerifyInput } from '@stockalert/integrations-core'
import { fetchWithRetry, buildQuery, timingSafeEqual, requireEnv, requireParam } from '@stockalert/integrations-core'
import * as crypto from 'node:crypto'

const GATEWAY = 'https://eco.taobao.com/router/rest'

function sign(params: Record<string, string>, appSecret: string): string {
  const sorted = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join('')
  return crypto.createHmac('md5', appSecret).update(sorted).digest('hex').toUpperCase()
}

function buildAliParams(method: string, token: string, appKey: string, extra: Record<string, string> = {}): Record<string, string> {
  const base: Record<string, string> = {
    method,
    app_key: appKey,
    session: token,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    format: 'json',
    v: '2.0',
    sign_method: 'hmac_md5',
    ...extra,
  }
  return base
}

export const aliexpressConnector: MarketplaceConnector = {
  platform: 'aliexpress',

  getAuthUrl(state: string, redirectUri: string, _extra?: Record<string, string>): string {
    const appKey = requireEnv('ALIEXPRESS_APP_KEY')
    const params = buildQuery({ response_type: 'code', force_auth: 'true', redirect_uri: redirectUri, client_id: appKey, state })
    return `https://oauth.aliexpress.com/authorize?${params}`
  },

  async connect(params: Record<string, string>): Promise<Credentials> {
    const code = requireParam(params, 'code', 'AliExpress')
    const appKey = requireEnv('ALIEXPRESS_APP_KEY')
    const appSecret = requireEnv('ALIEXPRESS_APP_SECRET')
    const callParams: Record<string, string> = {
      method: 'alibaba.oauth.token',
      app_key: appKey,
      code,
      grant_type: 'authorization_code',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      format: 'json',
      v: '2.0',
      sign_method: 'hmac_md5',
    }
    callParams['sign'] = sign(callParams, appSecret)
    const qs = new URLSearchParams(callParams).toString()
    const res = await fetchWithRetry(`${GATEWAY}?${qs}`, { method: 'GET' })
    if (!res.ok) throw new Error('AliExpress OAuth exchange failed')
    const data = await res.json() as { alibaba_oauth_token_get_response: { result: { access_token: string; refresh_token: string; expire_time: number } } }
    const result = data.alibaba_oauth_token_get_response?.result
    return {
      type: 'oauth',
      accessToken: result?.access_token ?? '',
      refreshToken: result?.refresh_token,
      expiresAt: result?.expire_time ?? 0,
    }
  },

  async listProducts(creds: Credentials, cursor?: string): Promise<Page<Product>> {
    const { accessToken } = creds as OAuthCredentials
    const appKey = process.env['ALIEXPRESS_APP_KEY'] ?? ''
    const appSecret = process.env['ALIEXPRESS_APP_SECRET'] ?? ''
    const page = cursor ? parseInt(cursor) : 1
    const callParams = buildAliParams('aliexpress.solution.product.list.get', accessToken, appKey, {
      current_page: String(page),
      page_size: '20',
    })
    callParams['sign'] = sign(callParams, appSecret)
    const qs = new URLSearchParams(callParams).toString()
    const res = await fetchWithRetry(`${GATEWAY}?${qs}`, { method: 'GET' })
    if (!res.ok) throw new Error(`AliExpress products error: ${res.status}`)
    const data = await res.json() as {
      aliexpress_solution_product_list_get_response: {
        result: {
          aeop_a_e_product_display_d_t_o_list: {
            item_display_dto: Array<{
              product_id: number; subject: string; image_u_r_ls: string; product_detail_url: string
            }>
          }
          total_count: number
        }
      }
    }
    const result = data.aliexpress_solution_product_list_get_response?.result
    const products = result?.aeop_a_e_product_display_d_t_o_list?.item_display_dto ?? []
    const total = result?.total_count ?? 0

    const items: Product[] = products.map((p) => ({
      externalId: String(p.product_id),
      title: p.subject,
      sku: null,
      barcode: null,
      imageUrl: p.image_u_r_ls?.split(';')[0] ?? null,
      productUrl: p.product_detail_url,
      tags: [],
    }))

    const hasMore = page * 20 < total
    return { items, nextCursor: hasMore ? String(page + 1) : null, hasMore }
  },

  async getInventoryLevels(creds: Credentials, productIds: string[]): Promise<InventoryLevel[]> {
    const { accessToken } = creds as OAuthCredentials
    const appKey = process.env['ALIEXPRESS_APP_KEY'] ?? ''
    const appSecret = process.env['ALIEXPRESS_APP_SECRET'] ?? ''
    const results: InventoryLevel[] = []

    for (const productId of productIds) {
      const callParams = buildAliParams('aliexpress.solution.product.info.get', accessToken, appKey, { product_id: productId })
      callParams['sign'] = sign(callParams, appSecret)
      const qs = new URLSearchParams(callParams).toString()
      const res = await fetchWithRetry(`${GATEWAY}?${qs}`, { method: 'GET' })
      if (!res.ok) continue
      const data = await res.json() as {
        aliexpress_solution_product_info_get_response: {
          result: {
            aeop_a_e_product_s_k_us: {
              global_aeop_ae_product_s_k_u: Array<{ sku_stock: number }>
            }
          }
        }
      }
      const skus = data.aliexpress_solution_product_info_get_response?.result?.aeop_a_e_product_s_k_us?.global_aeop_ae_product_s_k_u ?? []
      const quantity = skus.reduce((sum, sku) => sum + (sku.sku_stock ?? 0), 0)
      results.push({ productExternalId: productId, quantity })
    }
    return results
  },

  supportsPush: true,

  // AliExpress message-push payloads are signed with the same
  // sign_method scheme used for outbound API calls — recompute over the
  // sorted params (minus `sign` itself) and compare.
  async verifyWebhookSignature({ rawBody }: WebhookVerifyInput): Promise<boolean> {
    let payload: Record<string, string>
    try {
      payload = JSON.parse(rawBody) as Record<string, string>
    } catch {
      return false
    }

    const { sign: providedSign, ...params } = payload
    if (!providedSign) return false

    const appSecret = requireEnv('ALIEXPRESS_APP_SECRET')
    const computed = sign(params, appSecret)
    return timingSafeEqual(computed, providedSign.toUpperCase())
  },
}
