import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

// Rate limiting (lib/rate-limit.ts) and webhook replay protection both
// degrade to "allow" whenever Upstash isn't configured — fine for local
// dev, silently dangerous in production. Require it there instead of
// discovering the gap after launch.
const isProduction = process.env['NODE_ENV'] === 'production'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    // Must base64-decode to exactly 32 bytes (AES-256-GCM key). See
    // packages/database/src/crypto.ts — that module re-validates this at
    // runtime too (with a non-production dev fallback), but failing fast
    // here means a malformed key surfaces at boot, not at first store-connect.
    SUPABASE_ENCRYPTION_KEY: z.string().refine(
      (v) => Buffer.from(v, 'base64').length === 32,
      'Must be a base64-encoded 32-byte key — generate with `openssl rand -base64 32`',
    ),
    SUPABASE_ENCRYPTION_KEY_PREVIOUS: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().email().default('noreply@stockalert.app'),
    UPSTASH_REDIS_REST_URL: isProduction ? z.string().url() : z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: isProduction ? z.string().min(1) : z.string().optional(),
    QSTASH_TOKEN: z.string().optional(),
    QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
    QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
    // Bearer fallback for api/worker/* — see lib/worker-auth.ts. Required
    // in production so those routes can't end up authenticated by nothing
    // but an absent QStash signing key.
    WORKER_SECRET: isProduction ? z.string().min(16) : z.string().optional(),
    PADDLE_API_KEY: z.string().optional(),
    PADDLE_WEBHOOK_SECRET: z.string().optional(),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_FROM_NUMBER: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    // Required in production so a forgotten Vercel env var can't silently
    // disable bot protection on login/signup/reset — verifyTurnstileToken
    // (lib/turnstile.ts) fails OPEN (returns true) whenever this is unset,
    // which is the correct posture for local dev/CI but would be a silent
    // security regression in production. See 3rd security audit item 63.
    TURNSTILE_SECRET_KEY: isProduction ? z.string().min(1) : z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    APP_NAME: z.string().optional(),
    // https-only: hub-reporter.ts sends HUB_WEBHOOK_SECRET as a bearer
    // token on every request — an http:// URL (misconfiguration or a
    // downgrade) would put that secret on the wire in plaintext.
    HUB_URL: z.string().url().startsWith('https://').optional(),
    HUB_WEBHOOK_SECRET: z.string().optional(),
    HUB_API_KEY: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_LANDING_URL: z.string().url().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
    // Client-side counterpart of TURNSTILE_SECRET_KEY above — required
    // alongside it so production can't end up with a widget that never
    // renders (silently no-op'ing the bot check) while the server-side
    // secret is set.
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: isProduction ? z.string().min(1) : z.string().optional(),
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: z.string().optional(),
    NEXT_PUBLIC_PADDLE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
    // CAN-SPAM's required physical postal address — every outbound email's
    // footer (packages/emails/src/components/email-footer.tsx) renders
    // this. Optional so builds don't fail before it's set; the footer
    // hides the line rather than ship a fake address.
    NEXT_PUBLIC_COMPANY_ADDRESS: z.string().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env['NODE_ENV'],
    SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'],
    SUPABASE_ENCRYPTION_KEY: process.env['SUPABASE_ENCRYPTION_KEY'],
    SUPABASE_ENCRYPTION_KEY_PREVIOUS: process.env['SUPABASE_ENCRYPTION_KEY_PREVIOUS'],
    RESEND_API_KEY: process.env['RESEND_API_KEY'],
    RESEND_FROM_EMAIL: process.env['RESEND_FROM_EMAIL'],
    UPSTASH_REDIS_REST_URL: process.env['UPSTASH_REDIS_REST_URL'],
    UPSTASH_REDIS_REST_TOKEN: process.env['UPSTASH_REDIS_REST_TOKEN'],
    QSTASH_TOKEN: process.env['QSTASH_TOKEN'],
    QSTASH_CURRENT_SIGNING_KEY: process.env['QSTASH_CURRENT_SIGNING_KEY'],
    QSTASH_NEXT_SIGNING_KEY: process.env['QSTASH_NEXT_SIGNING_KEY'],
    WORKER_SECRET: process.env['WORKER_SECRET'],
    PADDLE_API_KEY: process.env['PADDLE_API_KEY'],
    PADDLE_WEBHOOK_SECRET: process.env['PADDLE_WEBHOOK_SECRET'],
    TWILIO_ACCOUNT_SID: process.env['TWILIO_ACCOUNT_SID'],
    TWILIO_AUTH_TOKEN: process.env['TWILIO_AUTH_TOKEN'],
    TWILIO_FROM_NUMBER: process.env['TWILIO_FROM_NUMBER'],
    CRON_SECRET: process.env['CRON_SECRET'],
    TURNSTILE_SECRET_KEY: process.env['TURNSTILE_SECRET_KEY'],
    ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY'],
    OPENAI_API_KEY: process.env['OPENAI_API_KEY'],
    APP_NAME: process.env['APP_NAME'],
    HUB_URL: process.env['HUB_URL'],
    HUB_WEBHOOK_SECRET: process.env['HUB_WEBHOOK_SECRET'],
    HUB_API_KEY: process.env['HUB_API_KEY'],
    NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
    NEXT_PUBLIC_LANDING_URL: process.env['NEXT_PUBLIC_LANDING_URL'],
    NEXT_PUBLIC_POSTHOG_KEY: process.env['NEXT_PUBLIC_POSTHOG_KEY'],
    NEXT_PUBLIC_POSTHOG_HOST: process.env['NEXT_PUBLIC_POSTHOG_HOST'],
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env['NEXT_PUBLIC_TURNSTILE_SITE_KEY'],
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: process.env['NEXT_PUBLIC_PADDLE_CLIENT_TOKEN'],
    NEXT_PUBLIC_PADDLE_ENV: process.env['NEXT_PUBLIC_PADDLE_ENV'],
    NEXT_PUBLIC_COMPANY_ADDRESS: process.env['NEXT_PUBLIC_COMPANY_ADDRESS'],
  },
  // `CI === 'true'` used to be part of this condition — GitHub Actions
  // (and most CI providers) sets that unconditionally on every job, which
  // meant this validation could never actually run in CI regardless of
  // whether SKIP_ENV_VALIDATION was set. Faz 15's build gate depends on
  // that no longer being true.
  skipValidation: process.env['SKIP_ENV_VALIDATION'] === 'true',
})
