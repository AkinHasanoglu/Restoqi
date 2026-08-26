---
title: Index — Lavanchor SaaS Bilgi Arşivi
tags: [index]
date: 2026-08-17
status: active
---

# Index — Lavanchor SaaS Bilgi Arşivi

Bu dosya vault'un kataloğudur. Şema için bkz. [[CLAUDE.md]] (dosya kök dizinde, wikilink değil doğrudan aç). Zaman çizelgesi için [[log.md]].

## Projeler (entities/)
- [[entities/eticaret-stok-uyari-sistemi]] — Shopify/Trendyol B2B stok uyarı SaaS'ı (planlama)
- [[entities/saas-test-dashboard]] — 4 SaaS için Hub&Spoke izleme merkezi (uygulanmış)
- [[entities/cv-hazirlama-otomasyonu]] — AI destekli CV/özgeçmiş üretimi (uygulanmış)
- [[entities/yatirim-dashboard-uygulamasi]] — Fintech hepsi-bir-arada dashboard (plan)
- [[entities/eticaret-gorsel-uretimi]] — AI ürün görseli/video üretimi (n8n'den SaaS'a dönüşüm)

## Teknoloji Varlıkları (entities/)
- [[entities/nextjs-app-router]] · [[entities/vercel]] · [[entities/supabase]] · [[entities/postgresql]] · [[entities/prisma]] · [[entities/sqlite]] · [[entities/stripe]] · [[entities/lemonsqueezy]] · [[entities/paddle]] · [[entities/n8n]] · [[entities/redis-upstash]] · [[entities/sentry]]

## Kararlar (decisions/)
- [[decisions/n8nden-bagimsizlasma]] — arka plan işleri backend'e, n8n 3 projede yasak
- [[decisions/hub-and-spoke-izleme-mimarisi]] — Monitoring Hub ayrı bağımsız servis
- [[decisions/paddle-odeme-secimi]] — Stok Uyarı Sistemi'nin güncel ödeme tercihi (LemonSqueezy'nin yerine)
- [[decisions/lemonsqueezy-odeme-secimi]] — (superseded, bkz. yukarısı)
- [[decisions/reverse-trial-salt-okunur-kilit]] — 14 günlük kredi kartsız deneme + salt-okunur kilit mimarisi
- [[decisions/b2b-toplu-isleme-arka-plan-worker]] — CV SaaS'ta Vercel Cron seçimi
- [[decisions/durable-throttle-marker]] — ErrorLog.alertSentAt eklenmesi
- [[decisions/rbac-takim-yonetimi]] — Stok Uyarı Sistemi'nde rol matrisi
- [[decisions/40-madde-uyumluluk-denetimi]] — 2026-08-25 uyumluluk denetimi ve düzeltmeleri (GDPR/CCPA/FTC/WCAG/CAN-SPAM/TCPA)

## Sorunlar (issues/)
- [[issues/durum-degerleri-tutarsizligi]] — CRITICAL vs. healthy/warning/down
- [[issues/n8n-cors-webhook-sorunu]] — CORS riski + prototip/dönüşüm çelişkisi
- [[issues/app-name-esleme-riski]] — spoke kayıt eşleşme riski

## Kavramlar (concepts/)
- [[concepts/hub-and-spoke-mimarisi]] · [[concepts/rbac]] · [[concepts/webhook-tabanli-entegrasyon]] · [[concepts/rate-limiting]] · [[concepts/i18n]] · [[concepts/freemium-abonelik-modeli]] · [[concepts/placeholder-enjeksiyonu]] · [[concepts/serverless-arka-plan-isleme]] · [[concepts/alert-throttling]]

## Kaynak Özetleri (sources/projects/)
- [[sources/projects/2026-08-21-stockalert-paddle-billing-implementation]]
- [[sources/projects/2026-08-17-eticaret-stok-uyari-sistemi]]
- [[sources/projects/2026-08-17-saas-test-dashboard-readme]]
- [[sources/projects/2026-08-17-spoke-integration]]
- [[sources/projects/2026-08-14-saas-test-dashboard-spec]]
- [[sources/projects/2026-08-08-cv-saas-uygulama-blueprint]]
- [[sources/projects/2026-08-08-cv-saas-readme]]
- [[sources/projects/2026-08-08-fintech-yatirim-dashboard]]
- [[sources/projects/2026-08-04-saas-donusum-talimatlari]]
- [[sources/projects/2026-07-23-otomasyon-arayuz-talimatlari]]

## Sentezler (syntheses/)
- [[syntheses/saas-portfoy-genel-bakis]]
- [[syntheses/ortak-teknoloji-yigini]]
- [[syntheses/tekrar-eden-mimari-kararlar]]
- [[syntheses/monetizasyon-ve-odeme-altyapisi]]
- [[syntheses/acik-riskler-ve-bosluklar]]

## Sağlık Raporu
- [[lint-report.md]]
