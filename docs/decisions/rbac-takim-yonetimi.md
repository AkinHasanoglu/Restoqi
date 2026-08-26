---
title: RBAC ile Takım Yönetimi — E-Ticaret Stok Uyarı Sistemi
tags: [decision, mimari, rbac, b2b]
source: sources/projects/2026-08-17-eticaret-stok-uyari-sistemi.md
date: 2026-08-17
status: active
---

# RBAC ile Takım Yönetimi — E-Ticaret Stok Uyarı Sistemi

## Karar
[[entities/eticaret-stok-uyari-sistemi]], çok kullanıcılı/takımlı (workspace) bir B2B modeli benimsedi: kullanıcılar "Yönetici", "Editör" veya "İzleyici" rollerine sahip olabiliyor (Role-Based Access Control).

## Gerekçe
Kurumsal e-ticaret firmaları hedef kitle olduğu için (bkz. proje özeti: "Shopify ve Trendyol satıcıları ile kurumsal e-ticaret firmaları"), tek kullanıcılı bir model yerine takım bazlı erişim kontrolü gerekiyor — denetim izleri (audit logs) de bu kararla birlikte geliyor: her kural değişikliğinin kim tarafından yapıldığının izlenmesi.

## Veritabanı Yansıması
`teams`, `team_members` (`team_id`, `user_id`, `role`), `audit_logs` (`team_id`, `user_id`, `action`, `timestamp`) tabloları.

## Portföy İçi Karşılaştırma
Diğer projelerde bu netlikte bir RBAC tanımı yok — [[entities/eticaret-gorsel-uretimi]]'nde sadece `USER`/`ADMIN` ikili rol ayrımı var (admin paneli erişimi için), [[entities/cv-hazirlama-otomasyonu]]'nda B2C/B2B rol ayrımı dashboard görünümünü değiştiriyor ama takım/rol matrisi yok.

## Kaynaklar
- [[sources/projects/2026-08-17-eticaret-stok-uyari-sistemi]]

## İlgili
- [[entities/eticaret-stok-uyari-sistemi]]
- [[concepts/rbac]]
- [[syntheses/tekrar-eden-mimari-kararlar]]
