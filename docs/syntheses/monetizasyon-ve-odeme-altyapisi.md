---
title: Monetizasyon ve Ödeme Altyapısı
tags: [synthesis, odeme, monetizasyon]
source: decisions/lemonsqueezy-odeme-secimi.md
date: 2026-08-17
status: active
---

# Monetizasyon ve Ödeme Altyapısı

## Proje Başına Ödeme Sağlayıcısı
| Proje | Sağlayıcı | Model |
|---|---|---|
| [[entities/eticaret-stok-uyari-sistemi]] | [[entities/paddle]] (abonelik, 2026-08-21'de [[entities/lemonsqueezy]]'den geçildi) + Payoneer (payout) + Ruul.io (faturalandırma) | Abonelik, plan bazlı (Starter/Growth/Scale), 14 günlük reverse-trial |
| [[entities/cv-hazirlama-otomasyonu]] | [[entities/stripe]] / Iyzico | Bireysel $9, Kurumsal $99 — iki sabit katman, freemium değil |
| [[entities/yatirim-dashboard-uygulamasi]] | [[entities/stripe]] / [[entities/lemonsqueezy]] / Paddle (kesinleşmemiş) | Free Tier vs. Pro Tier |
| [[entities/eticaret-gorsel-uretimi]] | [[entities/stripe]] (Checkout) | Kredi bazlı (User.credits) |

## Gözlem
Portföyde **tek bir standart ödeme sağlayıcısı yok**. [[entities/eticaret-stok-uyari-sistemi]] LemonSqueezy'den Paddle'a geçmiş (bkz. [[decisions/paddle-odeme-secimi]]; eski karar [[decisions/lemonsqueezy-odeme-secimi]] artık superseded) — ilginç şekilde [[entities/yatirim-dashboard-uygulamasi]]'nin kesinleşmemiş adaylarından biri de Paddle, yani portföyde Paddle'ı canlı kullanan ilk proje bu oldu. Diğer üçü Stripe etrafında toplanıyor (ikisi kesin, biri belirsiz).

## Kredi Bazlı Model (Farklı Yaklaşım)
[[entities/eticaret-gorsel-uretimi]] diğerlerinden farklı olarak abonelik katmanı yerine **kredi bakiyesi** modeli kullanıyor (`User.credits`, düşük kredi uyarı e-postası, başarısız işlemde otomatik kredi iadesi). Bu, AI üretim maliyetinin kullanım başına değişken olmasıyla uyumlu bir tercih.

## Kaynaklar
- [[decisions/paddle-odeme-secimi]]
- [[decisions/lemonsqueezy-odeme-secimi]] (superseded)
- [[sources/projects/2026-08-08-cv-saas-readme]]
- [[sources/projects/2026-08-04-saas-donusum-talimatlari]]
- [[sources/projects/2026-08-21-stockalert-paddle-billing-implementation]]

## İlgili
- [[syntheses/saas-portfoy-genel-bakis]]
- [[concepts/freemium-abonelik-modeli]]
