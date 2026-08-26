# Log — Lavanchor SaaS Bilgi Arşivi

Append-only zaman damgalı olay kaydı. Format: `## [YYYY-MM-DD] <tür> | <özet>`.

## [2026-08-17] setup | Vault iskeleti kuruldu
- Klasörler: raw/{projects,docs}, sources/projects, entities, concepts, decisions, issues, syntheses, archive (hepsine .gitkeep)
- CLAUDE.md, index.md, log.md oluşturuldu
- `Hoş geldiniz.md` → `archive/hos-geldiniz.md` (silinmedi, arşivlendi)

## [2026-08-17] setup | Symlink denemesi başarısız, pointer notlarına geçildi
- `ln -s` bu Windows hesabında ayrıcalıksız çalıştığında sessizce tam kopya oluşturuyor (gerçek symlink değil); `mklink` "yetersiz ayrıcalık" hatası verdi.
- CLAUDE.md kural 1 (raw/ değiştirilmez/kopyalanmaz) gereği, 9 kaynak için `raw/projects/NN-<slug>.md` altında mutlak yol + boyut + tarih içeren pointer notları yazıldı; orijinal dosyalar hiçbir şekilde kopyalanmadı.

## [2026-08-17] ingest | eticaret-stok-uyari-sistemi
Dokunulan sayfalar: sources/projects/2026-08-17-eticaret-stok-uyari-sistemi.md, entities/eticaret-stok-uyari-sistemi.md, entities/nextjs-app-router.md, entities/vercel.md, entities/supabase.md, entities/lemonsqueezy.md, entities/redis-upstash.md, entities/sentry.md, entities/n8n.md, decisions/lemonsqueezy-odeme-secimi.md, decisions/rbac-takim-yonetimi.md, decisions/hub-and-spoke-izleme-mimarisi.md, concepts/rbac.md, concepts/i18n.md, concepts/rate-limiting.md

## [2026-08-17] ingest | saas-test-dashboard-readme
Dokunulan sayfalar: sources/projects/2026-08-17-saas-test-dashboard-readme.md, entities/saas-test-dashboard.md, entities/prisma.md, entities/sqlite.md, decisions/hub-and-spoke-izleme-mimarisi.md, decisions/durable-throttle-marker.md, issues/durum-degerleri-tutarsizligi.md, concepts/alert-throttling.md, concepts/hub-and-spoke-mimarisi.md

## [2026-08-17] ingest | spoke-integration
Dokunulan sayfalar: sources/projects/2026-08-17-spoke-integration.md, issues/app-name-esleme-riski.md, concepts/webhook-tabanli-entegrasyon.md

## [2026-08-14] ingest | saas-test-dashboard-spec
Dokunulan sayfalar: sources/projects/2026-08-14-saas-test-dashboard-spec.md, issues/durum-degerleri-tutarsizligi.md (güncelleme), decisions/hub-and-spoke-izleme-mimarisi.md (güncelleme)

## [2026-08-08] ingest | cv-saas-uygulama-blueprint
Dokunulan sayfalar: sources/projects/2026-08-08-cv-saas-uygulama-blueprint.md, entities/cv-hazirlama-otomasyonu.md, decisions/n8nden-bagimsizlasma.md, concepts/placeholder-enjeksiyonu.md, concepts/serverless-arka-plan-isleme.md

## [2026-08-08] ingest | cv-saas-readme
Dokunulan sayfalar: sources/projects/2026-08-08-cv-saas-readme.md, entities/cv-hazirlama-otomasyonu.md (güncelleme), entities/stripe.md, decisions/b2b-toplu-isleme-arka-plan-worker.md

## [2026-08-08] ingest | fintech-yatirim-dashboard
Dokunulan sayfalar: sources/projects/2026-08-08-fintech-yatirim-dashboard.md, entities/yatirim-dashboard-uygulamasi.md, entities/postgresql.md, decisions/n8nden-bagimsizlasma.md (güncelleme), concepts/freemium-abonelik-modeli.md

## [2026-08-04] ingest | saas-donusum-talimatlari
Dokunulan sayfalar: sources/projects/2026-08-04-saas-donusum-talimatlari.md, entities/eticaret-gorsel-uretimi.md, decisions/n8nden-bagimsizlasma.md (güncelleme), issues/n8n-cors-webhook-sorunu.md

## [2026-07-23] ingest | otomasyon-arayuz-talimatlari
Dokunulan sayfalar: sources/projects/2026-07-23-otomasyon-arayuz-talimatlari.md, entities/n8n.md (güncelleme), entities/eticaret-gorsel-uretimi.md (güncelleme, ÇELİŞKİ notu eklendi), issues/n8n-cors-webhook-sorunu.md (güncelleme)

## [2026-08-17] synthesis | 5 sentez sayfası dosyalandı
Dokunulan sayfalar: syntheses/saas-portfoy-genel-bakis.md, syntheses/ortak-teknoloji-yigini.md, syntheses/tekrar-eden-mimari-kararlar.md, syntheses/monetizasyon-ve-odeme-altyapisi.md, syntheses/acik-riskler-ve-bosluklar.md

## [2026-08-17] lint | ilk sağlık kontrolü
Bulgular: lint-report.md — detaylar orada. Özet: 1 gerçek çelişki (n8n prototip/dönüşüm, zaten işaretli), 0 broken içerik linki, 4 template-placeholder linki (CLAUDE.md örneği + arşivlenmiş hoş geldiniz notu, zararsız), 2 kapsam dışı kaynak (UGC, Sesli AI Chatbot) not edildi.

## [2026-08-21] ingest | stockalert-paddle-billing-implementation
docs/STOCKALERT_PADDLE_BILLING_IMPLEMENTATION.md dokümanı plan/inşa edildi (Prisma şeması, kendi webhook route'u vb. dokümandaki kısımlar reddedildi — [[entities/paddle]] zaten kod tabanında canlıydı ve daha olgundu; sadece reverse-trial kilidi, plan yeniden adlandırma ve kanal yetkilendirmesi gerçek boşluk olarak tespit edilip inşa edildi).
Dokunulan sayfalar: sources/projects/2026-08-21-stockalert-paddle-billing-implementation.md, entities/paddle.md (yeni), entities/eticaret-stok-uyari-sistemi.md (güncelleme — Paddle'a geçiş, "planlama aşaması" düzeltmesi), entities/lemonsqueezy.md (güncelleme — superseded notu), decisions/paddle-odeme-secimi.md (yeni), decisions/reverse-trial-salt-okunur-kilit.md (yeni), decisions/lemonsqueezy-odeme-secimi.md (güncelleme — status: superseded, ## ÇELİŞKİ notu), syntheses/monetizasyon-ve-odeme-altyapisi.md (güncelleme), index.md (güncelleme).

## [2026-08-25] ingest | 40-madde-uyumluluk-denetimi
GDPR/CCPA/FTC/WCAG/CAN-SPAM/TCPA/EU Consumer Rights Directive'i kapsayan 40 maddelik bir dış denetim isteği aynı oturumda hem denetlendi hem düzeltildi. Tam bulgu listesi kodun kendisinde: `docs/compliance-audit-2026-08.md` (dosya/satır referanslı, [SEVERITY] formatında). En önemli tespit: [[entities/eticaret-stok-uyari-sistemi]] sayfası Cloudflare Turnstile'ı stack'te listeliyordu ama kodda hiç uygulanmamıştı — artık gerçekten uygulandı.
Dokunulan sayfalar: decisions/40-madde-uyumluluk-denetimi.md (yeni), entities/eticaret-stok-uyari-sistemi.md (güncelleme — denetim notu + Turnstile durumu).
