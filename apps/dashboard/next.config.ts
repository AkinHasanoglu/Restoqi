import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

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
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
