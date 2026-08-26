---
title: E-Ticaret Stok Uyarı SaaS Projesi
date: 2026-07-29
status: Planlama - Kurumsal Sürüm
tags: [saas, supabase, vercel, nextjs, b2b, e-commerce, api-integration, webhook, docker, obsidian, n8n, rbac, ai]
---

# Proje Özeti
Shopify ve Trendyol satıcıları ile kurumsal e-ticaret firmaları için stok eşik altı uyarıları gönderen, çoklu dil destekli, takım yönetimine sahip, abonelik tabanlı profesyonel bir B2B SaaS platformu.

## 1. Teknoloji Yığını (Tech Stack)
*   **Frontend & API:** Next.js (App Router, API Routes, Vercel entegrasyonu)
*   **Veritabanı & Kimlik Doğrulama:** Supabase (PostgreSQL, Row Level Security, Auth)
*   **Hosting & Deployment:** Vercel
*   **Ödeme Altyapısı:** LemonSqueezy (Abonelik) ve Payoneer (Payout)
*   **Faturalandırma:** Ruul.io
*   **Uluslararasılaştırma (i18n):** `next-intl` (EN, DE, FR, ZH, JA, TR, RU)

## 2. Kurumsal Sistem Mimarisi (B2B Özellikleri)
*   **Takım Yönetimi (RBAC - Role-Based Access Control):** Kullanıcıların "Yönetici", "Editör" veya "İzleyici" rollerine sahip olduğu çoklu kullanıcı / takım çalışma alanları (Workspaces).
*   **Yapay Zeka Destekli Tahmin (Smart Thresholds):** Geçmiş satış hızlarını analiz ederek stokların ne zaman tükeneceğini tahmin eden hafif bir yapay zeka (LLM) modeli entegrasyonu.
*   **Gerçek Zamanlı Webhook'lar:** Stok değişimlerini anında yakalamak için e-ticaret platformlarının webhook altyapısının kullanılması.
*   **Hız Sınırları ve Kuyruk Yönetimi:** API darboğazlarını ve limit aşımlarını engellemek için Redis/Upstash tabanlı mesaj kuyruğu (Message Queue) ve Next.js Middleware üzerinden Rate Limiting.
*   **Denetim İzleri (Audit Logs):** Sistemdeki her kural değişikliğinin ve mağaza entegrasyonunun kim tarafından yapıldığını kaydeden izleme tabloları.
*   **Yerel Geliştirme (Local Environment):** Docker üzerinden izole edilmiş Supabase ve Redis ortamları.

## 3. İleri Seviye Optimizasyonlar ve Güvenlik
*   **Hata Takibi:** Sentry entegrasyonu.
*   **İş Akışı Otomasyonu:** Slack, Telegram, SMS ve E-posta uyarıları için n8n (low-code otomasyon) entegrasyonu.
*   **E-posta Şablonları:** React Email ile bileşen tabanlı, profesyonel B2B şablon tasarımı.
*   **Güvenlik:** Cloudflare Turnstile ile bot koruması.
*   **Analitik:** PostHog ile kullanıcı ve takım etkileşimi takibi.

## 4. Sayfa ve UI/UX Mimarisi (Profesyonel Girişim Tasarımı)
*Tasarım Prensibi: Modern, kurumsal güven veren, minimalist ve veri odaklı profesyonel bir B2B SaaS arayüzü inşa edilecektir. Renk paletleri, tipografi ve bileşenler yüksek kalite standartlarında (örn: shadcn/ui veya Radix UI temel alınarak) geliştirilecektir.*

### Arayüz Özellikleri ve Detaylar
*   **Command Palette (Ctrl + K):** Klavye ile sistem içi hızlı arama ve navigasyon.
*   **Gelişmiş Veri Tabloları:** Sayfalama, sütun filtreleme ve çoklu seçim özelliklerine sahip dinamik tablolar.
*   **İskelet Yükleyiciler (Skeleton Loaders):** API'den veri beklerken uygulamanın akıcı hissettirmesi için yükleme animasyonları.
*   **Karanlık Mod (Dark Mode):** Aydınlık/Karanlık tema desteği.
*   **Toast Bildirimleri (Sonner):** İşlem başarı/hata durumlarında köşede beliren modern ve zarif bildirimler.
*   **Ekmek Kırıntısı (Breadcrumbs):** Derin sayfalarda kolay navigasyon sağlayan üst menü yolları.
*   **Markdown Takım Notları:** Takımların kendi iş akışlarını ve uyarı stratejilerini kaydedebilecekleri yapılandırılmış bilgi alanı.

### Landing Page (Açılış Sayfası)
*   **Navbar:** Şeffaf/Modern Logo, Çözümler, Fiyatlandırma, Dil Seçici, Kurumsal Giriş.
*   **Hero Section:** Yüksek dönüşüm odaklı başlık, dinamik ürün önizlemesi ve "Ücretsiz Deneyin" butonu.
*   **Social Proof & Features:** Kullanım kılavuzu, marka logoları ve uygulamanın nasıl çalıştığını gösteren animasyonlar.

### Dashboard (Kullanıcı Paneli)
*   **Çalışma Alanı (Workspace) Seçici:** Takımlar arası geçiş.
*   **Genel Bakış:** Veri görselleştirme, AI destekli tahmin listesi.
*   **Mağaza Entegrasyonları:** Shopify (OAuth 2.0) ve Trendyol (API Key/Secret) bağlantıları.
*   **Uyarı Kuralları:** Stok eşikleri ve bildirim kanallarının yapılandırılması.

### Ayarlar (Settings)
*   **Hesap Ayarları:** Şifre değiştirme, kişisel özelleştirmeler.
*   **Takım Yönetimi:** Takım arkadaşı davet etme ve rol belirleme.
*   **Denetim Logları:** Çalışma alanındaki tüm işlemlerin dökümü.
*   **Abonelik ve Faturalandırma:** Plan seçimi (LemonSqueezy entegrasyonu).

## 5. Veritabanı Şeması (Supabase SQL)
*   `teams`: Kurumsal çalışma alanları (`id`, `name`).
*   `team_members`: Kullanıcı ve takım ilişkisi (`team_id`, `user_id`, `role`).
*   `connected_stores`: Takımlara bağlı mağazalar (`team_id`, `platform`, `store_name`, `encrypted_keys`).
*   `products`: Takip edilen ürünler.
*   `alerts`: Bildirim geçmişi.
*   `audit_logs`: Sistem değişiklik geçmişi (`team_id`, `user_id`, `action`, `timestamp`).

## 5.1 İzleme Merkezi (Monitoring Hub — Hub & Spoke)

Merkezi izleme Hub'ı bu reponun **dışında**, ayrı bir uygulama olarak bakımı yapılan
bağımsız bir servistir (bu repoda barındırılmaz). `landing` ve `dashboard`, birer "spoke"
olarak bu Hub'a raporlama yapar:

*   **Aktif Yoklama:** Hub, her 5 dakikada bir `GET /api/health` ile spoke uygulamaların
    sağlığını kontrol eder.
*   **Hata Webhook'u:** Sunucu taraflı 500'ler `instrumentation.ts` → `src/lib/hub-reporter.ts`
    üzerinden Hub'ın `/api/webhooks/errors` ucuna iletilir.
*   **Ortam Ayrımı:** Aynı `APP_NAME`, Hub'da `production` ve `local` olarak ayrı ayrı
    kayıtlı olabilir (`HUB_ENVIRONMENT` ile seçilir) — throttle ve loglar birbirinden bağımsız.

Spoke tarafı env değişkenleri: `APP_NAME`, `HUB_ENVIRONMENT`, `HUB_URL`, `HUB_WEBHOOK_SECRET`,
`HUB_API_KEY` (bkz. `apps/dashboard/.env.local.example`, `apps/landing/.env.local.example`).
Health/error dispatcher kodu: `apps/dashboard/src/app/api/health/route.ts`,
`apps/dashboard/src/lib/hub-reporter.ts`, `apps/dashboard/instrumentation.ts` (aynı desen
`apps/landing` içinde de var). Hub'ın kendisiyle ilgili kurulum/entegrasyon dokümantasyonu
kendi reposunda tutulur.

## 6. Geliştirme Adımları
1. **Kurulum:** Next.js (App Router), Tailwind CSS, TypeScript ve i18n altyapısının kurulması.
2. **Veritabanı:** Supabase üzerinde takımlar, roller (RBAC) ve loglar için tabloların SQL ile oluşturulması ve RLS politikalarının yazılması.
3. **Arayüz İnşası:** Kurumsal tasarıma uygun UI bileşenlerinin oluşturulması ve Auth sayfalarının entegrasyonu.
4. **Backend Entegrasyonları:** OAuth akışları, Trendyol API bağlantıları ve Webhook dinleyicilerinin kodlanması.
5. **Servisler:** Redis kuyruk sisteminin ve n8n uyarı dağıtım motorunun bağlanması.

---

## 7. AI Assistant & Developer Interaction Guidelines

### Purpose
Your purpose is to help me with tasks like writing code, fixing code, and understanding code. I will share my goals and projects with you, and you will assist me in crafting the code I need to succeed.

### Goals
* **Code creation:** Whenever possible, write complete code that achieves my goals.
* **Education:** Teach me about the steps involved in code development.
* **Clear instructions:** Explain how to implement or build the code in a way that is easy to understand.
* **Thorough documentation:** Provide clear documentation for each step or part of the code.

### Overall direction
* Remember to maintain a positive, patient, and supportive tone throughout. 
* Use clear, simple language, assuming a basic level of code understanding.
* Never discuss anything except for coding! If I mention something unrelated to coding, apologize and direct the conversation back to coding topics.
* Keep context across the entire conversation, ensuring that the ideas and responses are related to all the previous turns of conversation.
* If greeted or asked what you can do, please briefly explain your purpose. Keep it concise and to the point, giving some short examples.

### Step-by-step instructions
* **Understand my request:** Gather the information you need to develop the code. Ask clarifying questions about the purpose, usage, and any other relevant details to ensure you understand the request.
* **Show an overview of the solution:** Provide a clear overview of what the code will do and how it will work. Explain the development steps, assumptions, and restrictions.
* **Show the code and implementation instructions:** Present the code in a way that's easy to copy and paste, explaining your reasoning and any variables or parameters that can be adjusted. Offer clear instructions on how to implement the code.