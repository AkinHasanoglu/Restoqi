-- ============================================================
-- Switch billing provider: LemonSqueezy → Paddle Billing
--
-- The initial migration (20260730000000) named these columns after
-- LemonSqueezy's vocabulary (ls_subscription_id / ls_customer_id /
-- ls_variant_id) before the billing provider decision changed to Paddle.
-- Renamed rather than dropped+recreated to preserve the column's data,
-- unique constraint, and FK-free relationship untouched.
--
-- Paddle Billing calls the purchasable unit a "price" (price_id, e.g.
-- pri_...), not a "variant" — hence paddle_price_id rather than a literal
-- ls_variant_id -> paddle_variant_id rename.
-- ============================================================

alter table subscriptions rename column ls_subscription_id to paddle_subscription_id;
alter table subscriptions rename column ls_customer_id to paddle_customer_id;
alter table subscriptions rename column ls_variant_id to paddle_price_id;

comment on column subscriptions.paddle_subscription_id is 'Paddle subscription id (sub_...).';
comment on column subscriptions.paddle_customer_id is 'Paddle customer id (ctm_...).';
comment on column subscriptions.paddle_price_id is 'Paddle price id (pri_...) — the purchased plan/interval.';
comment on column subscriptions.customer_portal_url is 'Paddle subscription management_urls.update_payment_method — closest Paddle analog to a "customer portal" link.';
