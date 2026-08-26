import { type NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { createMiddlewareClient } from '@stockalert/database/middleware'
import { locales, defaultLocale } from '@stockalert/i18n'
import { rateLimitAuth, rateLimitApi } from './lib/rate-limit'

// 'always': every route lives under [locale] (there's no unprefixed root
// page — only (app)/overview, (auth)/login, etc.). 'as-needed' would strip
// the prefix for defaultLocale, which fights the "/" -> "/${defaultLocale}/..."
// redirect below and the pathname.split('/')[1] locale lookups throughout
// this file, producing a "/" <-> "/en" redirect loop.
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

const PUBLIC_AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/accept-invite']
const PROTECTED_PREFIX = '/[locale]/(app)'

function isPublicAuthRoute(pathname: string) {
  return PUBLIC_AUTH_ROUTES.some((route) =>
    locales.some((locale) => pathname.startsWith(`/${locale}${route}`) || pathname === route)
  )
}

function isAppRoute(pathname: string) {
  // /overview, /products, /alerts, /rules, /integrations, /notes, /settings
  const APP_PATHS = ['/overview', '/products', '/alerts', '/rules', '/integrations', '/notes', '/settings', '/billing']
  return APP_PATHS.some((path) =>
    locales.some((locale) => pathname.startsWith(`/${locale}${path}`)) || pathname.startsWith(path)
  )
}

// Routes that already carry their own protection and shouldn't be
// double-limited here: webhooks verify a per-platform signature and run
// their own per-store limiter (see lib/rate-limit.ts); the sync worker is
// gated by CRON_SECRET/QStash signature; health is polled by uptime
// monitoring and must never be throttled.
const UNPROTECTED_API_PREFIXES = ['/api/webhooks/', '/api/worker/sync', '/api/health']

/**
 * Sentry's CSP report endpoint, derived from the DSN so it doesn't need a
 * separately configured env var. DSN shape: https://<key>@<host>/<projectId>
 * → report endpoint: https://<host>/api/<projectId>/security/?sentry_key=<key>.
 * Returns undefined (report-uri omitted) if the DSN isn't set/parseable —
 * never lets a malformed DSN break the CSP header itself.
 */
function sentryCspReportUri(): string | undefined {
  const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN_DASHBOARD']
  if (!dsn) return undefined
  try {
    const url = new URL(dsn)
    const projectId = url.pathname.replace(/^\//, '')
    if (!url.username || !projectId) return undefined
    return `https://${url.host}/api/${projectId}/security/?sentry_key=${url.username}`
  } catch {
    return undefined
  }
}

/**
 * Nonce-based CSP, per Next.js's documented middleware pattern: the nonce
 * goes on the request header so the app can read it (see root layout),
 * and Next automatically applies the same nonce to its own inline
 * bootstrap scripts when it finds one in the CSP response header.
 * `script-src`'s 'strict-dynamic' means a script with a valid nonce can
 * dynamically load further scripts regardless of their origin — this is
 * what lets @paddle/paddle-js (bundled under 'self') inject its own
 * checkout script without an explicit host entry; the checkout iframe
 * itself is covered by the frame-src allowlist below instead.
 */
function buildCspHeader(nonce: string): string {
  const reportUri = sentryCspReportUri()
  // 'unsafe-eval' only in dev: next dev's webpack fast-refresh runtime wraps
  // modules in eval() for its source maps, which a strict CSP blocks outright
  // (EvalError, nothing renders past hydration — forms silently fall back to
  // native GET submission). next build's production output doesn't eval
  // anything, so prod keeps the stricter policy. Mirrors apps/landing's fix.
  const devEval = process.env.NODE_ENV !== 'production' ? ` 'unsafe-eval'` : ''
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https://cdn.shopify.com https://i.etsystatic.com https://m.media-amazon.com https://i.ebayimg.com https://cdn.dsmcdn.com https://productimages.hepsiburada.net https://ae01.alicdn.com`,
    `font-src 'self'`,
    // challenges.cloudflare.com — Turnstile's verification XHR (connect-src)
    // and challenge iframe (frame-src). See lib/turnstile.ts and the
    // TurnstileWidget mounted in the auth forms (compliance audit rule 07).
    `connect-src 'self' https://*.supabase.co https://*.posthog.com https://*.sentry.io https://*.upstash.io https://*.paddle.com https://challenges.cloudflare.com`,
    `frame-src 'self' https://*.paddle.com https://challenges.cloudflare.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
    ...(reportUri ? [`report-uri ${reportUri}`] : []),
  ]
  return directives.join('; ')
}

function withSecurityHeaders(res: NextResponse, nonce: string): NextResponse {
  // Enforced, not Report-Only. This was flipped without a live
  // report-only observation period in production — the policy design
  // reasons this should be safe (strict-dynamic + nonce covers
  // @paddle/paddle-js's dynamically-injected checkout script; the
  // checkout iframe and connect-src both explicitly allowlist
  // *.paddle.com; Recharts is pure SVG/React with no eval), but that is
  // reasoning, not verification. Before/immediately after this ships,
  // manually click through login, the checkout flow, and a page with
  // charts with the browser console open, watching for CSP violation
  // errors — see docs/deployment-checklist.md's CSP entry.
  res.headers.set('Content-Security-Policy', buildCspHeader(nonce))
  return res
}

export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/_next/')) {
    return response
  }

  if (pathname.startsWith('/api/')) {
    if (UNPROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return withSecurityHeaders(response, nonce)
    }
    // Every other API route (oauth start/callback, integrations actions
    // reached via fetch, etc.) — moderate per-IP limit.
    const limited = await rateLimitApi(request)
    return withSecurityHeaders(limited ?? response, nonce)
  }

  // next.config.ts's Sentry tunnelRoute ('/monitoring') proxies arbitrary
  // client-reported events to Sentry — it isn't under /api/ so it fell
  // through every check above with no rate limit at all, unlike every
  // other API-shaped route. See 2nd security audit item 20.
  if (pathname.startsWith('/monitoring')) {
    const limited = await rateLimitApi(request)
    return withSecurityHeaders(limited ?? response, nonce)
  }

  // Kök yönlendirme — bare [locale] root'ta page.tsx yok, gerçek giriş
  // noktası /overview (auth guard, oturum yoksa bunu /login'e çevirir).
  if (pathname === '/') {
    return withSecurityHeaders(NextResponse.redirect(new URL(`/${defaultLocale}/overview`, request.url)), nonce)
  }

  // Auth pages (login/signup/forgot-password/accept-invite) get a strict
  // per-IP limit — credential submission itself goes client-side straight
  // to Supabase's own rate-limited Auth API, but this still guards page
  // rendering and the invite-accept flow from scraping/abuse.
  if (isPublicAuthRoute(pathname)) {
    const limited = await rateLimitAuth(request)
    if (limited) return withSecurityHeaders(limited, nonce)
  }

  // Supabase henüz yapılandırılmamışsa auth guard'ı atla
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''
  const supabaseKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''
  const supabaseConfigured =
    (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://127.0.0.1') || supabaseUrl.startsWith('http://localhost')) &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseKey.length > 10

  if (!supabaseConfigured) {
    return withSecurityHeaders(intlMiddleware(request), nonce)
  }

  // Refresh Supabase session
  const supabase = createMiddlewareClient(request, response)
  // getUser() (not getSession()) — getSession() decodes the cookie's JWT
  // without verifying its signature, so it isn't trustworthy on its own for
  // an auth decision; getUser() re-validates against Supabase Auth. See 2nd
  // security audit item 3.
  const { data: { user } } = await supabase.auth.getUser()

  // Auth guard: uygulama rotalarına giriş gerektir
  if (isAppRoute(pathname) && !user) {
    const locale = pathname.split('/')[1] ?? defaultLocale
    const loginUrl = new URL(`/${locale}/login`, request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return withSecurityHeaders(NextResponse.redirect(loginUrl), nonce)
  }

  // Zaten giriş yapmış kullanıcıyı auth sayfalarından yönlendir
  if (isPublicAuthRoute(pathname) && user) {
    const locale = pathname.split('/')[1] ?? defaultLocale
    return withSecurityHeaders(NextResponse.redirect(new URL(`/${locale}/overview`, request.url)), nonce)
  }

  return withSecurityHeaders(intlMiddleware(request), nonce)
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
