---
title: n8n Webhook CORS Riski ve Prototip/Dönüşüm Çelişkisi
tags: [issue, n8n, cors, celiski]
source: sources/projects/2026-07-23-otomasyon-arayuz-talimatlari.md
date: 2026-08-04
status: active
---

# n8n Webhook CORS Riski ve Prototip/Dönüşüm Çelişkisi

## Kök Neden
[[sources/projects/2026-07-23-otomasyon-arayuz-talimatlari]] belgesindeki statik `index.html` arayüzü, tarayıcıdan doğrudan n8n webhook'una `fetch()` ile POST atıyor. n8n tarafında CORS ("Respond to Options" veya CORS env değişkenleri) doğru yapılandırılmazsa istek tarayıcı tarafında sessizce başarısız olur; rehber bunu "Çok Önemli!" diye işaretlemiş ama otomatik bir doğrulama/hata toleransı sunmuyor — kullanıcı manuel kontrol etmek zorunda.

Ayrıca bu belge, aynı proje ([[entities/eticaret-gorsel-uretimi]]) için daha yeni tarihli [[sources/projects/2026-08-04-saas-donusum-talimatlari]] ile **çelişiyor**: o belge n8n'i tamamen ortadan kaldırmayı, bu belge ise n8n'e webhook ile bağlanmayı talimatlandırıyor.

## ÇELİŞKİ
- Kaynak A (2026-07-23): n8n webhook'una bağlı statik arayüz kurulumu.
- Kaynak B (2026-08-04): "mevcut n8n tabanlı prototipi... dönüştür", n8n kullanımını yasaklıyor.
- Vault'ta hangi belgenin şu an geçerli olduğunu netleştiren bir üçüncü kaynak (ör. bir ilerleme raporu) **yok**. Sadece tarih sırasından (B, A'dan sonra) B'nin daha güncel niyet olduğu çıkarılabiliyor — bu bir varsayımdır, doğrulanmış bir gerçek değildir.

## Düzeltme
Henüz kaynaklarda belgelenmiş bir düzeltme yok — bu açık bir konu olarak kalıyor (bkz. [[syntheses/acik-riskler-ve-bosluklar]]).

## İlgili Dosyalar
`index.html` (eski prototip, tek dosya).

## Kaynaklar
- [[sources/projects/2026-07-23-otomasyon-arayuz-talimatlari]]
- [[sources/projects/2026-08-04-saas-donusum-talimatlari]]

## İlgili
- [[entities/eticaret-gorsel-uretimi]]
- [[entities/n8n]]
- [[decisions/n8nden-bagimsizlasma]]
- [[syntheses/acik-riskler-ve-bosluklar]]
