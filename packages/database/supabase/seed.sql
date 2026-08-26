-- ============================================================
-- StockAlert — local dev seed data
-- Applied by `supabase db reset` (see config.toml [db.seed]).
-- Never run against a real/production project.
-- ============================================================

-- Two auth users. Inserting into auth.users fires the `on_auth_user_created`
-- trigger (handle_new_user), which creates a default team, owner
-- membership, trial subscription and usage_metrics row for each.
-- Password for both: "password123"
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'owner@example.com',
    crypt('password123', gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Demo Owner"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'editor@example.com',
    crypt('password123', gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Demo Editor"}',
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values
  (
    gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"owner@example.com"}', 'email',
    now(), now(), now()
  ),
  (
    gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"editor@example.com"}', 'email',
    now(), now(), now()
  )
on conflict do nothing;

-- ============================================================
-- Team/product/store/rule fixtures on the owner's default team
-- ============================================================

do $$
declare
  v_team_id          uuid;
  v_store_shopify    uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_store_trendyol   uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  v_channel_email    uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
  v_channel_slack    uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  v_rule_low_stock   uuid := 'cccccccc-0000-0000-0000-000000000001';
  v_product_id       uuid;
  v_base_qty         integer;
  i                  integer;
  d                  integer;
begin
  select team_id into v_team_id
  from team_members
  where user_id = '11111111-1111-1111-1111-111111111111' and role = 'owner'
  limit 1;

  if v_team_id is null then
    raise exception 'Seed failed: owner default team not found (did handle_new_user fire?)';
  end if;

  -- Second user joins the same team, as an editor, for RBAC testing.
  insert into team_members (team_id, user_id, role)
  values (v_team_id, '22222222-2222-2222-2222-222222222222', 'editor')
  on conflict (team_id, user_id) do nothing;

  -- Two connected stores.
  insert into connected_stores (id, team_id, platform, store_name, store_domain, is_active, external_store_id)
  values
    (v_store_shopify, v_team_id, 'shopify', 'Demo Shopify Store', 'demo-store.myshopify.com', true, 'demo-store.myshopify.com'),
    (v_store_trendyol, v_team_id, 'trendyol', 'Demo Trendyol Store', null, true, '100000')
  on conflict (id) do nothing;

  -- `encrypted_creds` holds an obviously-fake placeholder — it is NOT a
  -- real AES-256-GCM ciphertext, just enough to exercise UI code paths
  -- that check for its presence. Lives in store_secrets (service-role
  -- only), not connected_stores — see 20260819000000_security_hardening.
  insert into store_secrets (store_id, encrypted_creds)
  values
    (v_store_shopify, 'seed:not-a-real-ciphertext'),
    (v_store_trendyol, 'seed:not-a-real-ciphertext')
  on conflict (store_id) do nothing;

  insert into notification_channels (id, team_id, name, channel_type, config, is_active)
  values
    (v_channel_email, v_team_id, 'Team Email', 'email', '{"to":"owner@example.com"}'::jsonb, true),
    (v_channel_slack, v_team_id, 'Ops Slack', 'slack', '{"webhookUrl":"https://hooks.slack.com/services/SEED/PLACEHOLDER"}'::jsonb, true)
  on conflict (id) do nothing;

  insert into alert_rules (id, team_id, name, is_active, threshold_type, threshold_value, channel_ids, cooldown_minutes)
  values (v_rule_low_stock, v_team_id, 'Low stock (<10 units)', true, 'absolute', 10, array[v_channel_email], 240)
  on conflict (id) do nothing;

  -- 20 products split across the two stores, with varying current stock
  -- so the overview page has both healthy and below-threshold items.
  for i in 1..20 loop
    v_product_id := ('dddddddd-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;
    v_base_qty := (i * 3) % 40;

    insert into products (
      id, store_id, team_id, external_id, title, sku, barcode,
      current_quantity, platform, is_tracked, last_synced_at
    ) values (
      v_product_id,
      case when i % 2 = 0 then v_store_shopify else v_store_trendyol end,
      v_team_id,
      'seed-ext-' || i,
      'Seed Product ' || i,
      'SKU-' || lpad(i::text, 4, '0'),
      '00000000000' || lpad(i::text, 2, '0'),
      v_base_qty,
      case when i % 2 = 0 then 'shopify' else 'trendyol' end::platform_type,
      true,
      now()
    )
    on conflict (id) do nothing;

    -- 60 days of inventory history per product (gentle downward drift +
    -- noise), so the overview chart and days_of_supply testing have
    -- something real to compute against.
    for d in 0..59 loop
      insert into inventory_snapshots (product_id, team_id, quantity, source, recorded_at)
      values (
        v_product_id,
        v_team_id,
        greatest(0, v_base_qty + ((59 - d) / 3) - (d % 5)),
        'poll',
        now() - (d || ' days')::interval
      );
    end loop;
  end loop;

  -- Recompute usage_metrics to reflect the seeded rows (see
  -- refresh_usage_metrics in the 20260818000100 migration).
  perform refresh_usage_metrics(v_team_id);
end $$;
