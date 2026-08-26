# @stockalert/database

Supabase schema, RLS policies, generated types, and the encryption/audit
helpers every other package reads/writes the database through. This
document is the operational runbook set referenced by the production
readiness plan (Faz 14) — day-to-day schema/type docs live closer to the
code (see `src/crypto.ts`, `src/api-keys.ts`, `src/audit.ts` header
comments).

## Local development

```bash
pnpm --filter @stockalert/database db:start   # supabase start
pnpm --filter @stockalert/database db:reset   # applies migrations/ + seed.sql
pnpm --filter @stockalert/database db:lint    # supabase db lint
pnpm db:types                                 # regenerate src/types/database.types.ts
```

Studio: `http://localhost:54323`. Inbucket (catches every outbound email
in local dev, including Supabase Auth's own): `http://localhost:54324`.

## Runbook: encryption key rotation

`store_secrets.encrypted_creds` and `api_keys.encrypted_key` are
AES-256-GCM under `SUPABASE_ENCRYPTION_KEY` (see `src/crypto.ts`). Rotate
on a schedule or after a suspected compromise:

1. `openssl rand -base64 32` — generate the new key.
2. Deploy env changes: `SUPABASE_ENCRYPTION_KEY_PREVIOUS=<old key>[,<older keys>]`
   and `SUPABASE_ENCRYPTION_KEY=<new key>`. Both must be live before step 4 —
   `decrypt()` needs the old key to read existing rows, the new key to
   write re-encrypted ones.
3. `pnpm --filter @stockalert/database rotate-credentials`
   (`scripts/rotate-credentials.ts` — idempotent, safe to re-run; re-runs
   skip rows already on the current keyId).
4. Confirm the script's summary reports `failed=0` for every table before
   proceeding — a nonzero `failed` means some rows are still only readable
   under the old key and `SUPABASE_ENCRYPTION_KEY_PREVIOUS` must stay set.
5. Remove the old key from `SUPABASE_ENCRYPTION_KEY_PREVIOUS`, redeploy.

**Never** remove a key from `SUPABASE_ENCRYPTION_KEY_PREVIOUS` before step 4
has confirmed zero failures — a store still encrypted under a key that's
no longer in the keyring throws `UnknownKeyError` on next sync/decrypt and
that store silently stops syncing.

## Runbook: migration release

Migrations in `supabase/migrations/` are numbered `YYYYMMDDHHMMSS_*.sql`
and applied in order. `ALTER TYPE ... ADD VALUE` cannot run in the same
transaction as a statement that references the new value (Supabase wraps
each file in its own transaction) — if a migration needs a new enum value
*and* to use it, split it into two files, enum addition first (see
`20260818000000_enum_additions.sql` for the pattern).

1. Write the migration against local Supabase (`db:reset` re-applies
   everything from scratch — catches ordering bugs immediately).
2. `supabase db lint` — catches missing `search_path` on
   `SECURITY DEFINER` functions, missing RLS, etc.
3. `supabase link --project-ref $SUPABASE_PROJECT_ID` (first time only),
   then `supabase db push` against the target Supabase Cloud project.
4. `pnpm db:types` (cloud, not `:local`) and commit the diff —
   `database.types.ts` is a committed generated artifact; CI's database
   job fails the build if it doesn't match what the live schema produces.
5. Verify in Studio: new RLS policies show up under Authentication →
   Policies, new columns/tables render, `select * from pg_stat_activity`
   isn't showing a long-running lock from the migration.

## Runbook: webhook re-registration

Shopify is the only connector with `registerWebhook` implemented today —
it's called automatically right after a successful OAuth connect
(`api/auth/oauth-callback/route.ts`). Re-register when:

- `store_secrets.webhook_secret` changes (shouldn't happen in normal
  operation — it's generated once at row insert and never rotated
  automatically) or `NEXT_PUBLIC_APP_URL` changes (new deploy domain).
- Shopify support reports a webhook subscription was auto-removed (Shopify
  does this after repeated delivery failures — check `connected_stores.sync_error`
  first, it usually means the store's own token expired).

To re-register: call the connector's `registerWebhook` again with the
store's live credentials (`loadStoreCredentials`) and the current
`${NEXT_PUBLIC_APP_URL}/api/webhooks/shopify` address — there's no
dedicated UI button for this yet; do it from a one-off script or the
Supabase SQL editor to trigger a re-connect. eBay, AliExpress, and
Trendyol receive webhooks StockAlert doesn't register itself (registered
once in each platform's developer portal at app-approval time, per
Faz 7's `U8`–`U14`) — those don't need re-registration here, only if the
target URL (domain) changes, in which case update it in that platform's
developer portal directly.

## Runbook: Paddle price id change

`apps/dashboard/src/app/api/webhooks/paddle/route.ts`'s `PLAN_MAP` is
built from `NEXT_PUBLIC_PADDLE_PRICE_ID_*` env vars at request time, not
hardcoded — changing a price (e.g. a price increase, or adding an annual
tier) is an env var change, not a code change:

1. Create the new price in the Paddle dashboard.
2. Set/update the matching `NEXT_PUBLIC_PADDLE_PRICE_ID_<PLAN>_<INTERVAL>`
   env var in Vercel (both Preview and Production, kept separate from
   Paddle's own sandbox vs live price ids).
3. Redeploy (env var changes require a redeploy to take effect — Next.js
   inlines `NEXT_PUBLIC_*` vars at build time).
4. `assertPlanMapConfigured()` in the webhook route throws at request time
   in production if `PLAN_MAP` ends up empty — confirms misconfiguration
   loudly instead of silently mapping every subscription to `starter`.
5. Existing subscriptions on the old price id keep working (Paddle doesn't
   retroactively change `subscriptions.paddle_price_id` for existing
   customers) — only new checkouts use the new price.

## Runbook: backup / restore

Supabase Cloud handles backups at the platform level — there is nothing
in this repo that runs its own `pg_dump` schedule. This runbook is the
"how to actually use that" document the pre-launch security audit found
missing (docs/deployment-checklist.md's PITR line had no linked
procedure).

**Confirm before launch** (Supabase dashboard → Database → Backups):
1. Point-in-Time Recovery (PITR) is enabled — requires a paid plan (Pro
   tier or above); the free tier only gets daily snapshots with a short
   retention window, not continuous WAL-based recovery.
2. Note the actual retention window your plan gives you (e.g. 7/14/30
   days) — that's your maximum recovery point, not "however far back."
3. If PITR isn't available/enabled, daily snapshot backups still are —
   confirm those are turned on at minimum and note their retention.

**To trigger a restore** (Supabase dashboard → Database → Backups → Restore):
1. Pick a restore point. For PITR, this is a timestamp; for snapshots, a
   specific daily backup. Supabase restores into a **new project**, not
   in-place onto the live one — the live project keeps running throughout.
2. Wait for the restore to complete (can take minutes to hours depending
   on database size), then verify against the restored project directly:
   - `select count(*) from teams`, `connected_stores`, `products`, `alerts`
     — sanity-check row counts look right for the target point in time.
   - Spot-check `store_secrets` and `api_keys` decrypt successfully with
     the `SUPABASE_ENCRYPTION_KEY` that was active at the restore point —
     if a key rotation happened between the restore point and now, you
     need the *old* key (`SUPABASE_ENCRYPTION_KEY_PREVIOUS` at the time),
     not today's.
   - `supabase db lint` against the restored project to confirm RLS/
     policies came back intact.
3. Cutover: update `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
   (and any other Supabase-project-scoped env vars) in Vercel to point at
   the restored project, then redeploy. Treat the old project as
   quarantined evidence until the incident is understood, not something
   to delete immediately.

**RTO/RPO, honestly:** this has never been tested end-to-end against a
real Supabase Cloud project (only the mechanism is documented above) —
budget accordingly and treat the first real restore as a fire drill, not
a known-quantity procedure. A dry run against a disposable Supabase
project before launch is worth the hour it costs.

## Encrypted columns — module boundary

`store_secrets.encrypted_creds` (`src/stores.ts`) and
`api_keys.encrypted_key` (`src/api-keys.ts`) must only ever be read or
written through their owning module — never `db.from('store_secrets').select('encrypted_creds')`
or `.update({ encrypted_key: ... })` from anywhere else. Both modules
bind ciphertext to its row via AAD (`connected_stores:<store_id>` and
`api_keys:<team_id>:<provider>` respectively); code outside them has no
way to reconstruct the right AAD and either fails loudly (good) or, if
someone "fixes" that by hardcoding the wrong AAD, silently produces
ciphertext nothing can ever decrypt again (bad). Enforced by an ESLint
`no-restricted-syntax` rule (see root `eslint.config.mjs`).

`store_secrets` also has RLS enabled with **zero policies** — deliberately,
so no client-side role (viewer through owner) can ever `SELECT` it via
PostgREST, only the service-role client. `connected_stores` itself keeps
its normal viewer-readable RLS policies; only the two secret columns were
split out (see `20260819000000_security_hardening` migration).
