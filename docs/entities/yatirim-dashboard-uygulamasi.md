---
title: Yatırım Dashboard Uygulaması (Fintech SaaS)
tags: [entity, proje, saas, fintech]
source: sources/projects/2026-08-08-fintech-yatirim-dashboard.md
date: 2026-08-08
status: draft
---

# Yatırım Dashboard Uygulaması (Fintech SaaS)

Teknik analiz, özelleştirilebilir piyasa dashboard'u, on-chain metrikler, smart-money portföy takibi, haber akışı ve sosyal topluluğu bir araya getiren abonelik tabanlı fintech SaaS'ı. Henüz adım adım onay bekleyen bir plan aşamasında (kaynak, Claude Code'dan Step 1 öncesi onay istiyor).

## Stack
Backend Python/FastAPI veya Node/Express (kesinleşmemiş), React/Next.js + TradingView Lightweight Charts, [[entities/postgresql]] + [[entities/redis-upstash]], [[entities/stripe]]/[[entities/lemonsqueezy]]/Paddle.

## Öne Çıkan Özellikler
- Whale tracking, on-chain metrikler (NVT, hash rate)
- WebSocket topluluk sohbeti + "yatırım tavsiyesi değildir" moderasyonu
- `n8n kullanılmayacak` kısıtı (KATI kural) — bkz. [[decisions/n8nden-bagimsizlasma]]

## Kaynaklar
- [[sources/projects/2026-08-08-fintech-yatirim-dashboard]]

## İlgili
- [[decisions/n8nden-bagimsizlasma]]
- [[concepts/freemium-abonelik-modeli]]
- [[syntheses/saas-portfoy-genel-bakis]]
