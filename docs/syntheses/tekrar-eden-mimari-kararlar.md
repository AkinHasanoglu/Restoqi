---
title: Tekrar Eden Mimari Kararlar
tags: [synthesis, mimari, kararlar]
source: decisions/
date: 2026-08-17
status: active
---

# Tekrar Eden Mimari Kararlar

## n8n'den Bağımsızlaşma
En güçlü tekrar eden kalıp: **3 projede** ([[entities/cv-hazirlama-otomasyonu]], [[entities/yatirim-dashboard-uygulamasi]], [[entities/eticaret-gorsel-uretimi]]) n8n veya benzeri harici otomasyon aracı açıkça yasaklanmış; **1 projede** ([[entities/eticaret-stok-uyari-sistemi]]) sadece dağıtım katmanı için kabul edilebilir görülmüş. Detay: [[decisions/n8nden-bagimsizlasma]].

## Hub & Spoke İzleme
Tek örnek ama portföyün geri kalanını etkileyen bir karar: [[entities/saas-test-dashboard]] merkezi, [[entities/eticaret-stok-uyari-sistemi]] bir spoke. Detay: [[decisions/hub-and-spoke-izleme-mimarisi]]. Diğer 3 projenin (henüz plan aşamasında olan) Hub'a bağlanıp bağlanmayacağı kaynaklarda belirtilmemiş — açık konu.

## Serverless / Cron Tabanlı Arka Plan İşleme
[[entities/cv-hazirlama-otomasyonu]] Vercel Cron ile ([[decisions/b2b-toplu-isleme-arka-plan-worker]]), [[entities/eticaret-gorsel-uretimi]] BullMQ+Redis ile, [[entities/yatirim-dashboard-uygulamasi]] Celery/APScheduler ile — hepsi n8n yerine backend'e gömülü bir kuyruk/zamanlayıcı kullanıyor, ama üçü de **farklı bir teknoloji** seçmiş. Ortak ilke var, ortak implementasyon yok.

## RBAC
Sadece [[entities/eticaret-stok-uyari-sistemi]]'nde tam bir rol matrisi (Yönetici/Editör/İzleyici) var; diğerleri ikili (USER/ADMIN veya B2C/B2B) ayrımla yetiniyor. Detay: [[decisions/rbac-takim-yonetimi]].

## Kaynaklar
Tüm `decisions/` altındaki sayfalar.

## İlgili
- [[syntheses/saas-portfoy-genel-bakis]]
- [[syntheses/ortak-teknoloji-yigini]]
