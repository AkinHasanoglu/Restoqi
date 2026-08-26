---
title: B2B Toplu İşleme İçin Vercel Cron — Blueprint'ten Sapma
tags: [decision, mimari, b2b, serverless]
source: sources/projects/2026-08-08-cv-saas-readme.md
date: 2026-08-08
status: active
---

# B2B Toplu İşleme İçin Vercel Cron — Blueprint'ten Sapma

## Karar
[[entities/cv-hazirlama-otomasyonu]]'nun B2B Excel toplu işleme akışı, blueprint'te önerilen Upstash QStash / Inngest / BullMQ yerine **Vercel Cron** (`vercel.json`, her dakika `/api/cron/process-jobs`'u çağırıyor) ile uygulanmış.

## Gerekçe
Kaynakta açık bir gerekçe cümlesi yok; README bunu sadece mimari bölümünde fiili implementasyon olarak sunuyor. Muhtemel sebep: Vercel Cron'un ek bir dış servis (QStash/Inngest hesabı) gerektirmeden, aynı deployment içinde en az sürtünmeli çözüm olması — ama bu **çıkarım**, kaynakta doğrulanmamış.

## Sonuç / Ödünleşim
- Basitlik: ek servis entegrasyonu yok.
- Kısıt: Vercel Cron'un dakika hassasiyeti ve platforma bağımlılığı var; küçük dosyalar için geliştirmede senkron/inline işleme de destekleniyor (fallback).

## Kaynaklar
- [[sources/projects/2026-08-08-cv-saas-uygulama-blueprint]]
- [[sources/projects/2026-08-08-cv-saas-readme]]

## İlgili
- [[entities/cv-hazirlama-otomasyonu]]
- [[entities/vercel]]
- [[concepts/serverless-arka-plan-isleme]]
