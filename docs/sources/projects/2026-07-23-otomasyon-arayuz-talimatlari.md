---
title: E-Ticaret Görsel Otomasyonu — Web Arayüzü Kurulum Rehberi — Kaynak Özeti
tags: [source, n8n, prototype, webhook]
source: raw/projects/09-otomasyon-arayuz-talimatlari.md
date: 2026-07-23
status: active
---

# E-Ticaret Görsel Otomasyonu — Web Arayüzü Kurulum Rehberi — Kaynak Özeti

## Hedef
n8n üzerinde çalışan ürün görseli/lifestyle video üretim otomasyonunu tetikleyecek, dışa bağımlılığı olmayan (Vanilla JS/CSS) tek dosyalık bir web arayüzü kurmak.

## Yapılanlar
- Tek `index.html` dosyası — form (ürün görseli URL + e-posta) → n8n webhook'una `fetch()` ile POST.
- Kurulum: n8n webhook URL'sinin koda gömülmesi, n8n tarafında CORS ayarlarının ("Respond to Options" veya CORS env değişkenleri) yapılandırılması gerekiyor.
- Dağıtım: statik dosya olarak Netlify/Vercel/GitHub Pages'e veya doğrudan yerel olarak çalıştırılabilir; notta örnek bir Netlify linki geçiyor.

## Etkilenen Dosyalar
`index.html` (tek dosya, harici bağımlılık yok).

## Kararlar
Yok — bu kaynak, sonradan tersine çevrilen bir n8n-merkezli prototip yaklaşımını belgeliyor (bkz. [[decisions/n8nden-bagimsizlasma]]).

## Sorunlar
- [[issues/n8n-cors-webhook-sorunu]] — CORS yapılandırılmazsa form isteği tarayıcı tarafında sessizce başarısız olur; rehber bunu "Çok Önemli!" diye işaretlemiş ama hataya dayanıklı bir çözüm sunmuyor (sadece kullanıcı uyarısı).

## Açık Konular
- Bu prototip [[sources/projects/2026-08-04-saas-donusum-talimatlari]] ile aynı proje klasöründe duruyor ve o belge n8n'i tamamen kaldırmayı hedefliyor — bu dosyanın hâlâ geçerli mi yoksa arşivlenmesi mi gerektiği kaynaklardan çıkarılamıyor (bkz. ÇELİŞKİ notu).

## Kaynaklar
- raw/projects/09-otomasyon-arayuz-talimatlari.md

## İlgili
- [[entities/eticaret-gorsel-uretimi]]
- [[entities/n8n]]
- [[sources/projects/2026-08-04-saas-donusum-talimatlari]]
- [[issues/n8n-cors-webhook-sorunu]]
