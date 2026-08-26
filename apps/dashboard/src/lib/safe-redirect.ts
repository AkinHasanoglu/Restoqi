/**
 * Shared by api/auth/callback (OAuth `next` query param) and actions/auth.ts's
 * loginAction (`redirectTo` form field) — both accept a post-login
 * destination from the client, which makes them open-redirect surfaces if
 * trusted verbatim: `?redirectTo=https://evil.tld` or `?redirectTo=//evil.tld`
 * would send a just-authenticated user off-domain to a phishing page that
 * looks like it came from our own redirect. Only an internal path
 * (`/overview`, not an absolute or protocol-relative URL) is a valid target —
 * a single leading slash not followed by another slash or backslash is the
 * only shape accepted. See 3rd security audit item 69.
 */
export function sanitizeNextPath(next: string | null | undefined, fallback: string): string {
  if (next && /^\/(?!\/|\\)/.test(next)) return next
  return fallback
}
