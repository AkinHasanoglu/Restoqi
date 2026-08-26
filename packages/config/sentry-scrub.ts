/**
 * Shared by every Sentry config in both apps (dashboard: client/edge/
 * server, landing: client/edge/server). Previously only
 * apps/dashboard/sentry.server.config.ts had this — the other five
 * configs sent events unscrubbed, meaning a caught error carrying a
 * connector's request context, an OAuth token, or a webhook secret in its
 * `message`/`extra`/`contexts` would reach Sentry verbatim from the edge
 * runtime (middleware, auth) or the client (browser-side errors). Pure JS
 * (no Node builtins) so it works in the edge runtime too.
 */
const REDACTED_KEYS = [
  'accessToken', 'refreshToken', 'apiSecret', 'apiKey', 'encrypted_creds',
  'encrypted_key', 'webhook_secret', 'password', 'authorization', 'cookie',
]

export function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value)) {
      out[key] = REDACTED_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()))
        ? '[Redacted]'
        : scrub(v)
    }
    return out
  }
  return value
}
