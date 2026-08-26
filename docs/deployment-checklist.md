# Production deployment checklist

Faz 14 of the production-readiness plan (`inherited-sleeping-tarjan.md`)
kept this phase code-only — Track U (the accounts/credentials in that
plan's Track U table) wasn't complete when this checklist was written, so
none of the steps below have been executed yet. This is the reference to
work through once Track U closes out. Nothing here is automated; check
items off manually as they're done.

## Prerequisites (Track U)

- [ ] Supabase Cloud project (U1): `SUPABASE_PROJECT_ID`, URL, anon key,
      service-role key, DB password
- [ ] `SUPABASE_ENCRYPTION_KEY` generated (U2): `openssl rand -base64 32`,
      set in Vercel only, never committed
- [ ] Upstash Redis + QStash (U3): REST URL/token, QStash token,
      current + next signing keys
- [ ] Resend (U4): account + sending domain verified (SPF/DKIM/DMARC)
- [ ] Sentry (U5): org + `stockalert-dashboard` and `stockalert-landing`
      projects + auth token
- [ ] PostHog (U6): project key + host
- [ ] Paddle (U7): store, price ids for every plan × interval, webhook
      endpoint + signing secret, customer portal enabled
- [ ] Marketplace developer apps (U8–U14): Shopify, eBay, Amazon SP-API,
      Etsy, Trendyol, Hepsiburada, AliExpress — see each platform's row in
      the plan's Track U table for what's needed and typical approval time
- [ ] Domains + DNS (U15)
- [ ] Vercel team + two projects (U16)

## 1. Database

- [ ] `supabase link --project-ref $SUPABASE_PROJECT_ID`
- [ ] `supabase db push` — applies all four migrations in order
- [ ] In Studio: spot-check RLS is enabled on every table (Authentication
      → Policies), `handle_new_user` trigger fires on a test signup
- [ ] `pnpm db:types` against the **cloud** project (not `:local`),
      commit the diff if any (there shouldn't be one if this checklist is
      followed after the corresponding code was already merged)
- [ ] Confirm Point-in-Time Recovery is enabled on the Supabase plan
      you're on — restore procedure is now documented in
      `packages/database/README.md`'s "Runbook: backup / restore", but it
      has never been exercised against a real Cloud project; do a dry run
      against a disposable project before launch, not during an incident
- [ ] Auth settings (Studio → Authentication → Policies/Providers) —
      `supabase/config.toml`'s `[auth]` block is a **local-dev-only**
      template (`minimum_password_length = 6`, `password_requirements = ""`,
      `enable_confirmations = false`) and does not apply to the cloud
      project; set these explicitly there:
      - [ ] Minimum password length ≥ 10 (not the local default of 6)
      - [ ] Email confirmations enabled (local dev runs with them off)
      - [ ] Leaked-password protection (HaveIBeenPwned check) enabled

## 2. Vercel — two projects

| | `apps/dashboard` | `apps/landing` |
|---|---|---|
| Root directory | `apps/dashboard` | `apps/landing` |
| Install command | `pnpm install --frozen-lockfile` | same |
| Build command | `cd ../.. && pnpm turbo build --filter=dashboard` | `cd ../.. && pnpm turbo build --filter=landing` |

- [ ] All env vars from `.env.example` set for **both** Preview and
      Production scopes, but **not identical** — Preview must never hold
      production marketplace credentials or the production
      `SUPABASE_ENCRYPTION_KEY`. Use a separate Supabase project (or at
      minimum separate marketplace app credentials) for Preview.
- [ ] `SKIP_ENV_VALIDATION` is **not** set in either scope — its only
      legitimate use is the CI build step (see Faz 15's CI gates)
- [ ] `WORKER_SECRET` set (fallback bearer auth for
      `api/worker/{sync,predict,digest}` — see `lib/worker-auth.ts`)
- [ ] `CRON_SECRET` set — Vercel auto-injects it as
      `Authorization: Bearer $CRON_SECRET` on cron-triggered requests once
      the env var exists; this is what makes the cron endpoints trust
      Vercel's own calls
- [ ] `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_LANDING_URL` set per-environment
      (not the same value in Preview and Production)

## 3. Cron + queue

- [ ] `apps/dashboard/vercel.json`'s three cron entries are live (check
      Vercel's Cron Jobs tab after first deploy): `*/5 * * * *` sync,
      daily `0 3 * * *` predict, weekly `0 8 * * 1` digest
- [ ] Confirm the sync cron's `GET` handler is actually fanning out via
      QStash (`enqueuePollJob`) — check the QStash dashboard for
      published messages after the first cron tick, not just a 200
      response, since the route silently falls back to inline processing
      if `QSTASH_TOKEN` is missing (intentional for local dev, a real gap
      in production)
- [ ] Webhook route (`api/webhooks/[platform]`) reachable at
      `https://<app-domain>/api/webhooks/<platform>` for each platform —
      register these URLs in each marketplace's developer portal (see
      `packages/database/README.md`'s webhook re-registration runbook)

## 4. Auth + email

- [ ] Supabase Auth → URL Configuration: site URL and redirect URLs match
      the real `NEXT_PUBLIC_APP_URL` per environment
- [ ] Supabase Auth → SMTP: point at Resend using the verified domain
      (Supabase's default auth email sender is not meant for production
      volume and isn't from a domain your users will trust)
- [ ] Supabase Auth email templates (confirm/reset/invite) updated to at
      least visually match the React Email templates in
      `packages/emails/src/templates/` — these are two separate systems
      (Supabase Auth's own templates vs. this app's Resend-sent
      transactional/alert emails) and don't share markup automatically
- [ ] Send a real signup through and confirm the email lands (not spam)

## 5. Observability

- [ ] Sentry receiving events from both apps (trigger a test error)
- [ ] Sentry `beforeSend` confirmed to strip credentials (`accessToken`,
      `refreshToken`, `apiSecret`, `encrypted_creds`, `encrypted_key`,
      `webhook_secret`) — check a captured event's payload directly, don't
      just trust the config
- [ ] PostHog receiving pageviews/events

## 6. Smoke test (do this last, in production)

1. [ ] Sign up with a real email → team auto-created → land on
       `/tr/overview`
2. [ ] Connect a real Shopify dev store
3. [ ] Trigger a real inventory change in that store → webhook arrives →
       `alerts` + `alert_deliveries` rows appear
4. [ ] Real alert email arrives (check subject line is in the team's
       configured locale, not always English)
5. [ ] Trigger a Paddle test-mode checkout → subscription activates →
       billing page reflects the real plan, not `starter` fallback
6. [ ] CSP is now enforced, not report-only (see middleware.ts's
       `withSecurityHeaders`) — this was flipped without a live
       report-only observation period, so specifically watch the browser
       console for CSP violation errors while doing steps 1–5 above, plus
       a page with charts (`/overview`) and Sentry session replay. A
       blocked script/connect/frame shows up as a console error citing
       the directive it violated.
