---
title: 14 Günlük Reverse-Trial ve Salt-Okunur Kilit Mimarisi
tags: [decision, billing, trial, e-commerce]
source: sources/projects/2026-08-21-stockalert-paddle-billing-implementation.md
date: 2026-08-21
status: active
---

# 14 Günlük Reverse-Trial ve Salt-Okunur Kilit Mimarisi

## Karar
[[entities/eticaret-stok-uyari-sistemi]]'nde yeni kayıt olan her takım, kredi kartı istenmeden 14 gün boyunca en üst orta paket olan **Growth**'un tüm yeteneklerine sahip olur ("reverse trial"). Süre dolduğunda ödeme yoksa hesap `trial_expired` durumuna geçer ve panel salt-okunur moda kilitlenir: mağaza senkronizasyonu durur, yeni kural/kanal/not/davet oluşturulamaz, ama mevcut veriler okunabilir kalır.

## Mimari
- **Canlı çözümleme, cron değil:** `resolveEffectivePlan` (`packages/plans/src/index.ts`) her istekte `trial_ends_at`'i o anki saatle karşılaştırıyor — süre dolduğunda cron henüz çalışmamış olsa bile erişim anında kilitleniyor.
- **Cron sadece kalıcılaştırıyor:** Günlük `api/worker/trial` cron'u `status = 'trial_expired'` yazıyor ve `connected_stores.suspended_at`'i dolduruyor (senkronizasyon worker'ının poll sorgusu bu alanı filtreliyor).
- **Sunucu tarafı gerçek zorlayıcı:** `getSubscriptionLockError` (`apps/dashboard/src/lib/auth-guard.ts`) — her yazma server action'ının başında çağrılıyor. UI'daki kilit modalı (`TrialExpiredDialog`, kapatılamaz) sadece UX; asıl güvenlik sınırı burası.
- **is_active ≠ suspended_at:** Kullanıcının kendi kapattığı bir mağaza (`is_active=false`) ile faturalama kaynaklı askı (`suspended_at`) ayrı tutuluyor — ödeme geldiğinde kilit açılırken kullanıcının bilerek kapattığı mağaza yanlışlıkla geri açılmasın diye.

## Gerekçe
`docs/STOCKALERT_PADDLE_BILLING_IMPLEMENTATION.md` dokümanının önerdiği tasarım; kod tabanında bu mekanizma hiç yoktu — `subscriptions.status` süresiz `trialing` kalıyordu (kilit hiç uygulanmıyordu). Reverse-trial'ın Growth (en popüler orta paket) vermesi, kullanıcıya deneme sırasında ürünün tam değerini göstermek için.

## Kaynaklar
- [[sources/projects/2026-08-21-stockalert-paddle-billing-implementation]]

## İlgili
- [[entities/paddle]]
- [[decisions/paddle-odeme-secimi]]
- [[concepts/freemium-abonelik-modeli]]
