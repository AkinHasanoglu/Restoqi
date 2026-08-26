---
title: SaaS Test Dashboard (Monitoring Hub)
tags: [entity, proje, saas, monitoring]
source: sources/projects/2026-08-17-saas-test-dashboard-readme.md
date: 2026-08-17
status: active
---

# SaaS Test Dashboard (Monitoring Hub)

4 bağımsız SaaS uygulaması için merkezi "Hub and Spoke" izleme sistemi: health polling, hata webhook'ları, Test Sprite E2E webhook'ları, throttle'lı SMTP alarmları. Diğer 5 kaynak projedeki [[entities/eticaret-stok-uyari-sistemi]] gibi uygulamalar buraya "spoke" olarak bağlanabilir.

## Stack
[[entities/nextjs-app-router]], [[entities/prisma]], [[entities/sqlite]], Nodemailer, `jose`.

## Mimari
[[concepts/hub-and-spoke-mimarisi]] — Hub merkezi dashboard + DB; her spoke `GET /api/health` sunar ve 5xx hatalarını Hub'a fire-and-forget webhook ile iletir.

## Kaynaklar
- [[sources/projects/2026-08-17-saas-test-dashboard-readme]]
- [[sources/projects/2026-08-17-spoke-integration]]
- [[sources/projects/2026-08-14-saas-test-dashboard-spec]]

## İlgili
- [[decisions/hub-and-spoke-izleme-mimarisi]]
- [[decisions/durable-throttle-marker]]
- [[issues/durum-degerleri-tutarsizligi]]
- [[issues/app-name-esleme-riski]]
- [[concepts/alert-throttling]]
- [[concepts/webhook-tabanli-entegrasyon]]
- [[syntheses/saas-portfoy-genel-bakis]]
