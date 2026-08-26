'use server'

import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createServerSupabaseClient } from '@stockalert/database/server'
import { checkAuthRateLimit } from '../lib/rate-limit'
import { verifyTurnstileToken } from '../lib/turnstile'
import { sanitizeNextPath } from '../lib/safe-redirect'
import { type ActionResult } from '../lib/auth-guard'

const BOT_ERROR = 'bot_check_failed'

// Bumped whenever legal/terms or legal/privacy materially changes (see
// apps/landing's POLICY_VERSION) — stored per-user so a support/legal
// request ("what did they actually agree to?") doesn't depend on
// guessing which version was live on their signup date.
const CURRENT_TERMS_VERSION = '2026-08-25'

// Credential-bearing auth (login/signup/forgot-password/magic-link) used to
// run as client-side `supabase.auth.*()` calls straight from the browser —
// that path never touches our own server, so `checkAuthRateLimit()` (and
// the generic error messages below) had nothing to attach to. Routing them
// through Server Actions instead means the same POST that middleware.ts's
// `isPublicAuthRoute` already rate-limits at the page level now also goes
// through this per-action check, and error messages are fully under our
// control instead of forwarding whatever Supabase's SDK says. See 2nd
// security audit items 5 and 7.

const RATE_LIMITED_ERROR = 'rate_limited'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function loginAction(formData: FormData, locale: string): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { success: false, error: 'invalid_input' }

  if (!(await checkAuthRateLimit())) return { success: false, error: RATE_LIMITED_ERROR }
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response')))) {
    return { success: false, error: BOT_ERROR }
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  // Same message regardless of "no such user" vs "wrong password" — this
  // was already the case before, just kept intact.
  if (error) return { success: false, error: 'invalid_credentials' }

  // redirectTo is client-supplied (query param round-tripped through the
  // login form) — must be sanitized to an internal path before it's ever
  // assigned to window.location.href, or this becomes an open redirect for
  // a just-authenticated user. See lib/safe-redirect.ts.
  const redirectTo = sanitizeNextPath(formData.get('redirectTo') as string | null, `/${locale}/overview`)
  return { success: true, data: { redirectTo } }
}

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(200),
  plan: z.string().max(50).optional(),
  // Checkbox value is the literal string "on" when checked, absent (undefined)
  // otherwise — see packages/ui/src/components/checkbox.tsx's Radix bubble
  // input. z.literal('on') rejects both "unchecked" and any forged non-"on"
  // value the same way. Compliance audit rule 19 (clickwrap acceptance).
  acceptedTerms: z.literal('on'),
})

export async function signupAction(formData: FormData, origin: string, locale: string): Promise<ActionResult> {
  const parsed = SignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('name'),
    plan: formData.get('plan') || undefined,
    acceptedTerms: formData.get('acceptedTerms'),
  })
  if (!parsed.success) {
    // A password under 8 chars is the one case safe to call out specifically
    // — it reveals nothing about whether the email is already registered.
    const tooShort = parsed.error.errors.some((e) => e.path[0] === 'password')
    const termsMissing = parsed.error.errors.some((e) => e.path[0] === 'acceptedTerms')
    return {
      success: false,
      error: tooShort ? 'weak_password' : termsMissing ? 'accept_terms_required' : 'invalid_input',
    }
  }

  if (!(await checkAuthRateLimit())) return { success: false, error: RATE_LIMITED_ERROR }
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response')))) {
    return { success: false, error: BOT_ERROR }
  }

  // Clickwrap evidence (rule 19) — same x-forwarded-for extraction as
  // lib/rate-limit.ts's checkAuthRateLimit, stored on the user record
  // itself via signUp's options.data so "what did this user agree to, and
  // when" survives independently of server logs.
  const h = await headers()
  const acceptIp = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        plan: parsed.data.plan ?? 'starter',
        terms_accepted_at: new Date().toISOString(),
        terms_version: CURRENT_TERMS_VERSION,
        terms_accept_ip: acceptIp,
      },
      emailRedirectTo: `${origin}/${locale}/overview`,
    },
  })

  if (error) {
    // Deliberately collapsed to ONE generic outcome regardless of whether
    // Supabase's real reason was "already registered" (which would leak
    // account existence) or something else — see 2nd security audit item 7.
    // Weak-password is caught by the zod schema above before this ever
    // reaches Supabase, so this branch never needs to special-case it.
    return { success: false, error: 'signup_failed' }
  }

  return { success: true, data: undefined }
}

const ForgotPasswordSchema = z.object({ email: z.string().email() })

/**
 * Always reports success, whether or not the email is registered — the
 * previous client-side version showed `errors.emailNotFound` on failure,
 * which is a direct enumeration oracle. Supabase's own resetPasswordForEmail
 * mostly avoids erroring on unknown emails already, but this makes it
 * unconditional at the app layer too. See 2nd security audit item 7.
 */
export async function forgotPasswordAction(formData: FormData, origin: string, locale: string): Promise<ActionResult> {
  const parsed = ForgotPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { success: false, error: 'invalid_input' }

  if (!(await checkAuthRateLimit())) return { success: false, error: RATE_LIMITED_ERROR }
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response')))) {
    return { success: false, error: BOT_ERROR }
  }

  const supabase = await createServerSupabaseClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/${locale}/reset-password`,
  })

  return { success: true, data: undefined }
}

const MagicLinkSchema = z.object({ email: z.string().email() })

export async function magicLinkAction(formData: FormData, origin: string, locale: string): Promise<ActionResult> {
  const parsed = MagicLinkSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { success: false, error: 'invalid_input' }

  if (!(await checkAuthRateLimit())) return { success: false, error: RATE_LIMITED_ERROR }
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response')))) {
    return { success: false, error: BOT_ERROR }
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/${locale}/overview` },
  })

  if (error) return { success: false, error: 'invalid_credentials' }
  return { success: true, data: undefined }
}

/**
 * Server-side logout — supabase-js's signOut({ scope: 'global' }) (the
 * default) revokes the user's refresh tokens at GoTrue, not just the local
 * cookie, but the previous implementation only ever called it from the
 * browser client and never checked whether it actually succeeded. See 2nd
 * security audit item 4.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signOut({ scope: 'global' })
  if (error) {
    // Surfacing this to the caller isn't very actionable from a redirect
    // flow — logging it server-side is what actually lets us notice a
    // logout silently failing to revoke tokens.
    console.error('[auth] signOut failed', error)
  }
  const locale = await getLocale()
  redirect(`/${locale}/login`)
}
