-- ============================================================
-- CAN-SPAM one-click unsubscribe for the weekly digest
--
-- The weekly digest (api/worker/digest, sent via
-- packages/notifications/src/channels/transactional.ts's
-- sendWeeklyDigestEmail) is the only periodic, non-essential send in the
-- product — every other email (invites, password resets, low-stock
-- alerts the team itself configured, payment failures, trial reminders)
-- is transactional and CAN-SPAM doesn't require or want it
-- unsubscribable. This flag lets a recipient opt out via the email's
-- List-Unsubscribe link/header (apps/dashboard/src/app/api/unsubscribe)
-- without logging in.
-- ============================================================

alter table teams add column weekly_digest_opt_out boolean not null default false;

comment on column teams.weekly_digest_opt_out is
  'Set via the no-login unsubscribe link in the weekly digest email (api/unsubscribe route). Does not affect low-stock alerts or any transactional email.';
