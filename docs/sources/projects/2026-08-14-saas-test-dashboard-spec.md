---
title: Centralized SaaS Monitoring Hub — Orijinal Spec — Kaynak Özeti
tags: [source, monitoring, spec]
source: raw/projects/04-saas-test-dashboard-spec.md
date: 2026-08-14
status: active
---

# Centralized SaaS Monitoring Hub — Orijinal Spec — Kaynak Özeti

## Hedef
"Hub and Spoke" merkezi izleme mimarisinin production-ready spesifikasyonu: 4 SaaS'ın aktif polling ile izlenmesi, dahili hata webhook'ları, Test Sprite E2E entegrasyonu, doğrudan SMTP alarmları.

## Yapılanlar
- Stack talebi: [[entities/nextjs-app-router]] + React + Tailwind + TypeScript; DB [[entities/sqlite]] veya PostgreSQL + [[entities/prisma]]; arka plan işler için Node.js Cron / `node-cron`; Nodemailer.
- Prisma şeması taslağı: `Application` (`status` alanı `"healthy"|"down"|"warning"` varsayılanlı), `HealthLog`, `ErrorLog` (`source`: `internal`/`test_sprite`, `severity`, `resolved`).
- Polling: her 5 dakikada bir; hata/timeout durumunda status `CRITICAL` yapılır ve `sendAlertEmail` tetiklenir (**not:** şemadaki varsayılan `"healthy"` string kümesiyle `CRITICAL` tutarsız — bkz. [[issues/durum-degerleri-tutarsizligi]]).
- Rate limiting: aynı `appId` için 15 dakika içinde ikinci e-posta atılmaz (spec seviyesinde "CRITICAL" kural, uygulamada throttle mekanizması farklı isimlendirilmiş `alertSentAt` ile somutlaştı).
- Data retention: `HealthLog` kayıtları 7 günden eskiyse silinir (uygulamada `HEALTH_LOG_RETENTION_DAYS` olarak yapılandırılabilir hale geldi — bkz. [[sources/projects/2026-08-17-saas-test-dashboard-readme]]).

## Etkilenen Dosyalar
`prisma/schema.prisma` (taslak).

## Kararlar
- [[decisions/hub-and-spoke-izleme-mimarisi]]

## Sorunlar
- [[issues/durum-degerleri-tutarsizligi]] — spec'in kendi içinde `CRITICAL` (polling bölümü) ile `"healthy"|"down"|"warning"` (şema) arasında baştan beri tutarsızlık var; uygulama bunu `normalizeStatus()` ile çözmüş.

## Açık Konular
- Spec 7 günlük retention diyor, README'de bu artık env değişkeni — spec güncellenmemiş, drift var.

## Kaynaklar
- raw/projects/04-saas-test-dashboard-spec.md

## İlgili
- [[entities/saas-test-dashboard]]
- [[sources/projects/2026-08-17-saas-test-dashboard-readme]]
- [[concepts/alert-throttling]]
