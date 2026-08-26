---
title: E-Ticaret Stok Uyarı SaaS Projesi — Kaynak Özeti
tags: [source, saas, e-commerce, b2b]
source: raw/projects/01-eticaret-stok-uyari-sistemi.md
date: 2026-08-17
status: active
---

# E-Ticaret Stok Uyarı SaaS Projesi — Kaynak Özeti

## Hedef
Shopify ve Trendyol satıcıları ile kurumsal e-ticaret firmaları için stok eşik altı uyarıları gönderen, çoklu dil destekli, takım yönetimli (RBAC), abonelik tabanlı bir B2B SaaS platformu.

## Yapılanlar / Kapsam
- Tech stack tanımlandı: [[entities/nextjs-app-router]] (App Router + API Routes), [[entities/supabase]] (PostgreSQL + RLS + Auth), [[entities/vercel]] (hosting), [[entities/lemonsqueezy]] (abonelik) + Payoneer (payout), Ruul.io (faturalandırma), `next-intl` (EN/DE/FR/ZH/JA/TR/RU).
- Kurumsal mimari: RBAC (Yönetici/Editör/İzleyici), AI destekli stok tükenme tahmini (Smart Thresholds), gerçek zamanlı webhook'lar, [[entities/redis-upstash]] tabanlı mesaj kuyruğu + rate limiting, denetim izleri (audit logs), Docker ile yerel Supabase/Redis.
- Güvenlik/analitik: [[entities/sentry]], n8n (Slack/Telegram/SMS/E-posta dağıtımı için), React Email, Cloudflare Turnstile, PostHog.
- Veritabanı şeması: `teams`, `team_members`, `connected_stores`, `products`, `alerts`, `audit_logs`.
- **İzleme Merkezi (Hub & Spoke):** Bu proje ayrı bir Monitoring Hub'a "spoke" olarak raporlama yapar — bkz. [[entities/saas-test-dashboard]]. Health/error dispatch env değişkenleri: `APP_NAME`, `HUB_ENVIRONMENT`, `HUB_URL`, `HUB_WEBHOOK_SECRET`, `HUB_API_KEY`.

## Etkilenen Dosyalar / Alanlar
`apps/dashboard/src/app/api/health/route.ts`, `apps/dashboard/src/lib/hub-reporter.ts`, `apps/dashboard/instrumentation.ts` (aynı desen `apps/landing` içinde de var).

## Kararlar
- [[decisions/lemonsqueezy-odeme-secimi]]
- [[decisions/hub-and-spoke-izleme-mimarisi]] (bu proje bir "spoke")

## Sorunlar
Yok (bu kaynakta açık bir sorun/hata kaydı yok — sadece planlama spec'i).

## Açık Konular
- Monitoring Hub'ın kendisi bu repo dışında ayrı bakımı yapılan bir servis — entegrasyon detayları kendi reposunda.

## Kaynaklar
- raw/projects/01-eticaret-stok-uyari-sistemi.md

## İlgili
- [[entities/eticaret-stok-uyari-sistemi]]
- [[entities/saas-test-dashboard]]
- [[concepts/rbac]]
- [[concepts/hub-and-spoke-mimarisi]]
- [[concepts/i18n]]
