-- ============================================================
-- StockAlert SaaS — Initial Schema
-- Supabase (PostgreSQL 15+) + pgcrypto + RLS
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type platform_type as enum (
  'shopify', 'trendyol', 'amazon', 'etsy', 'ebay', 'hepsiburada', 'aliexpress'
);

create type team_role as enum ('owner', 'admin', 'editor', 'viewer');

create type alert_channel as enum ('email', 'slack', 'telegram', 'sms', 'webhook', 'n8n');

create type threshold_type as enum ('absolute', 'percentage', 'days_of_supply');

create type alert_status as enum ('pending', 'delivered', 'failed', 'suppressed');

create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'paused');

create type plan_name as enum ('starter', 'business', 'enterprise');

create type ai_provider as enum ('anthropic', 'openai', 'statistical');

create type audit_action as enum (
  'team.created', 'team.updated', 'team.deleted',
  'member.invited', 'member.joined', 'member.removed', 'member.role_changed',
  'store.connected', 'store.disconnected', 'store.updated',
  'rule.created', 'rule.updated', 'rule.deleted', 'rule.toggled',
  'channel.created', 'channel.updated', 'channel.deleted',
  'subscription.changed', 'api_key.updated', 'settings.updated'
);

-- ============================================================
-- TEAMS (Çalışma Alanları)
-- ============================================================

create table teams (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 100),
  slug          text unique not null check (slug ~ '^[a-z0-9-]{2,50}$'),
  logo_url      text,
  plan          plan_name not null default 'starter',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- TEAM MEMBERS (RBAC)
-- ============================================================

create table team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        team_role not null default 'viewer',
  joined_at   timestamptz not null default now(),
  unique(team_id, user_id)
);

create index team_members_team_idx on team_members(team_id);
create index team_members_user_idx on team_members(user_id);

-- ============================================================
-- TEAM INVITATIONS
-- ============================================================

create table team_invitations (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams(id) on delete cascade,
  email         text not null,
  role          team_role not null default 'viewer',
  token         text unique not null default encode(gen_random_bytes(32), 'hex'),
  invited_by    uuid not null references auth.users(id),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  accepted_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index team_invitations_token_idx on team_invitations(token);
create index team_invitations_email_idx on team_invitations(email);

-- ============================================================
-- CONNECTED STORES
-- ============================================================

create table connected_stores (
  id                uuid primary key default gen_random_uuid(),
  team_id           uuid not null references teams(id) on delete cascade,
  platform          platform_type not null,
  store_name        text not null,
  store_domain      text,
  is_active         boolean not null default true,
  last_sync_at      timestamptz,
  sync_error        text,
  -- OAuth token veya API key — pgcrypto ile şifreli JSONB
  encrypted_creds   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index connected_stores_team_idx on connected_stores(team_id);
create index connected_stores_platform_idx on connected_stores(platform);

-- ============================================================
-- PRODUCTS
-- ============================================================

create table products (
  id                  uuid primary key default gen_random_uuid(),
  store_id            uuid not null references connected_stores(id) on delete cascade,
  team_id             uuid not null references teams(id) on delete cascade,
  external_id         text not null,
  title               text not null,
  sku                 text,
  barcode             text,
  image_url           text,
  product_url         text,
  is_tracked          boolean not null default true,
  tags                text[] default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(store_id, external_id)
);

create index products_team_idx on products(team_id);
create index products_store_idx on products(store_id);
create index products_sku_idx on products(sku) where sku is not null;

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================

create table product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products(id) on delete cascade,
  external_id     text not null,
  title           text not null,
  sku             text,
  barcode         text,
  image_url       text,
  created_at      timestamptz not null default now(),
  unique(product_id, external_id)
);

create index product_variants_product_idx on product_variants(product_id);

-- ============================================================
-- INVENTORY SNAPSHOTS (stok seviyesi geçmişi)
-- ============================================================

create table inventory_snapshots (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products(id) on delete cascade,
  variant_id      uuid references product_variants(id) on delete set null,
  team_id         uuid not null references teams(id) on delete cascade,
  quantity        integer not null,
  location_id     text,
  location_name   text,
  source          text not null default 'poll', -- 'webhook' | 'poll'
  recorded_at     timestamptz not null default now()
);

create index inventory_snapshots_product_idx on inventory_snapshots(product_id, recorded_at desc);
create index inventory_snapshots_team_idx on inventory_snapshots(team_id, recorded_at desc);

-- ============================================================
-- NOTIFICATION CHANNELS
-- ============================================================

create table notification_channels (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams(id) on delete cascade,
  name          text not null,
  channel_type  alert_channel not null,
  config        jsonb not null default '{}',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index notification_channels_team_idx on notification_channels(team_id);

-- ============================================================
-- ALERT RULES
-- ============================================================

create table alert_rules (
  id                    uuid primary key default gen_random_uuid(),
  team_id               uuid not null references teams(id) on delete cascade,
  name                  text not null,
  is_active             boolean not null default true,
  -- Kapsam: null = tüm ürünler, dizi = belirli ürün ID'leri veya etiketler
  scope_product_ids     uuid[],
  scope_tags            text[],
  threshold_type        threshold_type not null default 'absolute',
  threshold_value       numeric not null,
  -- Bildirim kanalları (FK yerine ID dizisi — birden fazla kanal)
  channel_ids           uuid[] not null default '{}',
  -- Aynı ürün için min. bekleme (örn. 4 saat)
  cooldown_minutes      integer not null default 240,
  -- Sessizlik saatleri: {"start": "22:00", "end": "08:00", "tz": "Europe/Istanbul"}
  quiet_hours           jsonb,
  created_by            uuid references auth.users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index alert_rules_team_idx on alert_rules(team_id);

-- ============================================================
-- ALERTS (Tetiklenmiş Uyarılar)
-- ============================================================

create table alerts (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references teams(id) on delete cascade,
  rule_id         uuid references alert_rules(id) on delete set null,
  product_id      uuid not null references products(id) on delete cascade,
  snapshot_id     uuid references inventory_snapshots(id) on delete set null,
  channel_id      uuid references notification_channels(id) on delete set null,
  channel_type    alert_channel not null,
  status          alert_status not null default 'pending',
  quantity        integer not null,
  threshold_value numeric not null,
  payload         jsonb,
  error_message   text,
  delivered_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index alerts_team_idx on alerts(team_id, created_at desc);
create index alerts_rule_idx on alerts(rule_id);
create index alerts_product_idx on alerts(product_id, created_at desc);

-- ============================================================
-- AI PREDICTIONS
-- ============================================================

create table ai_predictions (
  id                    uuid primary key default gen_random_uuid(),
  product_id            uuid not null references products(id) on delete cascade,
  team_id               uuid not null references teams(id) on delete cascade,
  provider              ai_provider not null,
  days_until_stockout   numeric,
  predicted_at          timestamptz not null default now(),
  valid_until           timestamptz not null default (now() + interval '12 hours'),
  confidence            numeric check (confidence between 0 and 1),
  metadata              jsonb
);

create index ai_predictions_product_idx on ai_predictions(product_id, predicted_at desc);
create index ai_predictions_team_idx on ai_predictions(team_id);

-- ============================================================
-- SUBSCRIPTIONS (LemonSqueezy)
-- ============================================================

create table subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  team_id               uuid unique not null references teams(id) on delete cascade,
  ls_subscription_id    text unique,
  ls_customer_id        text,
  ls_variant_id         text,
  plan                  plan_name not null default 'starter',
  status                subscription_status not null default 'trialing',
  trial_ends_at         timestamptz default (now() + interval '14 days'),
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  canceled_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- USAGE METRICS (plan limit tracking)
-- ============================================================

create table usage_metrics (
  id                    uuid primary key default gen_random_uuid(),
  team_id               uuid unique not null references teams(id) on delete cascade,
  store_count           integer not null default 0,
  product_count         integer not null default 0,
  rule_count            integer not null default 0,
  alerts_this_month     integer not null default 0,
  members_count         integer not null default 0,
  month_start           date not null default date_trunc('month', current_date),
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- USER API KEYS (multi-provider LLM)
-- ============================================================

create table api_keys (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references teams(id) on delete cascade,
  provider        ai_provider not null,
  -- pgcrypto ile şifreli key
  encrypted_key   text not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(team_id, provider)
);

create index api_keys_team_idx on api_keys(team_id);

-- ============================================================
-- TEAM NOTES (Markdown)
-- ============================================================

create table team_notes (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  title       text not null default 'Notlar',
  content     text not null default '',
  updated_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index team_notes_team_idx on team_notes(team_id);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  action      audit_action not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb default '{}',
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index audit_logs_team_idx on audit_logs(team_id, created_at desc);
create index audit_logs_user_idx on audit_logs(user_id, created_at desc);

-- ============================================================
-- UPDATED_AT otomatik güncelleme fonksiyonu
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger: her tablodaki updated_at'i otomatik güncelle
do $$
declare
  t text;
begin
  foreach t in array array[
    'teams', 'connected_stores', 'products', 'notification_channels',
    'alert_rules', 'subscriptions', 'api_keys', 'team_notes', 'usage_metrics'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on %I
       for each row execute function set_updated_at()',
      t
    );
  end loop;
end;
$$;

-- ============================================================
-- AUTH TRIGGER: Yeni kullanıcı → default team + subscription
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
declare
  v_team_id   uuid;
  v_team_slug text;
  v_name      text;
begin
  -- Kullanıcı adından slug üret
  v_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1),
    'My Team'
  );
  v_team_slug := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    '[^a-z0-9]+', '-', 'g'
  ));
  -- Slug çakışması ihtimaline karşı suffix ekle
  v_team_slug := left(v_team_slug, 40) || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Default team oluştur
  insert into teams (name, slug)
  values (v_name || '''s Workspace', v_team_slug)
  returning id into v_team_id;

  -- Owner olarak ekle
  insert into team_members (team_id, user_id, role)
  values (v_team_id, new.id, 'owner');

  -- Trial subscription başlat
  insert into subscriptions (team_id)
  values (v_team_id);

  -- Usage metrics başlat
  insert into usage_metrics (team_id)
  values (v_team_id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper fonksiyon: kullanıcının team'deki rolünü döndür
create or replace function get_team_role(p_team_id uuid)
returns team_role as $$
  select role from team_members
  where team_id = p_team_id and user_id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- Helper: minimum role kontrolü (owner > admin > editor > viewer)
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
$$ language sql security definer stable;

-- RLS etkinleştir
alter table teams                enable row level security;
alter table team_members         enable row level security;
alter table team_invitations     enable row level security;
alter table connected_stores     enable row level security;
alter table products             enable row level security;
alter table product_variants     enable row level security;
alter table inventory_snapshots  enable row level security;
alter table notification_channels enable row level security;
alter table alert_rules          enable row level security;
alter table alerts               enable row level security;
alter table ai_predictions       enable row level security;
alter table subscriptions        enable row level security;
alter table usage_metrics        enable row level security;
alter table api_keys             enable row level security;
alter table team_notes           enable row level security;
alter table audit_logs           enable row level security;

-- --- TEAMS ---
create policy "team_select" on teams for select
  using (has_team_role(id, 'viewer'));

create policy "team_update" on teams for update
  using (has_team_role(id, 'admin'));

-- --- TEAM MEMBERS ---
create policy "members_select" on team_members for select
  using (has_team_role(team_id, 'viewer'));

create policy "members_insert" on team_members for insert
  with check (has_team_role(team_id, 'admin'));

create policy "members_update" on team_members for update
  using (has_team_role(team_id, 'admin'));

create policy "members_delete" on team_members for delete
  using (has_team_role(team_id, 'admin') or user_id = auth.uid());

-- --- TEAM INVITATIONS ---
create policy "invitations_select" on team_invitations for select
  using (has_team_role(team_id, 'admin') or email = (select email from auth.users where id = auth.uid()));

create policy "invitations_insert" on team_invitations for insert
  with check (has_team_role(team_id, 'admin'));

create policy "invitations_delete" on team_invitations for delete
  using (has_team_role(team_id, 'admin'));

-- --- CONNECTED STORES ---
create policy "stores_select" on connected_stores for select
  using (has_team_role(team_id, 'viewer'));

create policy "stores_insert" on connected_stores for insert
  with check (has_team_role(team_id, 'editor'));

create policy "stores_update" on connected_stores for update
  using (has_team_role(team_id, 'editor'));

create policy "stores_delete" on connected_stores for delete
  using (has_team_role(team_id, 'admin'));

-- --- PRODUCTS ---
create policy "products_select" on products for select
  using (has_team_role(team_id, 'viewer'));

create policy "products_modify" on products for all
  using (has_team_role(team_id, 'editor'));

-- --- PRODUCT VARIANTS ---
create policy "variants_select" on product_variants for select
  using (exists (select 1 from products p where p.id = product_id and has_team_role(p.team_id, 'viewer')));

-- --- INVENTORY SNAPSHOTS ---
create policy "snapshots_select" on inventory_snapshots for select
  using (has_team_role(team_id, 'viewer'));

create policy "snapshots_insert" on inventory_snapshots for insert
  with check (has_team_role(team_id, 'editor'));

-- --- NOTIFICATION CHANNELS ---
create policy "channels_select" on notification_channels for select
  using (has_team_role(team_id, 'viewer'));

create policy "channels_modify" on notification_channels for all
  using (has_team_role(team_id, 'editor'));

-- --- ALERT RULES ---
create policy "rules_select" on alert_rules for select
  using (has_team_role(team_id, 'viewer'));

create policy "rules_modify" on alert_rules for all
  using (has_team_role(team_id, 'editor'));

-- --- ALERTS ---
create policy "alerts_select" on alerts for select
  using (has_team_role(team_id, 'viewer'));

create policy "alerts_insert" on alerts for insert
  with check (has_team_role(team_id, 'editor'));

-- --- AI PREDICTIONS ---
create policy "predictions_select" on ai_predictions for select
  using (has_team_role(team_id, 'viewer'));

create policy "predictions_insert" on ai_predictions for insert
  with check (has_team_role(team_id, 'editor'));

-- --- SUBSCRIPTIONS ---
create policy "subscriptions_select" on subscriptions for select
  using (has_team_role(team_id, 'viewer'));

create policy "subscriptions_owner" on subscriptions for update
  using (has_team_role(team_id, 'owner'));

-- --- USAGE METRICS ---
create policy "usage_select" on usage_metrics for select
  using (has_team_role(team_id, 'viewer'));

-- --- API KEYS ---
create policy "api_keys_select" on api_keys for select
  using (has_team_role(team_id, 'admin'));

create policy "api_keys_modify" on api_keys for all
  using (has_team_role(team_id, 'admin'));

-- --- TEAM NOTES ---
create policy "notes_select" on team_notes for select
  using (has_team_role(team_id, 'viewer'));

create policy "notes_modify" on team_notes for all
  using (has_team_role(team_id, 'editor'));

-- --- AUDIT LOGS ---
create policy "audit_select" on audit_logs for select
  using (has_team_role(team_id, 'admin'));

create policy "audit_insert" on audit_logs for insert
  with check (has_team_role(team_id, 'editor'));
