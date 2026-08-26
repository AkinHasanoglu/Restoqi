---
title: Lint Report — İlk Sağlık Kontrolü
tags: [lint, saglik-kontrolu]
date: 2026-08-17
status: active
---

# Lint Report — İlk Sağlık Kontrolü (2026-08-17)

Otomatik düzeltme yapılmadı — sadece raporlama (CLAUDE.md Lint Workflow).

## 1. Çelişkiler
- **[[entities/eticaret-gorsel-uretimi]] / [[issues/n8n-cors-webhook-sorunu]]**: [[sources/projects/2026-07-23-otomasyon-arayuz-talimatlari]] (n8n webhook'una bağlı prototip) ile [[sources/projects/2026-08-04-saas-donusum-talimatlari]] (n8n'i tamamen kaldırma talimatı) aynı proje için birbiriyle çelişiyor. **Zaten `## ÇELİŞKİ` başlığıyla işaretli** ([[entities/eticaret-gorsel-uretimi]] sayfasında). Çözülmemiş — üçüncü bir kaynak (ilerleme raporu) olmadan hangisinin geçerli olduğu netleşemez.
- Başka açık/işaretlenmemiş çelişki tespit edilmedi.

## 2. Orphan Sayfalar
Yok. `sources/`, `entities/`, `concepts/`, `decisions/`, `issues/`, `syntheses/` altındaki 48 içerik sayfasının (`.gitkeep` hariç) her biri en az bir başka sayfadan link alıyor.

## 3. Eksik / Tek Yönlü Cross-Reference'lar
- `entities/postgresql.md` → `entities/supabase.md`'ye link veriyor ama `entities/supabase.md` içinde `entities/postgresql.md`'ye geri link **var** (kontrol edildi, sorun yok).
- `decisions/rbac-takim-yonetimi.md`, `concepts/rbac.md`'ye link veriyor; `concepts/rbac.md` da `decisions/rbac-takim-yonetimi.md`'ye geri link veriyor — tek yönlü sorun tespit edilmedi.
- Genel olarak çift yönlü link disiplini tutarlı uygulanmış görünüyor; ileride yeni sayfa eklenirken bu manuel kontrol edilmeli (ajan otomatik yapmıyor, her ingest'te elle kontrol gerekiyor).

## 4. Kendi Sayfası Olmayan Kavramlar
Kaynaklarda geçen ama ayrı bir `concepts/` veya `entities/` sayfası açılmamış, portföyde tekrar etmeyen (tek kaynakta geçen) kavramlar — bilinçli olarak atlandı, gerekirse ileride açılabilir:
- `next-intl` (kütüphane, [[concepts/i18n]] içinde bahsi geçiyor ama ayrı entity yok)
- `shadcn/ui` / Radix UI (2 kaynakta geçiyor, ayrı entity açılmadı)
- Nodemailer, `jose` (Monitoring Hub'a özgü, ayrı entity açılmadı — [[entities/saas-test-dashboard]] sayfasında bahsi geçiyor)
- Cloudflare Turnstile, PostHog (sadece [[entities/eticaret-stok-uyari-sistemi]]'nde, tek kaynakta)
- TradingView Lightweight Charts, BullMQ (sırasıyla tek projede geçiyor)

Bunlar şu an düşük öncelikli — 2'den az kaynakta geçen varlıklar için ayrı sayfa CLAUDE.md'de zorunlu tutulmadı.

## 5. Kapsam Dışı Kaynaklar (Bu Turda Taranmadı)
- `Lavanchor/SaaS/UGC/` — README 1.7KB, minimum boyut eşiğinin (3KB) altında kaldığı için elendi.
- `Lavanchor/SaaS/Sesli AI Chatbot/` — markdown/metin kaynağı bulunamadı.

İkisi de gelecekte ayrı bir ingest turunda değerlendirilebilir.

## 6. Diğer Bulgular
- CLAUDE.md'deki sayfa formatı örneğinde (`## Kaynaklar` / `## İlgili` şablonu) yer alan `[[kaynak-sayfa]]`, `[[ilgili-sayfa-1]]`, `[[ilgili-sayfa-2]]` ve `archive/hos-geldiniz.md` içindeki `[[bir bağlantı oluştur]]` — bunlar **gerçek broken link değil**, şablon/örnek metinler. Obsidian'da kırmızı (var olmayan sayfa) görünecekler ama zararsız.
- Secret/env değeri sızıntısı taraması: `raw/projects/02-saas-test-dashboard-readme.md` pointer notu ve `sources/projects/2026-08-17-saas-test-dashboard-readme.md` kontrol edildi — sadece değişken **adları** var, gerçek değer yok. Kural 5 ihlali yok.

## Özet
- 1 bilinen ve işaretli çelişki (çözülmedi, çözülmesi kaynak-bağımlı)
- 0 orphan sayfa
- 0 gerçek broken içerik linki (4 zararsız şablon linki)
- 5 kendi sayfası açılmamış düşük-öncelik kavram (bilinçli, düşük tekrar nedeniyle)
- 2 kapsam dışı kaynak not edildi

## İlgili
- [[syntheses/acik-riskler-ve-bosluklar]]
- [[index.md]]
