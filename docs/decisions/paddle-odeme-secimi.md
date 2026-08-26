---
title: Paddle Tercihi (LemonSqueezy Yerine) — E-Ticaret Stok Uyarı Sistemi
tags: [decision, odeme, monetizasyon]
source: sources/projects/2026-08-21-stockalert-paddle-billing-implementation.md
date: 2026-08-21
status: active
---

# Paddle Tercihi (LemonSqueezy Yerine) — E-Ticaret Stok Uyarı Sistemi

## Karar
[[entities/eticaret-stok-uyari-sistemi]], abonelik ödemeleri için [[entities/lemonsqueezy]]'den [[entities/paddle]]'a geçmiş. Bu geçiş kod tabanında zaten uygulanmış haldeydi (bkz. `packages/database/supabase/migrations/20260818000200_paddle_billing.sql`'in kendi gerekçe yorumu: "LemonSqueezy Billing → Paddle Billing" kolon rename'i); bu vault bu kararı ilk kez 2026-08-21'de, `docs/STOCKALERT_PADDLE_BILLING_IMPLEMENTATION.md` dokümanını plan/inşa ederken fark etti.

## ÇELİŞKİ
[[decisions/lemonsqueezy-odeme-secimi]] (2026-08-17 tarihli) bu projenin LemonSqueezy kullandığını söylüyor. **Bu artık doğru değil** — geçmişte doğruydu, kod tabanı sonradan Paddle'a geçti. Eski karar sayfası silinmedi (Hard Rule #3), ancak `status: superseded` olarak işaretlendi ve bu sayfaya referans veriyor.

## Gerekçe
Kod tabanındaki migration yorumları veya diğer kaynaklarda açık bir gerekçe cümlesi yok. Paddle da LemonSqueezy gibi bir "Merchant of Record" — KDV/vergi tahsilatını platform üstleniyor. Muhtemel sebepler (doğrulanmamış): Paddle'ın SaaS'a özel checkout/fiyatlandırma araçları, ya da LemonSqueezy'nin 2024 sonrası Stripe tarafından satın alınmasıyla ilgili belirsizlik.

## Portföy İçi Karşılaştırma
[[syntheses/monetizasyon-ve-odeme-altyapisi]]'ndeki tablo artık bu projede güncel değil — orada hâlâ LemonSqueezy yazıyor, güncellenmesi gerekiyor.

## Kaynaklar
- [[sources/projects/2026-08-21-stockalert-paddle-billing-implementation]]

## İlgili
- [[entities/paddle]]
- [[entities/lemonsqueezy]]
- [[decisions/lemonsqueezy-odeme-secimi]] (superseded)
- [[decisions/reverse-trial-salt-okunur-kilit]]
- [[syntheses/monetizasyon-ve-odeme-altyapisi]]
