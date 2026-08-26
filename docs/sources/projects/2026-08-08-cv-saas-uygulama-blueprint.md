---
title: CV & Resume Generator SaaS — Geliştirme Blueprint'i — Kaynak Özeti
tags: [source, saas, ai, b2c, b2b]
source: raw/projects/05-cv-saas-uygulama-blueprint.md
date: 2026-08-08
status: active
---

# CV & Resume Generator SaaS — Geliştirme Blueprint'i — Kaynak Özeti

## Hedef
B2C ve B2B kullanıcılara yönelik yapay zeka destekli CV/özgeçmiş/aday sunum dosyası oluşturma SaaS'ı; Vercel/Netlify üzerinde tamamen serverless.

## Yapılanlar
- **Kritik kısıtlama:** tüm arka plan görevleri (AI, dosya dönüştürme, toplu Excel işleme) doğrudan backend'e entegre edilecek — **n8n veya benzeri harici otomasyon aracı kullanılmayacak** (bkz. [[decisions/n8nden-bagimsizlasma]]).
- Stack: [[entities/nextjs-app-router]] fullstack, Tailwind, serverless kuyruk (Upstash QStash / Inngest / BullMQ uyumlu), PostgreSQL (Supabase/Neon/Vercel Postgres), OpenAI/Anthropic API, `xlsx`, PDF/DOCX üretim kütüphaneleri.
- B2C: taslak yükleyerek CV oluşturma (PDF/DOCX/TXT parse) veya sıfırdan form ile oluşturma (boş alanlara **placeholder enjeksiyonu**).
- B2B: Excel/CSV toplu yükleme → 3 çıktı formatı (Profesyonel CV, Resume, Taşeron Sunumu — iletişim bilgileri gizli) → background worker → ZIP teslimat.
- SaaS çekirdeği: landing page'de zorunlu ROI metriği bölümü, Stripe/Iyzico ile B2C/B2B iki ayrı abonelik katmanı, role-based dashboard.

## Etkilenen Dosyalar / Alanlar
Veritabanı: kullanıcı rolleri, abonelik durumu, B2C belge geçmişi, B2B job status tabloları.

## Kararlar
- [[decisions/n8nden-bagimsizlasma]]
- [[decisions/b2b-toplu-isleme-arka-plan-worker]]

## Sorunlar
Yok (planlama belgesi).

## Açık Konular
- Backend'in ayrı bir serviste (Render/Railway) mi yoksa Next.js fullstack mi olacağı net değil — "Vercel/Netlify deployment'ı için Next.js Fullstack tercih edilmeli" notu var ama kesinleştirilmemiş.

## Kaynaklar
- raw/projects/05-cv-saas-uygulama-blueprint.md

## İlgili
- [[entities/cv-hazirlama-otomasyonu]]
- [[sources/projects/2026-08-08-cv-saas-readme]]
- [[concepts/placeholder-enjeksiyonu]]
- [[concepts/serverless-arka-plan-isleme]]
