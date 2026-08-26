---
title: Fintech SaaS Application Blueprint — Kaynak Özeti
tags: [source, saas, fintech, dashboard]
source: raw/projects/07-fintech-yatirim-dashboard.md
date: 2026-08-08
status: active
---

# Fintech SaaS Application Blueprint — Kaynak Özeti

## Hedef
Teknik analiz, özelleştirilebilir piyasa dashboard'u, on-chain metrikler, "smart money" portföy takibi, piyasa haberleri ve sosyal topluluk için hepsi-bir-arada abonelik tabanlı fintech SaaS.

## Yapılanlar
- Stack: Backend Python (FastAPI) veya Node.js/Express; Frontend React/Next.js + TradingView Lightweight Charts + Recharts/Chart.js; [[entities/postgresql]] + [[entities/redis-upstash]]; ödeme [[entities/stripe]]/[[entities/lemonsqueezy]]/Paddle.
- **Mimari kural (KATI):** n8n veya herhangi bir harici workflow otomasyon aracı kullanılmayacak — tüm arka plan görevleri (haber çekme, on-chain metrik, zamanlama) doğrudan backend API içine entegre edilecek (Celery, APScheduler veya native worker) (bkz. [[decisions/n8nden-bagimsizlasma]]).
- Özellikler: teknik analiz modülü (kripto/emtia/hisse), özelleştirilebilir dashboard, RSS/haber API'lerinden beslenen haber akışı, on-chain metrikler (NVT, hash rate, aktif adres), ünlü yatırımcı portföy takibi (pasta grafik), whale tracking, WebSocket tabanlı topluluk sohbeti + "yatırım tavsiyesi değildir" moderasyon filtresi.
- Deployment: frontend Vercel/Netlify, backend/DB Docker ile Render/Railway/AWS/DigitalOcean, custom domain + CORS + SSL production-ready.

## Etkilenen Dosyalar / Alanlar
`docker-compose.yml`, PostgreSQL şeması (Users, Subscriptions, Dashboard Items, Portfolios, Chat Messages).

## Kararlar
- [[decisions/n8nden-bagimsizlasma]]

## Sorunlar
Yok (planlama belgesi, adım adım onay bekleyen bir yürütme planı — henüz uygulanmamış görünüyor).

## Açık Konular
- Backend dili (Python/FastAPI vs Node/Express) henüz kesinleşmemiş — "optimal performansa göre" seçilecek deniyor.

## Kaynaklar
- raw/projects/07-fintech-yatirim-dashboard.md

## İlgili
- [[entities/yatirim-dashboard-uygulamasi]]
- [[concepts/freemium-abonelik-modeli]]
