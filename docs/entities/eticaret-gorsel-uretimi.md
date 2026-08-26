---
title: E-ticaret Siteleri için Görsel Üretimi (UGC SaaS)
tags: [entity, proje, saas, ai, media-generation]
source: sources/projects/2026-08-04-saas-donusum-talimatlari.md
date: 2026-08-04
status: active
---

# E-ticaret Siteleri için Görsel Üretimi (UGC SaaS)

Ürün görseli ve lifestyle video üreten bir n8n prototipinin bağımsız, production-ready bir SaaS'a dönüştürülmesi projesi. Vault'ta hem eski n8n-merkezli prototip talimatı (2026-07-23) hem de n8n'i tamamen kaldıran dönüşüm talimatı (2026-08-04) var — bkz. ÇELİŞKİ notu.

## Stack (hedef, dönüşüm sonrası)
[[entities/nextjs-app-router]], Radix/Shadcn UI, [[entities/postgresql]] + [[entities/prisma]], Cloudinary/S3, [[entities/redis-upstash]] + BullMQ, [[entities/stripe]], Resend/SendGrid, [[entities/sentry]].

## Kaynaklar
- [[sources/projects/2026-08-04-saas-donusum-talimatlari]]
- [[sources/projects/2026-07-23-otomasyon-arayuz-talimatlari]]

## İlgili
- [[decisions/n8nden-bagimsizlasma]]
- [[entities/n8n]]
- [[issues/n8n-cors-webhook-sorunu]]
- [[syntheses/saas-portfoy-genel-bakis]]

## ÇELİŞKİ
2026-07-23 tarihli kaynak hâlâ n8n webhook'una bağlı bir arayüz kurulumu anlatıyor; 2026-08-04 tarihli kaynak (daha yeni) aynı projede n8n'in tamamen kaldırılmasını talimatlandırıyor. Vault, hangi belgenin "geçerli/current" olduğunu netleştiren bir üçüncü kaynağa sahip değil — bu yalnızca tarih sırasından çıkarılabiliyor. Detay: [[issues/n8n-cors-webhook-sorunu]].
