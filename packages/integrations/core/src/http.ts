export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  shouldRetry?: (status: number) => boolean
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * SSRF guard for outbound requests whose destination is at least partly
 * user-supplied (notification webhook/Slack URLs, a marketplace shop
 * domain). Rejects:
 *  - non-https schemes (also blocks `file:`, `gopher:`, etc.)
 *  - hostnames that resolve to a private/loopback/link-local/multicast
 *    address, including the cloud metadata endpoint (169.254.169.254)
 *
 * Residual limitation: this checks DNS *before* the actual fetch, which
 * still does its own resolution — a DNS-rebinding attacker who changes
 * the record between the two lookups isn't caught here. Combined with
 * `redirect: 'error'` in safeFetch (a malicious server can't 302 the
 * request to an internal address after passing this check), this is a
 * practical mitigation, not a complete one; full protection needs a
 * pinned-resolver fetch dispatcher, which is out of scope for this pass.
 */
export async function assertSafeUrl(rawUrl: string): Promise<void> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL')
  }

  if (url.protocol !== 'https:') {
    throw new Error('Only https:// URLs are allowed')
  }

  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.local')) {
    throw new Error('URL host is not allowed')
  }

  const { lookup } = await import('node:dns/promises')
  let addresses: Array<{ address: string; family: number }>
  try {
    addresses = await lookup(hostname, { all: true })
  } catch {
    throw new Error('Could not resolve URL host')
  }

  for (const { address, family } of addresses) {
    if (isPrivateOrReservedAddress(address, family)) {
      throw new Error('URL host resolves to a private/reserved address')
    }
  }
}

function isPrivateOrReservedAddress(address: string, family: number): boolean {
  if (family === 4) {
    const octets = address.split('.').map(Number)
    const [a, b] = octets
    if (a === undefined || b === undefined) return true
    if (a === 127) return true // loopback
    if (a === 10) return true // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
    if (a === 192 && b === 168) return true // 192.168.0.0/16
    if (a === 169 && b === 254) return true // link-local incl. cloud metadata
    if (a === 0) return true // 0.0.0.0/8
    return false
  }
  // IPv6
  const lower = address.toLowerCase()
  if (lower === '::1') return true // loopback
  if (lower.startsWith('fe80:')) return true // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // unique local fc00::/7
  if (lower.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 — re-check the embedded IPv4 address
    return isPrivateOrReservedAddress(lower.replace('::ffff:', ''), 4)
  }
  return false
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const { maxRetries = 3, baseDelayMs = 500, shouldRetry = (s) => s === 429 || s >= 500 } = options

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init)

      if (!shouldRetry(response.status) || attempt === maxRetries) {
        return response
      }

      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 100
      const retryAfter = response.headers.get('Retry-After')
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : delay

      await sleep(waitMs)
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (attempt === maxRetries) break
      await sleep(baseDelayMs * Math.pow(2, attempt))
    }
  }

  throw lastError ?? new Error('Request failed after retries')
}

/**
 * For destinations that are at least partly user-supplied (notification
 * channel URLs). Validates the URL with assertSafeUrl, then fetches with
 * redirects disabled — a redirect response is treated as a failure rather
 * than followed, since a malicious/compromised endpoint could otherwise
 * 302 the request to an internal address after passing the DNS check.
 * Marketplace API calls (Shopify, Trendyol, etc.) use fetchWithRetry
 * directly — their hosts are validated at the connector layer instead
 * (e.g. Shopify's shop-domain allowlist), not here.
 */
export async function safeFetch(url: string, init: RequestInit, options: RetryOptions = {}): Promise<Response> {
  await assertSafeUrl(url)
  return fetchWithRetry(url, { ...init, redirect: 'error' }, options)
}

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) q.set(k, String(v))
  }
  return q.toString()
}

import { createHmac, timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto'

/**
 * Synchronous — this package is Node-only (webhook routes declare
 * `export const runtime = 'nodejs'`), so the async `import('node:crypto')`
 * indirection this used to have was pointless ceremony, not Edge support.
 */
export function hmacSHA256(key: string, data: string, encoding: 'hex' | 'base64' = 'hex'): string {
  return createHmac('sha256', key).update(data).digest(encoding)
}

/**
 * Constant-time comparison for two digests of the same expected encoding
 * (both hex, or both base64 — mixing encodings here is a caller bug, not
 * something this function can meaningfully protect against). Length is
 * checked first — for a fixed-size digest, length alone is not secret.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return nodeTimingSafeEqual(bufA, bufB)
}
