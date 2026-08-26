import { createHmac, timingSafeEqual } from 'node:crypto'

// Reuses WORKER_SECRET as the HMAC key rather than adding a dedicated env
// var — it's already a required-in-production, min-16-char server-only
// secret (see env/index.ts), and this codebase already dual-purposes a
// secret for a second, unrelated signing job elsewhere (SHOPIFY_CLIENT_SECRET
// also signs inbound webhooks — see .env.example). The dev fallback below
// only matters for local/CI runs where WORKER_SECRET is unset.
const DEV_FALLBACK_SECRET = 'dev-only-unsubscribe-secret-not-for-production-use'

function getSecret(): string {
  return process.env['WORKER_SECRET'] || DEV_FALLBACK_SECRET
}

function sign(teamId: string): string {
  return createHmac('sha256', getSecret()).update(teamId).digest('base64url')
}

/** Builds the no-login unsubscribe link's token for a given team — see api/unsubscribe/route.ts. */
export function signUnsubscribeToken(teamId: string): string {
  return `${teamId}.${sign(teamId)}`
}

/** Verifies a token from api/unsubscribe's `?token=` query param. Returns the team id, or null if invalid/tampered. */
export function verifyUnsubscribeToken(token: string): string | null {
  const [teamId, signature] = token.split('.')
  if (!teamId || !signature) return null

  const expected = sign(teamId)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  return teamId
}
