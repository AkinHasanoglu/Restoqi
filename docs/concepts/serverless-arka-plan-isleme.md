---
title: Serverless Arka Plan İşleme
tags: [concept, mimari, serverless]
source: sources/projects/2026-08-08-cv-saas-uygulama-blueprint.md
date: 2026-08-08
status: active
---

# Serverless Arka Plan İşleme

Uzun süren işlerin (AI üretimi, toplu dosya işleme) geleneksel bir arka plan sunucusu yerine serverless fonksiyonlar/kuyruklar (Vercel Cron, Inngest, QStash, BullMQ) üzerinden yürütülmesi — Vercel/Netlify gibi zaman aşımı sınırlı platformlarda çalışabilmek için gerekli. [[decisions/n8nden-bagimsizlasma]] kararının teknik gerekçesi bu kavrama dayanıyor.

## Kaynaklar
- [[sources/projects/2026-08-08-cv-saas-uygulama-blueprint]]
- [[sources/projects/2026-08-08-cv-saas-readme]]

## İlgili
- [[decisions/n8nden-bagimsizlasma]]
- [[decisions/b2b-toplu-isleme-arka-plan-worker]]
- [[entities/vercel]]
