---
title: Durable Throttle Marker — ErrorLog.alertSentAt Eklenmesi
tags: [decision, mimari, alerting, spec-sapma]
source: sources/projects/2026-08-17-saas-test-dashboard-readme.md
date: 2026-08-17
status: active
---

# Durable Throttle Marker — ErrorLog.alertSentAt Eklenmesi

## Karar
[[entities/saas-test-dashboard]] uygulaması, orijinal Prisma şemasında ([[sources/projects/2026-08-14-saas-test-dashboard-spec]]) olmayan bir `ErrorLog.alertSentAt` alanı ekledi.

## Gerekçe
15 dakikalık e-posta throttle mekanizmasının "bu app için son ne zaman e-posta gönderildi" bilgisini kalıcı (durable) tutması gerekiyor. In-memory bir sayaç kullanılsaydı, her deploy/restart'ta throttle state'i sıfırlanır ve outage sırasında spam email riski doğardı. DB'ye yazılan `alertSentAt`, restart'lardan bağımsız çalışıyor.

## İlgili Sapmalar (Aynı Kaynakta Belirtilen)
- Status değerleri `"healthy"|"warning"|"down"` olarak normalize edildi (spec'in `CRITICAL`'ından farklı) — bkz. [[issues/durum-degerleri-tutarsizligi]].
- Ek indeksler eklendi: `HealthLog(createdAt)` (cleanup job için), `ErrorLog(appId, createdAt)` (throttle lookup için).

## Kaynaklar
- [[sources/projects/2026-08-17-saas-test-dashboard-readme]]
- [[sources/projects/2026-08-14-saas-test-dashboard-spec]]

## İlgili
- [[entities/saas-test-dashboard]]
- [[issues/durum-degerleri-tutarsizligi]]
- [[concepts/alert-throttling]]
