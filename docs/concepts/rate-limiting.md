---
title: Rate Limiting
tags: [concept, guvenlik, performans]
source: sources/projects/2026-08-17-eticaret-stok-uyari-sistemi.md
date: 2026-08-17
status: active
---

# Rate Limiting

API'lara yapılan istekleri belirli bir eşikle sınırlama tekniği. Portföyde: [[entities/eticaret-stok-uyari-sistemi]] (Next.js Middleware + [[entities/redis-upstash]]), [[entities/eticaret-gorsel-uretimi]] (`@upstash/ratelimit`, IP başına dk'da max 5 üretim isteği — AI bütçesini spam'den korumak için).

## Kaynaklar
- [[sources/projects/2026-08-17-eticaret-stok-uyari-sistemi]]
- [[sources/projects/2026-08-04-saas-donusum-talimatlari]]

## İlgili
- [[entities/redis-upstash]]
