# Lavanchor - Global Stok Alarmı SaaS Platformu

Lavanchor, dünya çapındaki e-ticaret satıcıları için tasarlanmış, çoklu pazar yeri destekli modern bir stok takip ve anlık bildirim platformudur. 

Satıcıların mağazalarındaki stok seviyelerini otonom olarak izler ve belirlenen kritik eşiğin altına düşen ürünler için anında Telegram üzerinden bildirim göndererek stok kesintilerinin önüne geçer.

## 🚀 Temel Özellikler
- **Çoklu Pazar Yeri Entegrasyonu:** Shopify, Amazon ve Trendyol API destekli modüler "Strategy Pattern" mimarisi.
- **Anlık Bildirimler:** Telegram Bot API ile saniyeler içinde doğrudan cihazınıza düşen stok uyarıları.
- **SaaS Altyapısı:** Stripe tabanlı güvenli abonelik sistemi, paket yönetimi ve otomatik tanımlanan ücretsiz deneme süreci.
- **Global Destek (i18n):** `next-intl` ile çoklu dil altyapısına hazır yapı.
- **Zamanlanmış Görevler:** Vercel Cron/Node-cron ile arka planda çalışan ve sistemi yormayan periyodik stok kontrolleri.
- **Modern Arayüz:** Ziyaretçileri karşılayan şık bir Landing Page ve kullanıcı dostu bir SaaS Kontrol Paneli (Dashboard).

## 🛠 Teknoloji Yığını
- **Framework:** Next.js (App Router), TypeScript
- **Veritabanı:** PostgreSQL, Prisma ORM
- **Kullanıcı Arayüzü:** Tailwind CSS, Shadcn UI, Framer Motion
- **Geliştirme Ortamı:** Docker, OpenCode CLI
- **Kimlik Doğrulama:** NextAuth.js

## ⚙️ Gereksinimler
Projeyi yerel ortamda çalıştırmak için sisteminizde şunların kurulu olması gerekir:
- Node.js (v18 veya üzeri)
- Docker ve Docker Compose
- OpenCode CLI (otomatize ve izole geliştirme ortamı için)
