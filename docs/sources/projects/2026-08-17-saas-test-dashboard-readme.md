---
title: SaaS Test Dashboard (Monitoring Hub) README — Kaynak Özeti
tags: [source, saas, monitoring, hub-and-spoke]
source: raw/projects/02-saas-test-dashboard-readme.md
date: 2026-08-17
status: active
---

# SaaS Test Dashboard (Monitoring Hub) README — Kaynak Özeti

## Hedef
4 bağımsız SaaS uygulaması için merkezi "Hub and Spoke" izleme: aktif health polling, dahili hata webhook'ları, Test Sprite E2E webhook'ları, throttle'lı SMTP e-posta uyarıları.

## Yapılanlar
- Stack: [[entities/nextjs-app-router]] + TypeScript + Tailwind, [[entities/prisma]]/[[entities/sqlite]], Nodemailer, `jose`-imzalı oturum çerezi.
- Kurulum: `.env` değişkenleri (`CRON_SECRET`, `HUB_WEBHOOK_SECRET`, `TESTSPRITE_SECRET`, `AUTH_SECRET`, `AUTH_USERS`, SMTP bloğu) — **değerler wiki'ye kopyalanmadı**, sadece değişken adları (CLAUDE.md kural 5).
- 4 uygulama Applications sayfasından `name` + `environment` (production/local) + `url` + `apiKey` ile kaydediliyor; aynı `name` iki ortamda ayrı satır olarak tutulabiliyor.
- Cron: poller (`/api/cron/poll`, 5 dk) ve cleanup (`/api/cron/cleanup`, günlük) — dış scheduler (Vercel Cron/GitHub Actions/crontab) tetikliyor, uygulama içinde timer yok.
- Alerting: her hata önce `ErrorLog`'a yazılır; e-posta sadece `ALERT_THROTTLE_MINUTES` (varsayılan 15) içinde tekrar gönderilmemişse atılır — bu durum `ErrorLog.alertSentAt` ile DB'de kalıcı tutulur (in-memory değil). `down` → `healthy` geçişinde throttle'a tabi olmayan tek seferlik kurtarma e-postası var. Throttle `(name, environment)` bazında ayrı.

## Etkilenen Dosyalar
`prisma/schema.prisma`, `src/lib/prisma.ts`, `src/lib/mailer.ts`, `src/lib/api-auth.ts`, `src/lib/auth.ts`, `src/lib/environment.ts`, `src/proxy.ts`, `src/app/api/cron/poll`, `src/app/api/cron/cleanup`, `src/app/api/webhooks/errors`, `src/app/api/webhooks/testsprite`, `src/app/api/apps`, `docs/spoke-integration.md`.

## Kararlar
- [[decisions/hub-and-spoke-izleme-mimarisi]]
- [[decisions/durable-throttle-marker]] — spec'te olmayan `ErrorLog.alertSentAt` eklendi.

## Sorunlar
- [[issues/durum-degerleri-tutarsizligi]] — spec'in `CRITICAL` değeri ile uygulanan `"healthy"|"warning"|"down"` şeması arasındaki fark, `normalizeStatus()` ile çözülmüş.

## Açık Konular
- `local` ortam için alert mute etme yolu yok — laptop kapalıyken spam olabilir, tek çözüm `ALERT_THROTTLE_MINUTES`'ı yükseltmek.

## Kaynaklar
- raw/projects/02-saas-test-dashboard-readme.md

## İlgili
- [[entities/saas-test-dashboard]]
- [[sources/projects/2026-08-17-spoke-integration]]
- [[sources/projects/2026-08-14-saas-test-dashboard-spec]]
- [[concepts/alert-throttling]]
- [[concepts/hub-and-spoke-mimarisi]]
