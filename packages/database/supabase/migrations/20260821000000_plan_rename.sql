-- ============================================================
-- Plan rename: business/enterprise → growth/scale
--
-- Aligns plan_name with the StockAlert Paddle billing plan doc
-- (docs/STOCKALERT_PADDLE_BILLING_IMPLEMENTATION.md), which names the
-- three tiers Starter/Growth/Scale. `rename value` is used instead of
-- drop+recreate so every existing teams.plan / subscriptions.plan row
-- keeps pointing at the same tier under its new name — no data migration
-- needed, no window where a row is briefly invalid.
--
-- trial_expired and billing_interval are added here (own migration file,
-- per the enum_additions.sql precedent) because `alter type ... add
-- value` can't be used in the same transaction as a statement that
-- references the new value — the trial-lock migration that actually uses
-- billing_interval as a column type comes next.
-- ============================================================

alter type plan_name rename value 'business' to 'growth';
alter type plan_name rename value 'enterprise' to 'scale';

-- Persisted by the trial-expiry cron (api/worker/trial) once
-- trial_ends_at has passed and no payment has landed. Distinct from
-- 'canceled' (an active subscriber chose to leave) and from 'paused'
-- (a Paddle-side pause) — both of those already existed for other flows.
alter type subscription_status add value 'trial_expired';

create type billing_interval as enum ('monthly', 'yearly');
