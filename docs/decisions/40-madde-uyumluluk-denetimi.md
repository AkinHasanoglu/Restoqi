---
title: 40 Maddelik Uyumluluk Denetimi ve Düzeltmeleri
tags: [decision, uyumluluk, gdpr, guvenlik, e-ticaret-stok-uyari-sistemi]
source: ../compliance-audit-2026-08.md
date: 2026-08-25
status: active
---

# 40 Maddelik Uyumluluk Denetimi ve Düzeltmeleri

2026-08-25'te GDPR/CCPA/FTC/WCAG/CAN-SPAM/TCPA/EU Consumer Rights Directive'i
kapsayan 40 maddelik bir denetim yapıldı ve aynı oturumda düzeltildi. Detaylı
madde madde rapor: `docs/compliance-audit-2026-08.md`.

## Neden

Güvenlik temeli (RLS, Sentry PII scrubbing, nonce'lu CSP, AES-256-GCM
şifreleme, rate limiting) zaten sağlamdı, ancak açıklama/onay/ticari-hukuk
yüzeyleri geride kalmıştı — örneğin [[entities/eticaret-stok-uyari-sistemi]]
sayfası Cloudflare Turnstile'ı stack'te listeliyordu ama kodda hiç
uygulanmamıştı (sadece kullanılmayan env değişkenleri vardı).

## Öne çıkan mimari eklemeler

- **Çerez onayı**: `packages/ui`'da paylaşılan, opt-in bir
  `CookieConsentBanner` — PostHog artık onay öncesi asla başlamıyor.
- **Turnstile**: gerçekten uygulandı (`apps/dashboard/src/lib/turnstile.ts`)
  — trust.tsx/DPA'daki iddia artık doğru.
- **SMS STOP webhook'u**: `api/webhooks/twilio-sms` — gelen STOP/START
  yanıtlarını `notification_channels` satırlarını
  aktif/pasif yaparak işliyor; STOP metni artık kozmetik değil.
- **Veri saklama işi**: haftalık `purge_expired_data()` cron'u —
  `inventory_snapshots`/`alerts`/`audit_logs`/`team_invitations`/
  `ai_predictions` için otomatik silme pencereleri.
- **E-posta unsubscribe**: haftalık özet e-postası için HMAC imzalı,
  girişsiz tek-tık unsubscribe (`teams.weekly_digest_opt_out`).
- **Clickwrap**: signup formunda zorunlu onay kutusu + IP/zaman damgası
  kaydı (`auth.users` metadata).

## Kaynaklar
- docs/compliance-audit-2026-08.md (tam bulgu listesi, dosya/satır referanslı)

## İlgili
- [[entities/eticaret-stok-uyari-sistemi]]
- [[decisions/reverse-trial-salt-okunur-kilit]]
- [[concepts/rate-limiting]]
