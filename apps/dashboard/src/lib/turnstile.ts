import { headers } from 'next/headers'

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
}

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Verifies a Turnstile token server-side before an auth Server Action
 * proceeds (actions/auth.ts — login/signup/forgot-password/magic-link).
 * The Trust section on the landing page and the DPA both already claim
 * "Cloudflare Turnstile" bot protection on auth endpoints — this is what
 * makes that claim true; previously TURNSTILE_SECRET_KEY/
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY were declared in env/index.ts and
 * .env.example but never read anywhere (compliance audit rule 07 — FTC
 * unsubstantiated-claims).
 *
 * Fail-open when TURNSTILE_SECRET_KEY isn't configured — same posture as
 * lib/rate-limit.ts's Upstash checks, so local dev and the CI
 * placeholder-env build (which never sets this) aren't blocked. Once a
 * secret is configured, a missing or invalid token fails closed.
 */
export async function verifyTurnstileToken(token: FormDataEntryValue | null): Promise<boolean> {
  const secret = process.env['TURNSTILE_SECRET_KEY']
  if (!secret) return true
  if (typeof token !== 'string' || !token) return false

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim()

  try {
    const body = new URLSearchParams({ secret, response: token })
    if (ip) body.set('remoteip', ip)

    const res = await fetch(VERIFY_URL, { method: 'POST', body })
    if (!res.ok) return false
    const data = (await res.json()) as TurnstileVerifyResponse
    return data.success === true
  } catch (err) {
    console.error('[turnstile] verification request failed', err)
    return false
  }
}
