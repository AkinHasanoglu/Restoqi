-- ============================================================
-- StockAlert SaaS — Schema completion
--
-- Adds columns the application code genuinely needs but the initial
-- migration was missing (Faz 4 of the production-readiness plan), plus a
-- handful of correctness fixes to existing RLS policies and
-- SECURITY DEFINER functions found while auditing that migration.
-- The initial migration (20260730000000) is left untouched; simple
-- column renames are fixed in application code (Faz 5), not here.
-- ============================================================

-- ============================================================
-- CONNECTED_STORES
-- ============================================================

alter table connected_stores add column external_store_id text;

-- Per-store webhook signing secret. `not null default` so every existing
-- and future row gets one automatically — application code never has to
-- generate it itself.
alter table connected_stores
  add column webhook_secret text not null default encode(gen_random_bytes(32), 'hex');

-- Backfill for any pre-existing rows (dev/seed data only — this table is
-- effectively empty in any environment that hasn't gone live yet).
update connected_stores
  set external_store_id = coalesce(store_domain, id::text)
  where external_store_id is null;

-- Partial unique index: only enforced once a store actually has an
-- external id, so it doesn't collide across stores connected before this
-- migration ran.
create unique index connected_stores_platform_external_uidx
  on connected_stores(platform, external_store_id)
  where external_store_id is not null;

create index connected_stores_team_active_idx on connected_stores(team_id, is_active);

comment on column connected_stores.webhook_secret is
  'Per-store secret used to verify inbound platform webhooks (e.g. Trendyol Basic auth password, fallback HMAC key).';

-- ============================================================
-- PRODUCTS
-- ============================================================

alter table products add column current_quantity integer;
alter table products add column last_synced_at timestamptz;
alter table products add column platform platform_type;

comment on column products.current_quantity is
  'Denormalized cache of the latest inventory_snapshots.quantity for this product. Not the source of truth — always write it alongside a new snapshot row, never independently.';
comment on column products.platform is
  'Denormalized copy of connected_stores.platform, written by the sync upsert. Kept for query performance ((team_id, platform) index) — do not treat as independently authoritative.';

update products p
  set platform = s.platform
  from connected_stores s
  where s.id = p.store_id and p.platform is null;

create index products_team_qty_idx on products(team_id, current_quantity);
create index products_team_platform_idx on products(team_id, platform);
create index products_tracked_idx on products(team_id) where is_tracked;

-- ============================================================
-- ALERT_RULES
-- ============================================================

alter table alert_rules add column scope_store_ids uuid[];
alter table alert_rules add column silence_window_minutes integer not null default 0;

comment on column alert_rules.scope_store_ids is
  'Store-level scoping, null/empty = not scoped by store. Distinct from scope_product_ids/scope_tags — a rule with all three null/empty applies to all products.';
comment on column alert_rules.silence_window_minutes is
  'Minutes to globally mute a rule after ANY alert it fires, regardless of product. Distinct from quiet_hours (a wall-clock window) and cooldown_minutes (per product/rule throttle).';

-- ============================================================
-- ALERTS + ALERT_DELIVERIES
-- ============================================================

-- One breach can fan out to N channels; a single alerts row cannot
-- represent "Slack delivered, SMS failed" on its own. alerts becomes the
-- event, alert_deliveries the per-channel attempt (see alert_deliveries
-- below). channel_type/channel_id are no longer known at alert-insert time.
alter table alerts alter column channel_type drop not null;
alter table alerts add column store_id uuid references connected_stores(id) on delete set null;

create index alerts_store_idx on alerts(store_id, created_at desc);

create table alert_deliveries (
  id            uuid primary key default gen_random_uuid(),
  alert_id      uuid not null references alerts(id) on delete cascade,
  team_id       uuid not null references teams(id) on delete cascade,
  channel_id    uuid references notification_channels(id) on delete set null,
  channel_type  alert_channel not null,
  status        alert_status not null default 'pending',
  attempts      integer not null default 0,
  error_message text,
  delivered_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index alert_deliveries_alert_idx on alert_deliveries(alert_id);
create index alert_deliveries_team_idx on alert_deliveries(team_id, created_at desc);

alter table alert_deliveries enable row level security;

create policy "deliveries_select" on alert_deliveries for select
  using (has_team_role(team_id, 'viewer'));

create policy "deliveries_insert" on alert_deliveries for insert
  with check (has_team_role(team_id, 'editor'));

create policy "deliveries_update" on alert_deliveries for update
  using (has_team_role(team_id, 'editor'));

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

alter table subscriptions add column customer_portal_url text;

-- ============================================================
-- AUDIT_LOGS
-- ============================================================

-- Denormalized at write time deliberately: an audit log is a point-in-time
-- record. Joining live to auth.users would rewrite history if the user's
-- email changes or the account is deleted, and auth.users isn't
-- PostgREST-embeddable from the public schema anyway.
alter table audit_logs add column actor_email text;

create index audit_logs_action_idx on audit_logs(team_id, action, created_at desc);

-- Audit logs must be immutable once written.
create policy "audit_no_update" on audit_logs for update using (false);
create policy "audit_no_delete" on audit_logs for delete using (false);

-- ============================================================
-- TEAM_NOTES
-- ============================================================

-- `updated_by` (last editor) and `created_by` (author) are different
-- things and the UI wants both. Backfill created_by from updated_by since
-- that's the closest available signal for pre-existing rows.
alter table team_notes add column created_by uuid references auth.users(id) on delete set null;

update team_notes set created_by = updated_by where created_by is null;

-- ============================================================
-- FUNCTION FIXES
-- ============================================================

-- Fix 1: `lower()` must run BEFORE the character-class replace, not after —
-- the original order left uppercase letters in the slug (e.g. "Ahmet
-- Yilmaz" produced "-hmet-ilmaz" instead of "ahmet-yilmaz") and could
-- violate the `slug ~ '^[a-z0-9-]{2,50}$'` check constraint outright.
-- Fix 2: `set search_path` on every SECURITY DEFINER function — Supabase's
-- linter flags a mutable search_path on a security-definer function as a
-- privilege-escalation vector (a malicious search_path could shadow an
-- object the function relies on).
create or replace function handle_new_user()
returns trigger as $$
declare
  v_team_id   uuid;
  v_team_slug text;
  v_name      text;
begin
  v_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1),
    'My Team'
  );

  v_team_slug := lower(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  v_team_slug := regexp_replace(v_team_slug, '[^a-z0-9]+', '-', 'g');
  v_team_slug := trim(both '-' from v_team_slug);
  if v_team_slug = '' then
    v_team_slug := 'team';
  end if;
  -- Suffix guards against slug collisions; 40 + 1 + 8 = 49 chars, fits the 50-char check constraint.
  v_team_slug := left(v_team_slug, 40) || '-' || substr(gen_random_uuid()::text, 1, 8);

  insert into teams (name, slug)
  values (v_name || '''s Workspace', v_team_slug)
  returning id into v_team_id;

  insert into team_members (team_id, user_id, role)
  values (v_team_id, new.id, 'owner');

  insert into subscriptions (team_id)
  values (v_team_id);

  insert into usage_metrics (team_id)
  values (v_team_id);

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public, pg_temp;

create or replace function get_team_role(p_team_id uuid)
returns team_role as $$
  select role from team_members
  where team_id = p_team_id and user_id = auth.uid()
  limit 1;
$$ language sql security definer stable set search_path = public, pg_temp;

create or replace function has_team_role(p_team_id uuid, min_role team_role)
returns boolean as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id
      and user_id = auth.uid()
      and role::text = any(
        case min_role
          when 'viewer'  then array['viewer','editor','admin','owner']
          when 'editor'  then array['editor','admin','owner']
          when 'admin'   then array['admin','owner']
          when 'owner'   then array['owner']
        end
      )
  );
$$ language sql security definer stable set search_path = public, pg_temp;

-- Usage-metric maintenance function (Faz 13: called from the sync cron and
-- after store/rule/member mutations so the billing page can read real
-- numbers instead of running 4 count() queries on every render).
create or replace function refresh_usage_metrics(p_team_id uuid)
returns void as $$
begin
  update usage_metrics set
    store_count = (select count(*) from connected_stores where team_id = p_team_id and is_active),
    product_count = (select count(*) from products where team_id = p_team_id),
    rule_count = (select count(*) from alert_rules where team_id = p_team_id),
    alerts_this_month = (
      select count(*) from alerts
      where team_id = p_team_id and created_at >= date_trunc('month', now())
    ),
    members_count = (select count(*) from team_members where team_id = p_team_id),
    month_start = date_trunc('month', current_date),
    updated_at = now()
  where team_id = p_team_id;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- ============================================================
-- RLS FIXES
-- ============================================================

-- `authenticated` has no SELECT grant on auth.users, so the original
-- subquery (`select email from auth.users where id = auth.uid()`) throws
-- rather than evaluating to NULL/false. Use the JWT claim instead — it's
-- already present on every authenticated request and avoids touching
-- auth.users from RLS entirely.
drop policy "invitations_select" on team_invitations;
create policy "invitations_select" on team_invitations for select
  using (has_team_role(team_id, 'admin') or lower(email) = lower(auth.jwt() ->> 'email'));

-- teams had SELECT/UPDATE policies but no INSERT/DELETE policy, so team
-- creation only worked through the service-role client (bypassing RLS
-- entirely) even though actions/team.ts's createTeam runs as the user.
create policy "team_insert" on teams for insert
  with check (auth.uid() is not null);

create policy "team_delete" on teams for delete
  using (has_team_role(id, 'owner'));

-- Accepting an invite must let the invitee insert their own team_members
-- row, but the existing "members_insert" policy requires admin — which
-- the invitee is by definition not yet. Scope the allowance tightly to a
-- live, matching, unaccepted invitation for the caller's own JWT email.
create policy "members_self_join" on team_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from team_invitations i
      where i.team_id = team_members.team_id
        and lower(i.email) = lower(auth.jwt() ->> 'email')
        and i.accepted_at is null
        and i.expires_at > now()
    )
  );
