# CLAUDE.md — Lavanchor SaaS Bilgi Arşivi Şeması

Bu dosya, bu vault'un anayasasıdır. Burada çalışan her ajan (Claude Code veya başka biri) bu kurallara uyar.

## Amaç

Bu vault, **Lavanchor** çatısı altındaki SaaS projeleri (E-Ticaret Stok Uyarı Sistemi, SaaS Test Dashboard / Monitoring Hub, CV Hazırlama Otomasyonu, Yatırım Dashboard Uygulaması / Fintech, E-ticaret Görsel Üretimi) için kalıcı, birikimli bir bilgi arşividir. Amacı: proje spesifikasyonlarını, mimari kararları, tekrar eden teknoloji tercihlerini, bilinen sorunları ve projeler-arası çelişkileri tek bir yerde, çapraz-referanslı ve güncel tutmak — her yeni belge geldiğinde sıfırdan RAG araması yapmak yerine.

Bu wiki şu sorulara cevap verir: "Hangi projeler hangi stack'i kullanıyor?", "Ödeme altyapısı kararları nereden geliyor?", "n8n'den bağımsızlaşma neden ve nerede kararlaştırıldı?", "İki kaynak birbiriyle çelişiyor mu?"

## Çalışma Modeli ve Token Optimizasyonu
Claude Code (veya herhangi bir LLM), projede kodlama veya hata ayıklama yaparken şu adımları izlemelidir:
1. **Kör Tarama Yasak:** Göreve başlarken `src/` (veya kodların bulunduğu ana dizini) baştan sona tarayarak token harcama. 
2. **Önce Vault:** Koda dokunmadan önce DAİMA `index.md` dosyasını ve göreve konu olan `entities/` veya `concepts/` sayfalarını oku. Proje bağlamını (context) kodlardan değil, bu Vault'tan al.
3. **Nokta Atışı Kodlama:** Sadece değiştireceğin veya hatasını düzelteceğin spesifik kaynak kod dosyalarını aç ve oku.
4. **Oturum Kapanışı:** Önemli bir mimari değişiklik, yeni bir servis eklentisi veya büyük bir bug fix yapıldığında; oturumu (session) bitirmeden önce Ingest Workflow kurallarına göre Vault'u güncelle.

## Dil ve Naming

- Tüm sayfa içerikleri **Türkçe**.
- Dosya adları **kebab-case** (`hub-and-spoke-izleme-mimarisi.md`).
- Varlık (entity) adları kanonik İngilizce teknoloji adlarıyla yazılır (`nextjs-app-router.md`, `supabase.md`) — Türkçe içerik içinde bu adlar değişmeden kullanılır.

## Klasör Yapısı

- `raw/projects/`, `raw/docs/` — Ham kaynaklar. **Değiştirilmez.** Bu vault'ta sembolik link desteklenmediği için (Windows, ayrıcalık yok) her kaynak için `raw/projects/NN-<slug>.md` altında bir **pointer notu** var: orijinal dosyanın mutlak yolu, boyutu, tarihi. Orijinal içerik buraya kopyalanmaz.
- `sources/projects/` — Her ham kaynak için bir ingest özeti (`YYYY-MM-DD-<slug>.md`).
- `entities/` — Somut varlıklar: projeler, teknolojiler, servisler.
- `concepts/` — Soyut kavramlar (RBAC, webhook, rate limiting, i18n...).
- `decisions/` — Atomik mimari/ürün kararları, gerekçeleriyle.
- `issues/` — Bilinen sorunlar / kök neden + düzeltme.
- `syntheses/` — Üst düzey sentez sayfaları (portföy bakışı, ortak stack, riskler...).
- `archive/` — Silinen/eskimiş sayfaların gittiği yer. **Hiçbir sayfa gerçekten silinmez.**

## Sayfa Formatı

```markdown
---
title: <başlık>
tags: [etiket1, etiket2]
source: <sources/ dosyasına veya raw/ pointer'ına referans>
date: YYYY-MM-DD
status: draft | active | archived
---

# <Başlık>

<içerik>

## Kaynaklar
- [[kaynak-sayfa]] veya raw/projects/NN-slug.md

## İlgili
- [[ilgili-sayfa-1]]
- [[ilgili-sayfa-2]]
```

## Ingest Workflow

Yeni bir kaynak `raw/`'a (pointer olarak) eklendiğinde:
1. Kaynağı oku, ana konuyu ve teknoloji/karar/sorun çıkarımlarını belirle.
2. `sources/projects/YYYY-MM-DD-<slug>.md` yaz: hedef, yapılanlar, etkilenen dosyalar/alanlar, kararlar, sorunlar, açık konular, kaynak referansı.
3. Bahsedilen her varlık için `entities/` altında sayfa oluştur veya güncelle; çift yönlü link kur (`## İlgili`de karşılıklı referans).
4. Her mimari/ürün kararı için `decisions/` altında atomik sayfa.
5. Her sorun/düzeltme için `issues/` altında sayfa (kök neden + düzeltme + ilgili dosyalar).
6. Her soyut kavram için `concepts/` altında sayfa oluştur/güncelle.
7. `log.md`'ye `## [YYYY-MM-DD] ingest | <slug>` girişi + dokunulan sayfaların listesi.
8. `index.md`'yi güncelle.

## Query Workflow

1. Önce `index.md`'yi oku.
2. İlgili sayfalara in, içeriklerini oku.
3. Cevabı sentezle, her iddiaya kaynak referansı ver.
4. Değerli bir cevap (karşılaştırma, yeni bağlantı, analiz) ortaya çıkarsa, `syntheses/` altına atomik bir sayfa olarak dosyala ve `log.md`'ye `## [YYYY-MM-DD] query | "<soru>" → filed: <yol>` gir.

## Lint Workflow

Periyodik olarak:
- Sayfalar arası çelişkiler (`## ÇELİŞKİ` başlığıyla işaretlenmiş olanlar dahil, işaretlenmemiş olası çelişkiler de aranır)
- Orphan sayfalar (hiçbir yerden link almayan)
- Eksik/tek yönlü cross-reference'lar
- Wiki'de bahsi geçen ama kendi sayfası olmayan kavramlar/varlıklar
- Kapsanmayan (taranmış ama seçilmemiş) kaynaklar

`lint-report.md`'ye yaz. **Otomatik düzeltme yapılmaz, sadece raporlanır.** `log.md`'ye `## [YYYY-MM-DD] lint | <özet>` girişi.

## Hard Rules (Sert Kurallar)

1. `raw/` klasörüne asla yazılmaz/değiştirilmez.
2. Kaynaksız iddia yazılamaz — her önemli cümle bir `raw/` veya `sources/` referansına dayanır.
3. Sayfa **silinmez**, `archive/` altına taşınır; tarih korunur.
4. Çelişkiler silinmez, `## ÇELİŞKİ` başlığıyla görünür şekilde işaretlenir (bkz. `issues/n8n-cors-webhook-sorunu.md` ve `decisions/n8nden-bagimsizlasma.md` arasındaki çelişki).
5. **Secret/token/parola/`.env` değeri hiçbir koşulda wiki'ye kopyalanmaz** — sadece "X ortam değişkeni gereklidir" şeklinde referans verilir. (`raw/projects/02-saas-test-dashboard-readme.md` kaynağı örnek `.env` değerleri içeriyor; wiki'ye sadece değişken adları alınmıştır.)
6. Her operasyon (ingest/query/lint) `log.md`'ye zaman damgalı yazılır.
7. Filed-back her şey atomik olur — tek bir "oturum özeti" değil, her biri tek bir fikri anlatan ayrık sayfalar.
8. Şema zamanla evrilir — bir kural çalışmıyorsa bu dosya güncellenir, sonraki oturumlarda yeni kural geçerli olur.
