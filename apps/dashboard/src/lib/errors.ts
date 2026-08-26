/**
 * Server actions and API routes must never return a raw caught error's
 * `.message` straight to the client — it can carry a PostgREST/Postgres
 * error (constraint names, column names), a connector's raw HTTP response
 * body, or other internal detail an attacker can use to map the schema or
 * probe for misconfiguration (pre-launch security audit finding). This
 * logs the real error server-side (where it's actually useful) and
 * returns a stable, safe string for the client-facing ActionResult.
 *
 * Deliberately does NOT special-case zod's SafeParseError — every call
 * site already handles `parsed.success === false` separately, before
 * ever reaching a try/catch that would route through this helper, so
 * user-facing validation messages are untouched.
 */
export function toClientError(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  console.error('[action]', e)
  return fallback
}
