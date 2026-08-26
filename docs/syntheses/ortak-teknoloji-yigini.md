---
title: Ortak Teknoloji Yığını ve Sapmalar
tags: [synthesis, teknoloji, stack]
source: entities/
date: 2026-08-17
status: active
---

# Ortak Teknoloji Yığını ve Sapmalar

## Tekrar Eden Seçimler
- **[[entities/nextjs-app-router]]** — 5/5 proje.
- **[[entities/vercel]]** — 4/5 proje birincil hosting olarak (Netlify hepsinde alternatif).
- **PostgreSQL ailesi** ([[entities/supabase]] / Neon / Vercel Postgres) — 4/5 proje.
- **[[entities/redis-upstash]]** — kuyruk ve/veya rate limiting için 3/5 proje ([[entities/eticaret-stok-uyari-sistemi]], [[entities/yatirim-dashboard-uygulamasi]], [[entities/eticaret-gorsel-uretimi]]).
- **[[entities/sentry]]** — hata izleme için 2/5 proje ([[entities/eticaret-stok-uyari-sistemi]], [[entities/eticaret-gorsel-uretimi]]).
- **[[entities/stripe]]** — ödeme için 3/5 proje ([[entities/cv-hazirlama-otomasyonu]], [[entities/eticaret-gorsel-uretimi]], [[entities/yatirim-dashboard-uygulamasi]]'nde alternatif olarak).

## Sapma: [[entities/saas-test-dashboard]]
Portföydeki tek proje [[entities/sqlite]] + [[entities/prisma]] kullanıyor (diğerleri PostgreSQL ailesini tercih ediyor) — gerekçe README'de açık: "hızlı kurulum" (`SQLite (for quick setup)` spec ifadesiyle uyumlu). Bu, izleme aracının kendisinin ağır bir DB altyapısı gerektirmemesi mantığıyla tutarlı.

## Sapma: Ödeme Sağlayıcı Standardı Yok
[[entities/eticaret-stok-uyari-sistemi]] → LemonSqueezy, [[entities/cv-hazirlama-otomasyonu]] → Stripe/Iyzico, [[entities/eticaret-gorsel-uretimi]] → Stripe, [[entities/yatirim-dashboard-uygulamasi]] → Stripe/LemonSqueezy/Paddle (kesinleşmemiş). Detay: [[syntheses/monetizasyon-ve-odeme-altyapisi]].

## Kaynaklar
Tüm `entities/` altındaki teknoloji sayfaları.

## İlgili
- [[syntheses/saas-portfoy-genel-bakis]]
- [[syntheses/tekrar-eden-mimari-kararlar]]
