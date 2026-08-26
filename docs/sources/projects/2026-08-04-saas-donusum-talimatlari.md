---
title: Görsel Üretimi SaaS Dönüşüm Talimatları — Kaynak Özeti
tags: [source, saas, ai, media-generation]
source: raw/projects/08-saas-donusum-talimatlari.md
date: 2026-08-04
status: active
---

# Görsel Üretimi SaaS Dönüşüm Talimatları — Kaynak Özeti

## Hedef
Mevcut n8n tabanlı prototip ürün görseli/lifestyle video otomasyonunu tamamen bağımsız, güvenli, ölçeklenebilir, production-ready kurumsal bir SaaS'a dönüştürmek.

## Yapılanlar
- Stack: [[entities/nextjs-app-router]] fullstack, Radix/Shadcn UI + Lucide + Framer Motion, [[entities/postgresql]] + [[entities/prisma]], NextAuth/Supabase Auth/Clerk, Cloudinary/AWS S3, [[entities/redis-upstash]] + BullMQ kuyruğu, [[entities/stripe]] Checkout, Resend/SendGrid, [[entities/sentry]] + Upstash Redis rate limiting.
- Veritabanı: `User` (kredi sistemi, rol), `Subscription`, `GenerationJob` (`PENDING/PROCESSING/COMPLETED/FAILED`).
- Production-ready katman: işlemsel e-postalar (hoş geldin, üretim hazır, düşük kredi uyarısı), BullMQ'da exponential backoff retry (3 kez) + kalıcı başarısızlıkta otomatik kredi iadesi, `/admin` paneli (rol korumalı), rate limiting (IP başına dk'da max 5 üretim), 30 günden eski depolama verilerinin otomatik temizliği.
- **Açıkça n8n'den bağımsızlaşma** talimatı — başlıkta "mevcut n8n tabanlı prototipi... dönüştürmek" yazıyor (bkz. [[decisions/n8nden-bagimsizlasma]]).

## Etkilenen Dosyalar
`prisma/schema.prisma`.

## Kararlar
- [[decisions/n8nden-bagimsizlasma]]

## Sorunlar
- **ÇELİŞKİ:** Bu belge (2026-08-04) n8n'i tamamen ortadan kaldırmayı hedeflerken, aynı proje klasöründeki [[sources/projects/2026-07-23-otomasyon-arayuz-talimatlari]] (2026-07-23, daha eski) hâlâ n8n webhook'una bağlı bir arayüz kurulumunu belgeliyor. Kronolojik olarak dönüşüm talimatı daha yeni — n8n prototipinin üstüne yazıldığı anlaşılıyor, ancak iki kaynak da vault'ta duruyor ve aynı projeyi anlatıyor. Detay: [[issues/n8n-cors-webhook-sorunu]].

## Açık Konular
- Dönüşümün ne kadarının fiilen tamamlandığı bu kaynaktan belli değil (bu bir talimat/plan belgesi, ilerleme raporu değil).

## Kaynaklar
- raw/projects/08-saas-donusum-talimatlari.md

## İlgili
- [[entities/eticaret-gorsel-uretimi]]
- [[sources/projects/2026-07-23-otomasyon-arayuz-talimatlari]]
- [[decisions/n8nden-bagimsizlasma]]
