---
title: Hub & Spoke İzleme Mimarisi — Ayrı, Bağımsız Monitoring Servisi
tags: [decision, mimari, monitoring]
source: sources/projects/2026-08-17-saas-test-dashboard-readme.md
date: 2026-08-17
status: active
---

# Hub & Spoke İzleme Mimarisi — Ayrı, Bağımsız Monitoring Servisi

## Karar
[[entities/saas-test-dashboard]] (Monitoring Hub), her bir SaaS uygulamasının repository'sine gömülmek yerine **ayrı, bağımsız bir uygulama** olarak inşa edildi. İzlenen her SaaS ("spoke") kendi reposunda küçük bir health endpoint + hata dispatcher taşır; asıl DB, dashboard ve alerting mantığı tek bir merkezi Hub'da toplanır.

## Gerekçe
- Tek bir yerden 4 bağımsız uygulamanın sağlığını izlemek, her birine ayrı ayrı izleme altyapısı kurmaktan daha az bakım yükü yaratıyor.
- [[entities/eticaret-stok-uyari-sistemi]] spec'inde açıkça belirtiliyor: "Merkezi izleme Hub'ı bu reponun **dışında**, ayrı bir uygulama olarak bakımı yapılan bağımsız bir servistir."
- Spoke tarafı minimal tutulmuş (tek health route + tek middleware), Hub tarafı ise DB/dashboard/alerting karmaşıklığını taşıyor — sorumluluk ayrımı net.

## Uygulama Detayları
- Health: Hub 5 dakikada bir `GET {url}/api/health`'i `Bearer <apiKey>` ile çağırır.
- Hata: Spoke'un 5xx'leri `errorDispatcher` middleware'i ile Hub'ın `/api/webhooks/errors`'una fire-and-forget POST edilir.
- Ortam ayrımı: aynı `APP_NAME` production ve local için ayrı satır olarak kayıt edilebiliyor — loglar/throttle birbirinden bağımsız.

## Kaynaklar
- [[sources/projects/2026-08-17-eticaret-stok-uyari-sistemi]]
- [[sources/projects/2026-08-17-saas-test-dashboard-readme]]
- [[sources/projects/2026-08-17-spoke-integration]]
- [[sources/projects/2026-08-14-saas-test-dashboard-spec]]

## İlgili
- [[entities/saas-test-dashboard]]
- [[entities/eticaret-stok-uyari-sistemi]]
- [[concepts/hub-and-spoke-mimarisi]]
- [[concepts/webhook-tabanli-entegrasyon]]
- [[syntheses/tekrar-eden-mimari-kararlar]]
