---
title: CV Hazırlama Otomasyonu (CV & Resume Generator SaaS)
tags: [entity, proje, saas, ai]
source: sources/projects/2026-08-08-cv-saas-readme.md
date: 2026-08-08
status: active
---

# CV Hazırlama Otomasyonu (CV & Resume Generator SaaS)

B2C ve B2B kullanıcılara yönelik yapay zeka destekli CV/özgeçmiş/aday sunum dosyası oluşturma SaaS'ı. Blueprint aşamasından uygulanmış koda geçmiş (README bunu belgeliyor).

## Stack
[[entities/nextjs-app-router]] (v16, `proxy.ts`), Tailwind 4, PostgreSQL (Neon/Supabase/Vercel Postgres, yoksa JSON file-store fallback), OpenAI/Anthropic (opsiyonel), [[entities/stripe]], Vercel Cron.

## Öne Çıkan Özellikler
- B2C: taslak yükleyerek veya form ile CV oluşturma, [[concepts/placeholder-enjeksiyonu]]
- B2B: Excel toplu yükleme → 3 format → ZIP teslimat
- `n8n kullanılmayacak` kısıtı — bkz. [[decisions/n8nden-bagimsizlasma]]

## Kaynaklar
- [[sources/projects/2026-08-08-cv-saas-uygulama-blueprint]]
- [[sources/projects/2026-08-08-cv-saas-readme]]

## İlgili
- [[decisions/n8nden-bagimsizlasma]]
- [[decisions/b2b-toplu-isleme-arka-plan-worker]]
- [[concepts/serverless-arka-plan-isleme]]
- [[syntheses/saas-portfoy-genel-bakis]]
