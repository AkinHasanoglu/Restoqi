---
title: CV & Resume Generator SaaS README — Kaynak Özeti
tags: [source, saas, ai, implementation]
source: raw/projects/06-cv-saas-readme.md
date: 2026-08-08
status: active
---

# CV & Resume Generator SaaS README — Kaynak Özeti

## Hedef
[[sources/projects/2026-08-08-cv-saas-uygulama-blueprint]]'in uygulanmış hâli — mevcut kod tabanının fiili mimarisini belgeler.

## Yapılanlar
- Stack: Next.js 16 (`proxy.ts` middleware — eski adıyla "middleware"), Tailwind 4, PostgreSQL (Neon/Supabase/Vercel Postgres) **yoksa yerel JSON file-store fallback**, OpenAI/Anthropic **opsiyonel** (yoksa offline şablon motoru), PDFKit/`docx`/`xlsx`/`pdf-parse`/`mammoth`, Stripe, **Vercel Cron** → `/api/cron/process-jobs` (Inngest/QStash değil, blueprint'ten sapma).
- Veri deposu: `lib/db/index.ts`'teki `getStore()`, `DATABASE_URL` tanımlıysa `PostgresStore`, değilse `FileStore` — iki implementasyon birebir aynı arayüzü paylaşıyor.
- B2B iş akışı: Excel yükle → `job` + `job_rows` → `vercel.json` cron'u (`* * * * *`) her dakika `/api/cron/process-jobs`'u çağırır → tamamlanınca ZIP. Küçük dosyalar geliştirmede senkron da işlenebilir.
- Ödeme: `STRIPE_SECRET_KEY` yoksa `/api/stripe/simulate` ile demo modu.
- Deploy: Vercel (önerilen, Root Directory `CV_SaaS`) veya Netlify (`netlify.toml` + harici cron gerekebilir). Custom domain DNS adımları belgelenmiş.

## Etkilenen Dosyalar
`app/api/{auth,cv,b2b,cron,stripe,contact}`, `app/dashboard`, `app/proxy.ts`, `lib/db`, `lib/cv`, `lib/b2b`, `lib/ai`, `db/schema.sql`, `vercel.json`, `pdf-test.ts`.

## Kararlar
- [[decisions/b2b-toplu-isleme-arka-plan-worker]] — Vercel Cron seçimi, blueprint'teki Inngest/QStash önerisinden sapma.

## Sorunlar
Yok — ama blueprint'teki "Inngest/QStash" önerisi ile READMEnin "Vercel Cron" seçimi arasında bir **kasıtlı sapma** var (spec'ten sapma, çelişki değil — README bunu örtük olarak gösteriyor, açıkça "deviation" diye işaretlenmemiş).

## Açık Konular
- `.data/` JSON file-store yalnızca geliştirme için; production'da mutlaka `DATABASE_URL` gerekli — unutulursa veri kaybı riski.

## Kaynaklar
- raw/projects/06-cv-saas-readme.md

## İlgili
- [[entities/cv-hazirlama-otomasyonu]]
- [[sources/projects/2026-08-08-cv-saas-uygulama-blueprint]]
- [[concepts/serverless-arka-plan-isleme]]
