---
title: E-Ticaret Stok Uyarı Sistemi
tags: [entity, proje, saas, e-commerce]
source: sources/projects/2026-08-17-eticaret-stok-uyari-sistemi.md
date: 2026-08-17
status: active
---

# E-Ticaret Stok Uyarı Sistemi

Shopify ve Trendyol satıcıları ile kurumsal e-ticaret firmaları için stok eşik altı uyarıları gönderen, RBAC'lı, abonelik tabanlı B2B SaaS. 2026-07-29 tarihli spec ile planlanmış; 2026-08-21 itibarıyla **uygulanmış durumda** — pnpm monorepo (`apps/dashboard`, `apps/landing`, `packages/*`), Supabase migration'ları, testler ve canlı Paddle billing entegrasyonu mevcut. Bu satır önceden "planlama aşaması" diyordu; 2026-08-21 incelemesinde güncellendi.

2026-08-25'te 40 maddelik bir uyumluluk denetimi yapıldı ve aynı oturumda düzeltildi — bkz. [[decisions/40-madde-uyumluluk-denetimi]]. Not: bu denetimden önce Cloudflare Turnstile aşağıdaki Stack listesinde vardı ama kodda hiç uygulanmamıştı; artık gerçekten uygulanmış durumda.

## Stack
[[entities/nextjs-app-router]], [[entities/supabase]] (PostgreSQL + RLS), [[entities/vercel]], [[entities/paddle]] (2026-08-21'de [[entities/lemonsqueezy]]'in yerini aldı — bkz. [[decisions/paddle-odeme-secimi]]), Payoneer, Ruul.io, `next-intl`, [[entities/redis-upstash]], [[entities/sentry]], n8n, React Email, Cloudflare Turnstile, PostHog.

## Öne Çıkan Özellikler
- RBAC (Yönetici/Editör/İzleyici)
- AI destekli stok tükenme tahmini (Smart Thresholds)
- Denetim izleri (audit logs)
- [[entities/saas-test-dashboard]]'a spoke olarak raporlama

## Kaynaklar
- [[sources/projects/2026-08-17-eticaret-stok-uyari-sistemi]]
- [[sources/projects/2026-08-21-stockalert-paddle-billing-implementation]]

## İlgili
- [[decisions/40-madde-uyumluluk-denetimi]]
- [[decisions/paddle-odeme-secimi]]
- [[decisions/reverse-trial-salt-okunur-kilit]]
- [[decisions/lemonsqueezy-odeme-secimi]] (superseded)
- [[decisions/hub-and-spoke-izleme-mimarisi]]
- [[entities/paddle]]
- [[concepts/rbac]]
- [[concepts/i18n]]
- [[syntheses/saas-portfoy-genel-bakis]]
