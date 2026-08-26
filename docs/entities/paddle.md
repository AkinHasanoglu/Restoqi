---
title: Paddle
tags: [entity, teknoloji, odeme]
source: sources/projects/2026-08-21-stockalert-paddle-billing-implementation.md
date: 2026-08-21
status: active
---

# Paddle

[[entities/eticaret-stok-uyari-sistemi]]'nin abonelik ödeme sağlayıcısı (Merchant of Record) — [[entities/lemonsqueezy]]'in yerini aldı (bkz. [[decisions/paddle-odeme-secimi]]). Bu geçiş kod tabanında bu vault'un fark etmesinden önce zaten yapılmıştı; `packages/database/supabase/migrations/20260818000200_paddle_billing.sql`'de `ls_subscription_id`/`ls_customer_id`/`ls_variant_id` kolonları `paddle_*` olarak rename edilmiş durumda bulundu.

## Uygulama Detayları
- **Webhook doğrulama:** `apps/dashboard/src/lib/paddle.ts` — `Paddle-Signature: ts=...;h1=...` header'ı HMAC-SHA256 ile elle doğrulanıyor (resmi `@paddle/paddle-node-sdk`'nin `unmarshal`'ı değil), 5 dakikalık zaman penceresi ile replay koruması.
- **Webhook handler:** `apps/dashboard/src/app/api/webhooks/paddle/route.ts` — `event_id` ile dedupe, audit log, ödeme-başarısız dunning e-postası, `PADDLE_WEBHOOK_SECRET` yoksa her ortamda (sadece production değil) fail-closed.
- **Checkout:** `@paddle/paddle-js` overlay checkout (`components/billing/paddle-checkout-button.tsx`), `customData: { team_id }` ile.
- **Plan eşleme:** Fiyat ID'leri → plan/interval eşlemesi `buildPaddlePlanMap` ile env değişkenlerinden (`NEXT_PUBLIC_PADDLE_PRICE_ID_{STARTER,GROWTH,SCALE}_{MONTHLY,ANNUAL}`) okunuyor.

## Kaynaklar
- [[sources/projects/2026-08-21-stockalert-paddle-billing-implementation]]

## İlgili
- [[entities/lemonsqueezy]]
- [[decisions/paddle-odeme-secimi]]
- [[decisions/reverse-trial-salt-okunur-kilit]]
- [[syntheses/monetizasyon-ve-odeme-altyapisi]]
