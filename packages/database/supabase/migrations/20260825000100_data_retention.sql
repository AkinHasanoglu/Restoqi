-- ============================================================
-- Data retention purge — compliance audit rules 05, 35
--
-- Before this migration, inventory_snapshots/alerts/audit_logs/
-- team_invitations/ai_predictions grew forever with no automated
-- cleanup, contradicting the Privacy Policy's retention section (see
-- apps/landing's legal/privacy §7) the moment it started describing
-- actual limits. Retention windows match what that section promises;
-- change them together if either changes.
--
-- Called by apps/dashboard/src/app/api/worker/retention (weekly cron,
-- see vercel.json) via the service-role client — not exposed to any
-- client role, and does not touch products/teams/subscriptions or
-- anything a team would consider "their data" going away unexpectedly.
-- ============================================================

create or replace function purge_expired_data()
returns table (
  table_name text,
  deleted_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  -- Raw stock-level history: kept 90 days. Alerts/predictions derived
  -- from it (alerts, ai_predictions) are retained independently per
  -- their own windows below, so this doesn't remove alert history.
  delete from inventory_snapshots where recorded_at < now() - interval '90 days';
  get diagnostics v_count = row_count;
  table_name := 'inventory_snapshots'; deleted_count := v_count; return next;

  -- Triggered alerts: kept 12 months.
  delete from alerts where created_at < now() - interval '12 months';
  get diagnostics v_count = row_count;
  table_name := 'alerts'; deleted_count := v_count; return next;

  -- Audit trail: kept 24 months — long enough to investigate a
  -- year-old-plus billing/security question, short enough to not become
  -- an unbounded liability.
  delete from audit_logs where created_at < now() - interval '24 months';
  get diagnostics v_count = row_count;
  table_name := 'audit_logs'; deleted_count := v_count; return next;

  -- Never-accepted invitations, 30 days past their own expiry — the
  -- invite flow already treats expires_at as dead; this just stops the
  -- table accumulating rows nobody can act on anymore. Accepted
  -- invitations (accepted_at is not null) are left alone as a historical
  -- record of who invited whom.
  delete from team_invitations
    where accepted_at is null and expires_at < now() - interval '30 days';
  get diagnostics v_count = row_count;
  table_name := 'team_invitations'; deleted_count := v_count; return next;

  -- Stale AI predictions: kept 30 days past their own validity window
  -- (ai_predictions.valid_until) — long enough for the UI/exports to
  -- reference a "recent" prediction, not so long they outlive every
  -- product they were computed for.
  delete from ai_predictions where valid_until < now() - interval '30 days';
  get diagnostics v_count = row_count;
  table_name := 'ai_predictions'; deleted_count := v_count; return next;
end;
$$;

comment on function purge_expired_data() is
  'Weekly retention purge — see apps/dashboard/src/app/api/worker/retention. Matches legal/privacy §7''s retention windows.';

revoke all on function purge_expired_data() from public, anon, authenticated;
