import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@stockalert/ui', '@stockalert/i18n'],
  // See apps/dashboard/next.config.ts's identical flip — `pnpm lint` is
  // now its own CI gate (Faz 15), so this no longer needs to hide lint
  // errors from the build to avoid double-reporting.
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },
  async headers() {
    // Content-Security-Policy is intentionally NOT set here: it needs a
    // fresh per-request nonce (Next's App Router emits its own inline
    // RSC-hydration bootstrap script, which needs that nonce to run at
    // all), and next.config.ts's headers() can only emit a static value.
    // See src/middleware.ts for the actual CSP.
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // X-XSS-Protection intentionally omitted: deprecated, and its
          // "1; mode=block" value is itself a known XSS vector in old WebKit.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env['SENTRY_ORG'],
  project: process.env['SENTRY_PROJECT_LANDING'],
  authToken: process.env['SENTRY_AUTH_TOKEN'],
  silent: true,
  tunnelRoute: '/monitoring',
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  sourcemaps: { disable: !process.env['SENTRY_AUTH_TOKEN'] },
})
