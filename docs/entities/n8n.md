---
title: n8n
tags: [entity, teknoloji, otomasyon, low-code]
source: sources/projects/2026-08-04-saas-donusum-talimatlari.md
date: 2026-08-04
status: active
---

# n8n

Low-code iş akışı otomasyon aracı. Portföyde iki zıt rolde görünüyor:
1. **Kabul edilen kullanım:** [[entities/eticaret-stok-uyari-sistemi]]'nde Slack/Telegram/SMS/E-posta uyarı dağıtımı için (arka plan işleme değil, sadece dağıtım katmanı).
2. **Açıkça yasaklanan kullanım:** [[entities/cv-hazirlama-otomasyonu]], [[entities/yatirim-dashboard-uygulamasi]] ve [[entities/eticaret-gorsel-uretimi]] (dönüşüm sonrası) — üç projede de "n8n veya benzeri harici otomasyon aracı kullanılmayacak" kuralı açıkça yazılı. Bkz. [[decisions/n8nden-bagimsizlasma]].

[[entities/eticaret-gorsel-uretimi]]'nin eski prototipi ([[sources/projects/2026-07-23-otomasyon-arayuz-talimatlari]]) hâlâ n8n'e bağımlıydı — dönüşüm talimatı bunu tersine çevirmeyi hedefliyor.

## Kaynaklar
- [[sources/projects/2026-08-17-eticaret-stok-uyari-sistemi]]
- [[sources/projects/2026-08-04-saas-donusum-talimatlari]]
- [[sources/projects/2026-07-23-otomasyon-arayuz-talimatlari]]

## İlgili
- [[decisions/n8nden-bagimsizlasma]]
- [[issues/n8n-cors-webhook-sorunu]]
- [[syntheses/tekrar-eden-mimari-kararlar]]
