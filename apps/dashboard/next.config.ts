import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'
import createBundleAnalyzer from '@next/bundle-analyzer'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
// `pnpm analyze` (ANALYZE=true) opens the client/server/edge treemaps in
// the browser after build — otherwise a no-op wrapper. Bundle size was
// never measured at all before this; see the "batırma listesi" audit
// item 13 and stock-chart-lazy.tsx's recharts split.
const withBundleAnalyzer = createBundleAnalyzer({ enabled: process.env['ANALYZE'] === 'true' })

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: [
    '@stockalert/ui',
    '@stockalert/i18n',
    '@stockalert/database',
    '@stockalert/integrations-core',
    '@stockalert/integrations-shopify',
    '@stockalert/integrations-trendyol',
    '@stockalert/integrations-amazon',
    '@stockalert/integrations-etsy',
    '@stockalert/integrations-ebay',
    '@stockalert/integrations-hepsiburada',
    '@stockalert/integrations-aliexpress',
    '@stockalert/queue',
    '@stockalert/notifications',
    '@stockalert/ai',
    '@stockalert/emails',
  ],
  // Faz 15 wired `pnpm lint` into CI as its own gate (ci.yml's "Lint"
  // step, run before build) — both flags are now false. typescript.ignoreBuildErrors
  // has been false since Faz 1-6 got `pnpm turbo typecheck` to 0 errors
  // monorepo-wide; eslint.ignoreDuringBuilds followed once lint had its
  // own dedicated CI step, so a regression in either shows up as that
  // step failing, not as a silent build-time skip.
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Product images come from the connected marketplace's own CDN, one
    // hostname per platform — without these, every product image in
    // products-table.tsx fails to render.
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'i.etsystatic.com' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'i.ebayimg.com' },
      { protocol: 'https', hostname: 'cdn.dsmcdn.com' }, // Trendyol
      { protocol: 'https', hostname: 'productimages.hepsiburada.net' },
      { protocol: 'https', hostname: 'ae01.alicdn.com' }, // AliExpress
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // X-XSS-Protection intentionally omitted: deprecated, and its
          // "1; mode=block" value is itself a known XSS vector in old
          // WebKit — a real CSP (see middleware.ts) is the modern control.
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

export default withBundleAnalyzer(withSentryConfig(withNextIntl(nextConfig), {
  org: process.env['SENTRY_ORG'],
  project: process.env['SENTRY_PROJECT_DASHBOARD'],
  authToken: process.env['SENTRY_AUTH_TOKEN'],
  silent: true,
  // Routes error/session-replay reporting through our own domain — bypasses
  // ad blockers that would otherwise drop requests to sentry.io directly.
  tunnelRoute: '/monitoring',
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  // Skip the Sentry build step entirely when there's no auth token (e.g.
  // local dev, or CI runs that don't have Sentry secrets) instead of
  // failing the build.
  sourcemaps: { disable: !process.env['SENTRY_AUTH_TOKEN'] },
}))
