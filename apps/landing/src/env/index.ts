import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    TURNSTILE_SECRET_KEY: z.string().optional(),
    APP_NAME: z.string().optional(),
    HUB_URL: z.string().url().startsWith('https://').optional(),
    HUB_WEBHOOK_SECRET: z.string().optional(),
    HUB_API_KEY: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
    // Shown on /contact — optional so builds don't fail before a real
    // support inbox is configured; the page hides the mailto link if unset.
    NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().optional(),
    // CAN-SPAM's required physical postal address — footer.tsx and every
    // transactional/marketing email footer render this. Optional so builds
    // don't fail before it's set, but the footer/email hide the line if unset
    // rather than ship a fake address (see compliance audit rule 14).
    NEXT_PUBLIC_COMPANY_ADDRESS: z.string().optional(),
    // security.txt (RFC 9116) contact — /.well-known/security.txt route.
    NEXT_PUBLIC_SECURITY_CONTACT_EMAIL: z.string().email().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env['NODE_ENV'],
    TURNSTILE_SECRET_KEY: process.env['TURNSTILE_SECRET_KEY'],
    APP_NAME: process.env['APP_NAME'],
    HUB_URL: process.env['HUB_URL'],
    HUB_WEBHOOK_SECRET: process.env['HUB_WEBHOOK_SECRET'],
    HUB_API_KEY: process.env['HUB_API_KEY'],
    NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
    NEXT_PUBLIC_POSTHOG_KEY: process.env['NEXT_PUBLIC_POSTHOG_KEY'],
    NEXT_PUBLIC_POSTHOG_HOST: process.env['NEXT_PUBLIC_POSTHOG_HOST'],
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env['NEXT_PUBLIC_TURNSTILE_SITE_KEY'],
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env['NEXT_PUBLIC_SUPPORT_EMAIL'],
    NEXT_PUBLIC_COMPANY_ADDRESS: process.env['NEXT_PUBLIC_COMPANY_ADDRESS'],
    NEXT_PUBLIC_SECURITY_CONTACT_EMAIL: process.env['NEXT_PUBLIC_SECURITY_CONTACT_EMAIL'],
  },
  // Was `CI === 'true'` — GitHub Actions sets that unconditionally on
  // every job, so this validation could never actually run in CI. See
  // apps/dashboard/src/env/index.ts's identical fix.
  skipValidation: process.env['SKIP_ENV_VALIDATION'] === 'true',
})
