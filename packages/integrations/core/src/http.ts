export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  shouldRetry?: (status: number) => boolean
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) q.set(k, String(v))
  }
  return q.toString()
}

export function hmacSHA256(key: string, data: string): Promise<string> {
  // Web Crypto API (Edge/Node 18+)
  return import('node:crypto').then(async (crypto) => {
    const hmac = crypto.createHmac('sha256', key)
    hmac.update(data)
    return hmac.digest('hex')
  })
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
