---
title: Açık Riskler ve Boşluklar
tags: [synthesis, risk, boluk]
source: issues/
date: 2026-08-17
status: active
---

# Açık Riskler ve Boşluklar

Bu vault'un mevcut 9 kaynağından çıkan, henüz kaynaklarda çözülmemiş konular.

## 1. n8n Prototip / Dönüşüm Çelişkisi
[[entities/eticaret-gorsel-uretimi]] için vault'ta hem eski n8n-bağımlı prototip talimatı hem de onu ortadan kaldırmayı hedefleyen dönüşüm talimatı duruyor; hangisinin geçerli/tamamlanmış olduğunu gösteren bir üçüncü kaynak yok. Detay: [[issues/n8n-cors-webhook-sorunu]].

## 2. APP_NAME Manuel Eşleme Riski
[[entities/saas-test-dashboard]]'a bağlanan spoke'ların `APP_NAME` değeri otomatik doğrulanmıyor — typo riski sessiz "izlenmiyor" durumuna yol açabilir. Detay: [[issues/app-name-esleme-riski]].

## 3. Spec/Uygulama Sürüklenmesi (Drift)
[[sources/projects/2026-08-14-saas-test-dashboard-spec]] ile [[sources/projects/2026-08-17-saas-test-dashboard-readme]] arasında birden fazla sapma var (durum değerleri, retention süresi artık env değişkeni, ek `alertSentAt` alanı). Bunlar README'de "deliberate deviations" olarak kısmen belgelenmiş ama spec dosyası güncellenmemiş — gelecekte yeni biri spec'i okuyup yanlış varsayımlarla geliştirme yapabilir.

## 4. `local` Ortam İçin Alert Mute Yok
[[entities/saas-test-dashboard]]'da bir `local` deployment uzun süre kapalıyken alarm spam'ini durdurmanın tek yolu global `ALERT_THROTTLE_MINUTES`'ı yükseltmek — ortam bazlı mute özelliği yok.

## 5. Ödeme Sağlayıcı Standardizasyonu Yok
Bkz. [[syntheses/monetizasyon-ve-odeme-altyapisi]] — 4 projede 3 farklı ana sağlayıcı (+1 belirsiz), portföy genelinde bir "varsayılan ödeme sağlayıcısı" kararı henüz alınmamış.

## 6. Kapsam Dışı Bırakılan Kaynaklar
`Lavanchor/SaaS/UGC/` (README 1.7K, minimum boyut eşiğinin altında) ve `Lavanchor/SaaS/Sesli AI Chatbot/` (markdown kaynak yok) bu ingest turunda taranmadı — portföyün tam resmi için ileride ayrı bir ingest gerekebilir.

## Kaynaklar
Tüm `issues/` altındaki sayfalar + lint bulguları.

## İlgili
- [[issues/n8n-cors-webhook-sorunu]]
- [[issues/app-name-esleme-riski]]
- [[issues/durum-degerleri-tutarsizligi]]
- [[syntheses/saas-portfoy-genel-bakis]]
