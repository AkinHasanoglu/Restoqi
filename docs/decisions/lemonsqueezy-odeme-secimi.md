---
title: LemonSqueezy Tercihi — E-Ticaret Stok Uyarı Sistemi
tags: [decision, odeme, monetizasyon, superseded]
source: sources/projects/2026-08-17-eticaret-stok-uyari-sistemi.md
date: 2026-08-17
status: superseded
---

# LemonSqueezy Tercihi — E-Ticaret Stok Uyarı Sistemi

## ÇELİŞKİ / SUPERSEDED
**2026-08-21 itibarıyla geçersiz.** Proje LemonSqueezy'den [[entities/paddle]]'a geçmiş — bkz. [[decisions/paddle-odeme-secimi]]. Bu sayfa tarihsel kayıt olarak (Hard Rule #3 — sayfa silinmez) korunuyor; güncel karar için [[decisions/paddle-odeme-secimi]]'ne bakın.

## Karar (tarihsel — artık geçerli değil)
[[entities/eticaret-stok-uyari-sistemi]], abonelik ödemeleri için [[entities/stripe]] yerine [[entities/lemonsqueezy]]'i seçmiş; payout tarafında ayrıca Payoneer, faturalandırmada Ruul.io kullanılıyor.

## Gerekçe
Kaynakta açık bir gerekçe cümlesi yok — sadece "Ödeme Altyapısı: LemonSqueezy (Abonelik) ve Payoneer (Payout)" olarak listelenmiş. LemonSqueezy'nin "merchant of record" modeli (KDV/vergi tahsilatını platformun üstlenmesi) B2B SaaS'larda yaygın bir tercih sebebidir, ancak bu vault'taki kaynaklarda bu gerekçe **doğrulanmamıştır** — açık bir bulgu boşluğu.

## Portföy İçi Karşılaştırma
Diğer projeler farklı ödeme sağlayıcıları listeliyor: [[entities/cv-hazirlama-otomasyonu]] → Stripe/Iyzico; [[entities/yatirim-dashboard-uygulamasi]] → Stripe/LemonSqueezy/Paddle (kesinleşmemiş); [[entities/eticaret-gorsel-uretimi]] → Stripe. Portföy genelinde tutarlı bir ödeme sağlayıcı standardı yok. Detay: [[syntheses/monetizasyon-ve-odeme-altyapisi]].

## Kaynaklar
- [[sources/projects/2026-08-17-eticaret-stok-uyari-sistemi]]

## İlgili
- [[entities/lemonsqueezy]]
- [[entities/stripe]]
- [[entities/paddle]]
- [[decisions/paddle-odeme-secimi]]
- [[syntheses/monetizasyon-ve-odeme-altyapisi]]
