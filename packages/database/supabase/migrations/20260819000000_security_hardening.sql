-- ============================================================
-- StockAlert SaaS — Pre-launch security hardening
--
-- Closes four RLS/authorization gaps found in the pre-production security
-- audit (2026-08-19), each independently exploitable via the anon client
-- with nothing more than a normal authenticated session:
--
--  1. subscriptions_owner (initial_schema.sql:573) let any team owner
--     UPDATE their own subscriptions.plan/status — the sole source of
--     truth for every quota gate — for a free upgrade to any plan.
--  2. members_self_join (schema_completion.sql:279) let an invitee INSERT
--     their own team_members row with ANY role, not just the one they
--     were actually invited at, because the WITH CHECK never compared
--     team_members.role to the invitation's role.
--  3. stores_select (initial_schema.sql:511) exposed connected_stores.
--     webhook_secret and .encrypted_creds to every team member with
--     'viewer' — column-unrestricted SELECT. webhook_secret is the entire
--     authentication for Trendyol's inbound webhooks (HTTP Basic).
--  4. audit_insert (initial_schema.sql:598) let any 'editor' insert an
--     audit_logs row with an arbitrary user_id/actor_email, i.e. forge who
--     performed a logged action.
--
-- Plus two lower-severity hardening items found in the same audit:
--  5. teams had no cap on how many rows one user could INSERT.
--  6. team_invitations.invited_by was NOT NULL with no ON DELETE clause,
--     which blocks deleting a user who ever sent an invite (needed for
--     the account-deletion flow being added alongside this migration).
-- ============================================================

-- ============================================================
-- 1) subscriptions: drop the self-service UPDATE policy
--
-- Nothing in the application ever needs a user's own browser session to
-- UPDATE subscriptions — the Paddle webhook (api/webhooks/paddle/route.ts)
-- is the only legitimate writer, and it uses the service-role client,
-- which bypasses RLS entirely. Dropping this policy removes the write
-- path without removing any real functionality.
-- ============================================================

drop policy "subscriptions_owner" on subscriptions;

-- ============================================================
-- 2) team_members: constrain members_self_join to the invited role
-- ============================================================

drop policy "members_self_join" on team_members;

create policy "members_self_join" on team_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from team_invitations i
      where i.team_id = team_members.team_id
        and i.role = team_members.role
        and lower(i.email) = lower(auth.jwt() ->> 'email')
        and i.accepted_at is null
        and i.expires_at > now()
    )
  );

-- ============================================================
-- 3) connected_stores: move secret material to a service-role-only table
--
-- store_secrets has RLS enabled with ZERO policies, which means no role
-- other than service_role (which bypasses RLS) can read or write it via
-- PostgREST — not even with an admin/owner session. Every application
-- read of these two columns already goes through the service-role client
-- (packages/database/src/stores.ts, the webhook route), so this removes
-- client-reachable exposure without touching any legitimate code path.
-- ============================================================

create table store_secrets (
  store_id        uuid primary key references connected_stores(id) on delete cascade,
  encrypted_creds text,
  webhook_secret  text not null default encode(gen_random_bytes(32), 'hex')
);

comment on table store_secrets is
  'Split out of connected_stores so RLS can keep it fully inaccessible to any client-side role (viewer through owner) — only the service-role client may read it. See packages/database/README.md.';
comment on column store_secrets.encrypted_creds is
  'AES-256-GCM ciphertext, AAD-bound to connected_stores:<store_id>. Only packages/database/src/stores.ts may read/write this column — see the ESLint no-restricted-syntax rule for encrypted_creds.';
comment on column store_secrets.webhook_secret is
  'Per-store secret used to verify inbound platform webhooks (e.g. Trendyol Basic auth password, fallback HMAC key).';

insert into store_secrets (store_id, encrypted_creds, webhook_secret)
select id, encrypted_creds, webhook_secret from connected_stores;

alter table connected_stores drop column encrypted_creds;
alter table connected_stores drop column webhook_secret;

alter table store_secrets enable row level security;
-- Deliberately no policies: RLS-enabled + zero policies denies every
-- request that isn't using the service-role key, for every operation.

-- ============================================================
-- 4) audit_logs: server-stamp identity on every authenticated insert
--
-- Rather than replacing audit_insert with an RPC (which would require
-- reworking every logAudit() call site's signature), a BEFORE INSERT
-- trigger normalizes user_id/actor_email to the caller's own verified
-- identity whenever the request is running as 'authenticated' (i.e. an
-- editor's own browser session). This closes the impersonation gap —
-- an editor can no longer attribute a log entry to a different user —
-- while leaving the existing editor-role INSERT policy, and every
-- service-role logAudit() call (which passes an already-verified
-- userId/actorEmail from requireAuth()), untouched: auth.role() is not
-- 'authenticated' for service-role requests, so the trigger is a no-op
-- for them.
-- ============================================================

create or replace function enforce_audit_identity()
returns trigger as $$
begin
  if auth.role() = 'authenticated' then
    new.user_id := auth.uid();
    new.actor_email := auth.jwt() ->> 'email';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create trigger audit_logs_enforce_identity
  before insert on audit_logs
  for each row execute function enforce_audit_identity();

-- ============================================================
-- 5) teams: cap self-service INSERT per user
--
-- team_insert (schema_completion.sql:269) only required auth.uid() is not
-- null — an authenticated user could INSERT unbounded team rows directly
-- via the anon client. 20 is generous for legitimate multi-team use
-- (agencies managing several clients) while bounding abuse.
-- ============================================================

drop policy "team_insert" on teams;

create policy "team_insert" on teams for insert
  with check (
    auth.uid() is not null
    and (select count(*) from team_members where user_id = auth.uid()) < 20
  );

-- ============================================================
-- 6) team_invitations.invited_by: allow the inviter to be deleted
--
-- NOT NULL + no ON DELETE clause means deleting an auth.users row that
-- ever sent an invite raises a FK violation — blocking both Supabase
-- Studio's own "Delete user" action and the account-deletion flow this
-- migration is a prerequisite for. The invitation record itself should
-- survive its sender's deletion (same reasoning as audit_logs.user_id,
-- already ON DELETE SET NULL).
-- ============================================================

alter table team_invitations alter column invited_by drop not null;
alter table team_invitations
  drop constraint team_invitations_invited_by_fkey,
  add constraint team_invitations_invited_by_fkey
    foreign key (invited_by) references auth.users(id) on delete set null;
