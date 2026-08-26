---
title: Alert Throttling
tags: [concept, monitoring, alerting]
source: sources/projects/2026-08-17-saas-test-dashboard-readme.md
date: 2026-08-17
status: active
---

# Alert Throttling

Aynı hata/olay için art arda çok sayıda alarm e-postası atılmasını önleyen sınırlama mekanizması. [[entities/saas-test-dashboard]]'da `(name, environment)` bazında, DB'de kalıcı bir "son gönderim zamanı" işaretiyle (bkz. [[decisions/durable-throttle-marker]]) uygulanıyor — varsayılan pencere 15 dakika.

## Kaynaklar
- [[sources/projects/2026-08-17-saas-test-dashboard-readme]]
- [[sources/projects/2026-08-14-saas-test-dashboard-spec]]

## İlgili
- [[entities/saas-test-dashboard]]
- [[decisions/durable-throttle-marker]]
- [[issues/durum-degerleri-tutarsizligi]]
