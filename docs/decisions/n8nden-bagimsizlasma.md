---
title: n8n'den Bağımsızlaşma — Backend'e Entegre Arka Plan İşleme
tags: [decision, mimari, otomasyon]
source: sources/projects/2026-08-04-saas-donusum-talimatlari.md
date: 2026-08-04
status: active
---

# n8n'den Bağımsızlaşma — Backend'e Entegre Arka Plan İşleme

## Karar
Portföydeki en az 3 projede ([[entities/cv-hazirlama-otomasyonu]], [[entities/yatirim-dashboard-uygulamasi]], [[entities/eticaret-gorsel-uretimi]]) n8n veya benzeri harici low-code otomasyon aracının kullanılması **açıkça yasaklanmış**; tüm arka plan işleri (AI işleme, dosya dönüştürme, haber çekme, zamanlama) doğrudan uygulama backend'ine (serverless worker, Celery/APScheduler, Vercel Cron, Inngest, QStash, BullMQ) entegre edilmesi talimatlandırılmış.

## Gerekçe
- [[entities/eticaret-gorsel-uretimi]] kaynağında açıkça: mevcut n8n tabanlı prototipin "tamamen bağımsız, güvenli, ölçeklenebilir, production-ready" bir SaaS'a dönüştürülmesi hedefleniyor — n8n bir dış bağımlılık ve tekil hata noktası olarak görülüyor.
- [[entities/yatirim-dashboard-uygulamasi]] kaynağında bu bir "STRICT" mimari kural olarak işaretlenmiş.
- [[entities/cv-hazirlama-otomasyonu]] kaynağında "Kritik Sistem Kısıtlaması" başlığı altında, Vercel/Netlify serverless mimarisine uyumluluk gerekçesiyle belirtilmiş.

## İstisna
[[entities/eticaret-stok-uyari-sistemi]] projesinde n8n hâlâ **kabul edilebilir** bir bileşen — ama sadece uyarı **dağıtım** katmanı olarak (Slack/Telegram/SMS/E-posta gönderimi), çekirdek iş mantığı için değil. Bu, kararın "arka plan iş mantığı backend'e ait olmalı, dış kanal entegrasyonu ayrı mesele" şeklinde okunabileceğini gösteriyor.

## Çelişki / Gerilim
[[entities/eticaret-gorsel-uretimi]]'nin eski prototip talimatı ([[sources/projects/2026-07-23-otomasyon-arayuz-talimatlari]]) hâlâ n8n webhook'una bağımlı bir arayüz anlatıyor ve bu belge vault'ta hâlâ duruyor — dönüşüm talimatından (2026-08-04) önce yazılmış, arşivlenmemiş. Bkz. [[issues/n8n-cors-webhook-sorunu]].

## Kaynaklar
- [[sources/projects/2026-08-04-saas-donusum-talimatlari]]
- [[sources/projects/2026-08-08-cv-saas-uygulama-blueprint]]
- [[sources/projects/2026-08-08-fintech-yatirim-dashboard]]
- [[sources/projects/2026-08-17-eticaret-stok-uyari-sistemi]]

## İlgili
- [[entities/n8n]]
- [[entities/cv-hazirlama-otomasyonu]]
- [[entities/yatirim-dashboard-uygulamasi]]
- [[entities/eticaret-gorsel-uretimi]]
- [[entities/eticaret-stok-uyari-sistemi]]
- [[concepts/serverless-arka-plan-isleme]]
- [[syntheses/tekrar-eden-mimari-kararlar]]
