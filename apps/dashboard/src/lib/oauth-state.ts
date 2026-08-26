import { timingSafeEqual } from 'node:crypto'

/**
 * Shared between api/integrations/oauth-start (sets the cookie) and
 * api/auth/oauth-callback (verifies it). Not defined inside either
 * route.ts file: Next.js route handlers may only export the HTTP method
 * functions plus a small fixed set of config values — an arbitrary named
 * export like this one would fail the route file's type contract.
 */
export function stateCookieName(platform: string): string {
  return `oauth_state_${platform}`
}

/** Constant-time compare — the OAuth state is a bearer-style anti-CSRF token, not just a UI nicety. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length || bufA.length === 0) return false
  return timingSafeEqual(bufA, bufB)
}
