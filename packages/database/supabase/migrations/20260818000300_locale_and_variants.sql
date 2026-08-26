-- ============================================================
-- Team locale + product_variants upsert support
--
-- Faz 12/13 of the production-readiness plan: notification emails need to
-- know which of the app's 7 supported languages to render in, and the
-- Shopify connector is about to start writing variant rows keyed on
-- (product_id, external_id) — an upsert needs a real unique constraint to
-- target, not just the existing product-scoped index.
-- ============================================================

alter table teams add column locale text not null default 'tr'
  check (locale in ('en', 'tr', 'de', 'fr', 'zh', 'ja', 'ru'));

comment on column teams.locale is
  'Drives which packages/i18n/locales/<locale>/emails.json dictionary notification emails render with. Matches packages/i18n''s Locale union — keep the two in sync.';

-- product_variants_product_idx (initial migration) is non-unique, scoped
-- only to product_id. Sync writes need `onConflict: 'product_id,external_id'`
-- to upsert variants without duplicating rows on every poll.
create unique index product_variants_product_external_uidx
  on product_variants(product_id, external_id);
