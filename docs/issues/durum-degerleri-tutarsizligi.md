---
title: Durum Değerleri Tutarsızlığı — CRITICAL vs. healthy/warning/down
tags: [issue, monitoring, spec-drift]
source: sources/projects/2026-08-14-saas-test-dashboard-spec.md
date: 2026-08-17
status: active
---

# Durum Değerleri Tutarsızlığı — CRITICAL vs. healthy/warning/down

## Kök Neden
[[sources/projects/2026-08-14-saas-test-dashboard-spec]] (orijinal spec) kendi içinde tutarsız: polling engine bölümü, hata durumunda uygulama durumunu `CRITICAL` yapmayı söylerken, aynı belgedeki Prisma şema taslağı `Application.status` alanı için `"healthy"|"down"|"warning"` varsayılan kümesini tanımlıyor. `CRITICAL` bu kümede yok.

## Düzeltme
[[entities/saas-test-dashboard]]'ın uygulanmış hâlinde ([[sources/projects/2026-08-17-saas-test-dashboard-readme]]) `src/lib/status.ts` içindeki `normalizeStatus()` fonksiyonu, `"CRITICAL"` dahil tanınmayan her değeri `"down"`a eşliyor. Böylece şema tek bir tutarlı küme (`healthy | warning | down`) etrafında birleşiyor.

## İlgili Dosyalar
`src/lib/status.ts`, `prisma/schema.prisma`.

## Kaynaklar
- [[sources/projects/2026-08-14-saas-test-dashboard-spec]]
- [[sources/projects/2026-08-17-saas-test-dashboard-readme]]

## İlgili
- [[entities/saas-test-dashboard]]
- [[decisions/durable-throttle-marker]]
- [[concepts/alert-throttling]]
