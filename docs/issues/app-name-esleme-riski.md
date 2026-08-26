---
title: APP_NAME Manuel Eşleme Riski — Spoke Kayıt Hatası
tags: [issue, monitoring, konfigurasyon]
source: sources/projects/2026-08-17-spoke-integration.md
date: 2026-08-17
status: active
---

# APP_NAME Manuel Eşleme Riski — Spoke Kayıt Hatası

## Kök Neden
[[entities/saas-test-dashboard]]'a bağlanan her spoke uygulama, kendi `.env`'indeki `APP_NAME` değerini Hub'ın Applications sayfasındaki `name` alanıyla **birebir aynı** yazmak zorunda — bu, kod ile veritabanı kaydı arasında doğrulanmayan, tamamen manuel bir sözleşme. Kaynakta bu eşleşmenin otomatik doğrulandığına dair bir mekanizma belirtilmiyor.

## Potansiyel Etki
Yanlış yazılmış (typo'lu, boşluklu, büyük/küçük harf farklı) bir `APP_NAME`, health check'in ya da error webhook'unun Hub'da "kayıtlı değil" olarak sessizce reddedilmesine yol açabilir — spoke uygulama sağlıklı çalışsa bile Hub onu "down" veya izlenmiyor olarak görebilir.

## Düzeltme
Kaynaklarda bu konuda bir otomatik doğrulama veya uyarı mekanizması belgelenmemiş — açık bir konu (bkz. [[syntheses/acik-riskler-ve-bosluklar]]).

## İlgili Dosyalar
Spoke `.env`, Hub Applications sayfası (kayıt formu).

## Kaynaklar
- [[sources/projects/2026-08-17-spoke-integration]]

## İlgili
- [[entities/saas-test-dashboard]]
- [[concepts/webhook-tabanli-entegrasyon]]
- [[syntheses/acik-riskler-ve-bosluklar]]
