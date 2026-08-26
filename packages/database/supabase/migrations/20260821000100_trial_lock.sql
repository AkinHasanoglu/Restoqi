-- ============================================================
-- Reverse-trial lock infrastructure
-- ============================================================

-- Which interval the active Paddle price is billed on. Populated by the
-- webhook (api/webhooks/paddle/route.ts) from the price → {plan, interval}
-- map in lib/paddle.ts; null while trialing/no subscription yet.
alter table subscriptions add column billing_interval billing_interval;

-- Billing-driven suspension, kept separate from is_active (which reflects
-- a user's own choice to disconnect a store). A team's trial expiring or
-- subscription lapsing sets suspended_at without touching is_active, so
-- reactivating the subscription can safely clear suspended_at alone
-- without guessing whether the user meant to re-enable stores they'd
-- deliberately turned off themselves.
alter table connected_stores add column suspended_at timestamptz;

comment on column connected_stores.suspended_at is
  'Billing-driven suspension (trial_expired/canceled/paused subscription). NULL = not suspended for billing reasons. Distinct from is_active, which is user-controlled.';

-- Partial index: only the (small) set of currently-suspended stores is
-- ever queried by this column (worker/sync's poll filter, the trial cron).
create index connected_stores_suspended_idx on connected_stores(suspended_at) where suspended_at is not null;
