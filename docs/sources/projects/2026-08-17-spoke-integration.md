---
title: Spoke Entegrasyon Rehberi (Express) — Kaynak Özeti
tags: [source, monitoring, webhook, express]
source: raw/projects/03-spoke-integration.md
date: 2026-08-17
status: active
---

# Spoke Entegrasyon Rehberi (Express) — Kaynak Özeti

## Hedef
İzlenen 4 SaaS uygulamasının her birine kopyala-yapıştır ile entegre edilecek health-check ve hata dispatch kodu.

## Yapılanlar
- `spoke-health.js` (`GET /api/health`) ve `spoke-error-dispatcher.js` (global Express hata yakalayıcı) — Hub'a fire-and-forget, 5 saniyelik timeout ile POST.
- Spoke `.env`: `APP_NAME` (Hub'daki `name` ile birebir eşleşmeli), `HUB_ENVIRONMENT` (production/local, varsayılan production), `HUB_API_KEY`, `HUB_URL`, `HUB_WEBHOOK_SECRET`.
- Beklenen davranış: health check `Authorization: Bearer <apiKey>` ile 10 sn içinde 200 bekler; DB hatasında 503 + `unhealthy` döner. Error dispatcher sadece `status >= 500` olan hataları iletir (4xx gönderilmez).
- Test Sprite entegrasyonu Hub tarafında; spoke'ta ek kod gerekmiyor.

## Etkilenen Dosyalar
`docs/spoke-health.js`, `docs/spoke-error-dispatcher.js` (bu dosyalar `raw/projects/03-spoke-integration.md`'nin işaret ettiği klasörde).

## Kararlar
Yok (bu kaynak, [[decisions/hub-and-spoke-izleme-mimarisi]] kararının uygulama detayı — ayrı bir karar üretmiyor).

## Sorunlar
Yok.

## Açık Konular
- `APP_NAME` eşleşmesi manuel bir sözleşme — yanlış yazılırsa health check sessizce "kayıtlı değil" durumuna düşebilir. Bkz. [[issues/app-name-esleme-riski]].

## Kaynaklar
- raw/projects/03-spoke-integration.md

## İlgili
- [[entities/saas-test-dashboard]]
- [[sources/projects/2026-08-17-saas-test-dashboard-readme]]
- [[concepts/webhook-tabanli-entegrasyon]]
