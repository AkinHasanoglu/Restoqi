---
title: StockAlert Paddle Billing — Reverse-Trial ve Plan Yeniden Adlandırma
tags: [source, saas, e-commerce, b2b, odeme, billing]
source: STOCKALERT_PADDLE_BILLING_IMPLEMENTATION.md (docs kök dizini)
date: 2026-08-21
status: active
---

# StockAlert Paddle Billing — Reverse-Trial ve Plan Yeniden Adlandırma — Kaynak Özeti

## Hedef
`docs/STOCKALERT_PADDLE_BILLING_IMPLEMENTATION.md`, [[entities/eticaret-stok-uyari-sistemi]] için sıfırdan bir Paddle Billing mimarisi (Prisma şeması, kendi webhook route'u, kendi bildirim servisi) tarif eden bir talimat dokümanıydı. İnceleme sonucunda [[entities/paddle]] entegrasyonunun bu kod tabanında **zaten canlı ve dokümandaki sürümden daha olgun** olduğu tespit edildi (imza doğrulama + replay-dedupe + audit log + dunning e-postası; bkz. [[decisions/paddle-odeme-secimi]]). Bu yüzden doküman birebir uygulanmadı — sadece üç gerçek boşluk (reverse-trial kilidi, plan yeniden adlandırma, kanal yetkilendirmesi) hedeflenerek inşa edildi.

## Yapılanlar / Kapsam
- **Yeni paket `@stockalert/plans`:** Plan adları/fiyatları/limitleri/kanal yetkileri için tek kaynak. Hem `apps/dashboard` hem `apps/landing` buradan okuyor — önceden üç yerde üç farklı fiyat vardı ($29/$79/Custom landing'de, $29/$89/Custom billing sayfasında).
- **Plan yeniden adlandırma:** `plan_name` enum'u `starter/business/enterprise` → `starter/growth/scale` (`alter type ... rename value`, veri taşınmadan). Fiyatlar dokümandaki $19/$49/$119 (aylık) / $190/$490/$1.190 (yıllık) değerlerine sabitlendi.
- **Reverse-trial + salt-okunur kilit:** `subscription_status` enum'una `trial_expired` eklendi. `resolveEffectivePlan` (`packages/plans/src/index.ts`) canlı wall-clock kontrolü yapıyor — trial_ends_at geçtiğinde cron beklenmeden erişim kilitleniyor. Günlük cron (`api/worker/trial`) durumu kalıcılaştırıyor ve `connected_stores.suspended_at` ile senkronizasyonu donduruyor. Sunucu tarafı gerçek zorlayıcı: `getSubscriptionLockError` (`lib/auth-guard.ts`), her yazma server action'ının başında.
- **Kanal yetkilendirmesi:** `isChannelAllowed(plan, channel)` — Starter: email+telegram; Growth: +slack; Scale: hepsi (+sms, webhook, n8n). Hem kanal oluşturma anında hem `worker/sync` dispatch anında zorlanıyor; plana kapalı kanallar sessizce düşürülmüyor, `alert_deliveries`'e `channel_not_in_plan` olarak işaretleniyor (grandfathering).
- **UI:** `TrialBanner` + `TrialExpiredDialog` (kapatılamaz modal), 7 dilde (`packages/i18n/locales/*/dashboard.json`, sadece `en`/`tr` gerçek çeviri — diğer 5 dil bu vault'taki önceki gözlemle tutarlı şekilde İngilizce placeholder).

## Etkilenen Dosyalar / Alanlar
`packages/plans/` (yeni), `packages/database/supabase/migrations/20260821000000_plan_rename.sql`, `.../20260821000100_trial_lock.sql`, `apps/dashboard/src/lib/{paddle,plan-limits,auth-guard}.ts`, `apps/dashboard/src/app/api/webhooks/paddle/route.ts`, `apps/dashboard/src/app/api/worker/{sync,trial}/route.ts`, `apps/dashboard/src/actions/{alerts,integrations,team,notes}.ts`, `apps/dashboard/src/components/billing/{trial-banner,trial-expired-dialog}.tsx`, `apps/landing/src/components/landing/pricing.tsx`, `packages/i18n/locales/*/{dashboard,landing,common}.json`.

## Kararlar
- [[decisions/paddle-odeme-secimi]] (LemonSqueezy → Paddle geçişinin bu vault'a ilk kez işlenmesi; kod tabanında zaten uygulanmıştı)
- [[decisions/reverse-trial-salt-okunur-kilit]]

## Sorunlar
- Yerel Supabase (Docker) bu oturumda çalıştırılamadı — migration'lar `supabase db reset` ile canlı test edilemedi; `packages/database/src/types/database.types.ts` elle güncellendi (`pnpm db:types` ile yeniden üretilmesi gerekiyor).
- `packages/notifications/src/rules-engine.test.ts`'te bu değişiklikten bağımsız, önceden var olan 1 başarısız test tespit edildi (dokunulmadı, kapsam dışı).

## Açık Konular
- Discord kanalı, SMS kotası, plan bazlı senkronizasyon sıklığı dokümanda vardı ama bilinçli olarak kapsam dışı bırakıldı.
- `docs/index.md`'deki portföy-geneli "Teknoloji Varlıkları" listesi `[[entities/prisma]]`'ya yer veriyor ama bu proje Prisma kullanmıyor (doğrudan Supabase migration'ları + `supabase gen types`) — o girişin hangi portföy projesine ait olduğu bu oturumda doğrulanmadı, ayrı bir lint konusu.

## Kaynaklar
- STOCKALERT_PADDLE_BILLING_IMPLEMENTATION.md (docs kök dizini — henüz raw/projects/ altında pointer'ı yok)

## İlgili
- [[entities/eticaret-stok-uyari-sistemi]]
- [[entities/paddle]]
- [[entities/lemonsqueezy]]
- [[decisions/paddle-odeme-secimi]]
- [[decisions/reverse-trial-salt-okunur-kilit]]
- [[syntheses/monetizasyon-ve-odeme-altyapisi]]
