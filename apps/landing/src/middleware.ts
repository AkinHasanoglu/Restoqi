import { type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from '@stockalert/i18n'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
})

/**
 * Nonce-based CSP, mirroring apps/dashboard/src/middleware.ts's pattern.
 * This used to be a static policy set in next.config.ts's headers() —
 * fine for a plain `script-src 'self'`, except Next's App Router always
 * emits its own inline RSC-hydration bootstrap script, which a static
 * nonce-less 'self' policy blocks outright. That silently broke every
 * client component on the site (framer-motion animations never mounted,
 * the FAQ accordion didn't respond to clicks, etc.) — nothing hydrated.
 * A nonce has to be generated per request, which only middleware can do;
 * Next.js then automatically applies this same nonce to its own inline
 * scripts once it sees it in the response's CSP header.
 */
function buildCsp(nonce: string): string {
  // 'unsafe-eval' only in dev: next dev's webpack fast-refresh runtime
  // wraps modules in eval() for its source maps, which a strict CSP
  // blocks outright (EvalError, nothing renders past hydration). next
  // build's production output doesn't eval anything, so prod keeps the
  // stricter policy.
  const devEval = process.env.NODE_ENV !== 'production' ? ` 'unsafe-eval'` : ''
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self'`,
    `connect-src 'self' https://*.posthog.com https://*.sentry.io`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')
}

export default function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const response = intlMiddleware(request)
  response.headers.set('Content-Security-Policy', buildCsp(nonce))
  return response
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
