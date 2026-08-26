# CLAUDE CODE TALİMAT DOKÜMANI: STOCKALERT PADDLE BILLING VE ABONELİK MİMARİSİ

Bu doküman; **StockAlert** B2B SaaS platformu için **Paddle Billing (Merchant of Record)** altyapısını kullanarak **14 Günlük Kredi Kartsız Reverse-Trial**, **Doğrudan Kredi Kartı ile Ödeme (Paddle Overlay Checkout)**, **3 Kademeli B2B Abonelik Planı (Starter, Growth, Scale)**, **Özellik Sınırlandırma (Feature Gating)**, **Veritabanı Mimarisi (Prisma)** ve **Bildirim Kanalı Yetkilendirmesi** mimarisini eksiksiz olarak inşa etmek üzere Claude Code CLI için hazırlanmış adım adım teknik uygulama rehberidir.

---

## 1. PROJE MİMARİSİ VE HEDEFLER

StockAlert; B2B e-ticaret satıcılarının kendi online mağazalarını (Shopify, WooCommerce vb.) bağlayarak stok seviyelerini, kritik tükenme eşiklerini takip ettiği ve çoklu kanallardan anlık bildirim aldığı bir SaaS platformudur.

### 1.1. Fiyatlandırma ve Paket Modeli

| Özellik / Parametre | Starter | Growth (En Popüler) | Scale |
| :--- | :--- | :--- | :--- |
| **Aylık Fiyat** | **$19 / ay** | **$49 / ay** | **$119 / ay** |
| **Yıllık Fiyat (2 Ay Ücretsiz)** | **$190 / yıl** | **$490 / yıl** | **$1.190 / yıl** |
| **Bağlı Mağaza Limiti** | 1 Mağaza | 3 Mağaza | 10 Mağaza |
| **Takip Edilen SKU Limiti** | 500 SKU / Varyant | 2.500 SKU / Varyant | 15.000 SKU / Varyant |
| **Senkronizasyon Sıklığı** | 30 Dakikada bir | 5 Dakikada bir | Anlık (Real-time Queue) |
| **Kritik Stok Eşiği** | Genel Sabit Eşik | Ürün / Kategori Bazlı Özel Eşik | Dinamik Satış Hızı (Velocity) Eşiği |
| **İzin Verilen Bildirim Kanalları** | E-posta, Telegram Botu | E-posta, Telegram, Discord, Slack | E-posta, Telegram, Discord, Slack, Özel Webhook, SMS |
| **Dahil Edilen SMS Kotası** | — | — | 100 SMS / ay |
| **Özel Webhook (n8n / Make / ERP)** | — | — | Aktif |
| **CSV / Excel Dışa Aktarım** | — | Aktif | Aktif |
| **Kullanıcı Koltuğu (Seats)** | 1 Kullanıcı | 3 Kullanıcı | 10 Kullanıcı |

### 1.2. 14 Günlük Kredi Kartsız Reverse-Trial Mantığı
* Kayıt anında kullanıcıdan kredi kartı bilgisi **istenmez**.
* Kayıt olan her yeni organizasyona 14 gün boyunca en popüler paket olan **Growth** planının tüm yetenekleri tam yetkiyle tanımlanır.
* 14 günün sonunda ödeme yapılmamışsa hesap `TRIAL_EXPIRED` durumuna geçer:
  * Mağaza senkronizasyonu ve bildirim tetikleyicileri dondurulur.
  * Panel "Salt Okunur (Read-Only)" moduna alınır ve kullanıcı kredi kartıyla bir plan seçene kadar kilit modalı gösterilir.

> **Kritik Kural:** Sistemde WhatsApp entegrasyonu KESİNLİKLE yer almayacaktır. Bildirim kanalları E-posta, Telegram, Discord, Slack, Özel Webhook ve SMS ile sınırlandırılmıştır.

---

## 2. TEKNOLOJİ YIĞINI VE ORTAM DEĞİŞKENLERİ

### 2.1. Bağımlılıkların Kurulumu
Proje kök dizininde aşağıdaki paketleri yükleyin:

```bash
npm install @paddle/paddle-node-sdk @paddle/paddle-js
```

### 2.2. Ortam Değişkenleri (`.env.local`)
Aşağıdaki anahtarları `.env.local` dosyasına tanımlayın:

```env
# Paddle API Yapılandırması (Sandbox veya Production)
PADDLE_ENVIRONMENT=sandbox
PADDLE_API_KEY=paddlesecret_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
PADDLE_WEBHOOK_SECRET_KEY=pdl_ntf_set_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox

# Paddle Price ID'leri (Aylık & Yıllık)
NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTHLY=pri_01starter_m_xxxxxx
NEXT_PUBLIC_PADDLE_PRICE_STARTER_YEARLY=pri_01starter_y_xxxxxx
NEXT_PUBLIC_PADDLE_PRICE_GROWTH_MONTHLY=pri_01growth_m_xxxxxx
NEXT_PUBLIC_PADDLE_PRICE_GROWTH_YEARLY=pri_01growth_y_xxxxxx
NEXT_PUBLIC_PADDLE_PRICE_SCALE_MONTHLY=pri_01scale_m_xxxxxx
NEXT_PUBLIC_PADDLE_PRICE_SCALE_YEARLY=pri_01scale_y_xxxxxx

# Uygulama Temel URL'i
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 3. VERİTABANI ŞEMASI (PRISMA SCHEMA)

`prisma/schema.prisma` dosyasını aşağıdaki modellerle güncelleyin:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum SubscriptionTier {
  STARTER
  GROWTH
  SCALE
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  TRIAL_EXPIRED
  INCOMPLETE
}

enum BillingInterval {
  MONTHLY
  YEARLY
}

enum NotificationChannelType {
  EMAIL
  TELEGRAM
  DISCORD
  SLACK
  CUSTOM_WEBHOOK
  SMS
}

model Organization {
  id                   String                 @id @default(cuid())
  name                 String
  slug                 String                 @unique
  createdAt            DateTime               @default(now())
  updatedAt            DateTime               @updatedAt

  // Paddle Entegrasyonu
  paddleCustomerId     String?                @unique
  subscription         Subscription?

  // İlişkiler
  members              OrganizationMember[]
  stores               Store[]
  notificationChannels NotificationChannel[]
  smsQuotaUsage        SmsQuotaUsage[]
}

model OrganizationMember {
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  role           String       @default("MEMBER") // ADMIN, MEMBER
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
}

model User {
  id          String               @id @default(cuid())
  email       String               @unique
  name        String?
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt
  memberships OrganizationMember[]
}

model Subscription {
  id                   String             @id @default(cuid())
  organizationId       String             @unique
  organization         Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  tier                 SubscriptionTier   @default(GROWTH)
  status               SubscriptionStatus @default(TRIALING)
  interval             BillingInterval?

  paddleSubscriptionId String?            @unique
  paddlePriceId        String?

  trialStartDate       DateTime           @default(now())
  trialEndDate         DateTime           // now() + 14 gün
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean            @default(false)

  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
}

model Store {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  name           String
  platform       String       // SHOPIFY, WOOCOMMERCE
  apiUrl         String?
  apiCredentials String?      // Şifrelenmiş JSON
  isActive       Boolean      @default(true)
  lastSyncedAt   DateTime?
  products       Product[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model Product {
  id            String    @id @default(cuid())
  storeId       String
  store         Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  sku           String
  title         String
  currentStock  Int       @default(0)
  threshold     Int       @default(5)
  category      String?
  salesVelocity Float?    // Günlük ortalama tükenme hızı
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([storeId, sku])
}

model NotificationChannel {
  id             String                  @id @default(cuid())
  organizationId String
  organization   Organization            @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  type           NotificationChannelType
  config         Json                    // { botToken, chatId, webhookUrl, phoneNumber, email }
  isEnabled      Boolean                 @default(true)
  createdAt      DateTime                @default(now())
  updatedAt      DateTime                @updatedAt
}

model SmsQuotaUsage {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  periodYear     Int
  periodMonth    Int
  usedCount      Int          @default(0)
  limit          Int          @default(100)

  @@unique([organizationId, periodYear, periodMonth])
}
```

---

## 4. PLAN YAPILANDIRMASI VE FEATURE GATING

### 4.1. Plan Limit Tanımları: `src/lib/plans/config.ts`

```typescript
import { SubscriptionTier, NotificationChannelType } from '@prisma/client';

export interface PlanLimits {
  tier: SubscriptionTier;
  displayName: string;
  monthlyPriceUSD: number;
  yearlyPriceUSD: number;
  maxStores: number;
  maxSKUs: number;
  syncIntervalMinutes: number;
  maxSeats: number;
  allowedChannels: NotificationChannelType[];
  hasCustomThresholds: boolean;
  hasVelocityPrediction: boolean;
  hasCsvExport: boolean;
  hasCustomWebhooks: boolean;
  monthlyFreeSms: number;
}

export const PLAN_CONFIGS: Record<SubscriptionTier, PlanLimits> = {
  [SubscriptionTier.STARTER]: {
    tier: SubscriptionTier.STARTER,
    displayName: 'Starter',
    monthlyPriceUSD: 19,
    yearlyPriceUSD: 190,
    maxStores: 1,
    maxSKUs: 500,
    syncIntervalMinutes: 30,
    maxSeats: 1,
    allowedChannels: [
      NotificationChannelType.EMAIL,
      NotificationChannelType.TELEGRAM,
    ],
    hasCustomThresholds: false,
    hasVelocityPrediction: false,
    hasCsvExport: false,
    hasCustomWebhooks: false,
    monthlyFreeSms: 0,
  },
  [SubscriptionTier.GROWTH]: {
    tier: SubscriptionTier.GROWTH,
    displayName: 'Growth',
    monthlyPriceUSD: 49,
    yearlyPriceUSD: 490,
    maxStores: 3,
    maxSKUs: 2500,
    syncIntervalMinutes: 5,
    maxSeats: 3,
    allowedChannels: [
      NotificationChannelType.EMAIL,
      NotificationChannelType.TELEGRAM,
      NotificationChannelType.DISCORD,
      NotificationChannelType.SLACK,
    ],
    hasCustomThresholds: true,
    hasVelocityPrediction: false,
    hasCsvExport: true,
    hasCustomWebhooks: false,
    monthlyFreeSms: 0,
  },
  [SubscriptionTier.SCALE]: {
    tier: SubscriptionTier.SCALE,
    displayName: 'Scale',
    monthlyPriceUSD: 119,
    yearlyPriceUSD: 1190,
    maxStores: 10,
    maxSKUs: 15000,
    syncIntervalMinutes: 1,
    maxSeats: 10,
    allowedChannels: [
      NotificationChannelType.EMAIL,
      NotificationChannelType.TELEGRAM,
      NotificationChannelType.DISCORD,
      NotificationChannelType.SLACK,
      NotificationChannelType.CUSTOM_WEBHOOK,
      NotificationChannelType.SMS,
    ],
    hasCustomThresholds: true,
    hasVelocityPrediction: true,
    hasCsvExport: true,
    hasCustomWebhooks: true,
    monthlyFreeSms: 100,
  },
};
```

### 4.2. Kısıt ve Yetki Koruyucu (Guard): `src/lib/plans/guard.ts`

```typescript
import prisma from '@/lib/prisma';
import { PLAN_CONFIGS } from './config';
import { SubscriptionStatus, SubscriptionTier, NotificationChannelType } from '@prisma/client';

export async function getOrganizationPlanContext(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      subscription: true,
      stores: {
        include: {
          _count: { select: { products: true } },
        },
      },
      members: true,
      notificationChannels: true,
    },
  });

  if (!org) throw new Error('Organizasyon bulunamadı');

  const sub = org.subscription;
  const now = new Date();

  // Deneme süresi veya aktif abonelik kontrolü
  const isTrialActive = sub?.status === SubscriptionStatus.TRIALING && sub.trialEndDate > now;
  const isSubscriptionActive = sub?.status === SubscriptionStatus.ACTIVE;
  const isAccessAllowed = isTrialActive || isSubscriptionActive;

  // Reverse Trial sürecinde kullanıcı Growth yeteneklerine sahiptir
  const effectiveTier: SubscriptionTier = isTrialActive
    ? SubscriptionTier.GROWTH
    : (sub?.tier ?? SubscriptionTier.STARTER);

  const limits = PLAN_CONFIGS[effectiveTier];
  const currentStoreCount = org.stores.length;
  const currentTotalSKUs = org.stores.reduce((acc, s) => acc + s._count.products, 0);
  const currentMemberCount = org.members.length;

  return {
    organization: org,
    subscription: sub,
    isAccessAllowed,
    isTrialActive,
    effectiveTier,
    limits,
    usage: {
      stores: currentStoreCount,
      skus: currentTotalSKUs,
      members: currentMemberCount,
    },
  };
}

export async function assertCanAddStore(organizationId: string) {
  const ctx = await getOrganizationPlanContext(organizationId);
  if (!ctx.isAccessAllowed) throw new Error('Aboneliğiniz aktif değil veya deneme süreniz doldu.');
  if (ctx.usage.stores >= ctx.limits.maxStores) {
    throw new Error(`Maksimum mağaza limitinize (${ctx.limits.maxStores}) ulaştınız. Lütfen paketinizi yükseltin.`);
  }
}

export async function assertCanAddSKUs(organizationId: string, incomingCount: number) {
  const ctx = await getOrganizationPlanContext(organizationId);
  if (!ctx.isAccessAllowed) throw new Error('Aboneliğiniz aktif değil veya deneme süreniz doldu.');
  if (ctx.usage.skus + incomingCount > ctx.limits.maxSKUs) {
    throw new Error(`SKU limitiniz (${ctx.limits.maxSKUs}) aşılıyor. Mevcut: ${ctx.usage.skus}, Eklenen: ${incomingCount}`);
  }
}

export async function assertCanUseChannel(organizationId: string, channelType: NotificationChannelType) {
  const ctx = await getOrganizationPlanContext(organizationId);
  if (!ctx.isAccessAllowed) throw new Error('Aboneliğiniz aktif değil veya deneme süreniz doldu.');
  if (!ctx.limits.allowedChannels.includes(channelType)) {
    throw new Error(`${channelType} bildirim kanalı ${ctx.limits.displayName} paketinizde desteklenmemektedir.`);
  }
}
```

---

## 5. 14 GÜNLÜK REVERSE-TRIAL KURULUMU VE CRON WORKER

### 5.1. Organizasyon ve Trial Kayıt Servisi: `src/services/organization.service.ts`

```typescript
import prisma from '@/lib/prisma';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';

export async function createOrganizationWithTrial(userId: string, orgName: string, orgSlug: string) {
  const trialStartDate = new Date();
  const trialEndDate = new Date();
  trialEndDate.setDate(trialStartDate.getDate() + 14); // 14 Gün

  return await prisma.$transaction(async (tx) => {
    return await tx.organization.create({
      data: {
        name: orgName,
        slug: orgSlug,
        members: {
          create: {
            userId,
            role: 'ADMIN',
          },
        },
        subscription: {
          create: {
            tier: SubscriptionTier.GROWTH, // Reverse trial'da Growth verilir
            status: SubscriptionStatus.TRIALING,
            trialStartDate,
            trialEndDate,
          },
        },
      },
      include: {
        subscription: true,
      },
    });
  });
}
```

### 5.2. Trial Süresi Dolum Denetleyicisi: `src/jobs/trialChecker.ts`

```typescript
import prisma from '@/lib/prisma';
import { SubscriptionStatus } from '@prisma/client';

export async function checkExpiredTrials() {
  const now = new Date();

  // Süresi dolan deneme hesaplarını tespit et
  const expiredSubs = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.TRIALING,
      trialEndDate: { lt: now },
    },
    include: { organization: true },
  });

  for (const sub of expiredSubs) {
    await prisma.$transaction([
      // Abonelik statüsünü TRIAL_EXPIRED yap
      prisma.subscription.update({
        where: { id: sub.id },
        data: { status: SubscriptionStatus.TRIAL_EXPIRED },
      }),
      // Mağazaların senkronizasyonunu durdur
      prisma.store.updateMany({
        where: { organizationId: sub.organizationId },
        data: { isActive: false },
      }),
    ]);

    console.log(`[TrialChecker] Org ID: ${sub.organizationId} deneme süresi bitti ve kilitlendi.`);
  }
}
```

---

## 6. PADDLE BILLING SUNUCU MİMARİSİ

### 6.1. Paddle Node SDK İstemcisi: `src/lib/paddle/server.ts`

```typescript
import { Environment, Paddle } from '@paddle/paddle-node-sdk';

export const paddle = new Paddle(process.env.PADDLE_API_KEY!, {
  environment: process.env.PADDLE_ENVIRONMENT === 'sandbox' ? Environment.sandbox : Environment.production,
});
```

### 6.2. Paddle Price Eşleme Yardımcısı: `src/lib/paddle/priceMap.ts`

```typescript
import { SubscriptionTier, BillingInterval } from '@prisma/client';

export function mapPaddlePriceToTier(priceId: string): { tier: SubscriptionTier; interval: BillingInterval } {
  const p = process.env;
  if (priceId === p.NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTHLY) return { tier: SubscriptionTier.STARTER, interval: BillingInterval.MONTHLY };
  if (priceId === p.NEXT_PUBLIC_PADDLE_PRICE_STARTER_YEARLY) return { tier: SubscriptionTier.STARTER, interval: BillingInterval.YEARLY };
  if (priceId === p.NEXT_PUBLIC_PADDLE_PRICE_GROWTH_MONTHLY) return { tier: SubscriptionTier.GROWTH, interval: BillingInterval.MONTHLY };
  if (priceId === p.NEXT_PUBLIC_PADDLE_PRICE_GROWTH_YEARLY) return { tier: SubscriptionTier.GROWTH, interval: BillingInterval.YEARLY };
  if (priceId === p.NEXT_PUBLIC_PADDLE_PRICE_SCALE_MONTHLY) return { tier: SubscriptionTier.SCALE, interval: BillingInterval.MONTHLY };
  if (priceId === p.NEXT_PUBLIC_PADDLE_PRICE_SCALE_YEARLY) return { tier: SubscriptionTier.SCALE, interval: BillingInterval.YEARLY };
  return { tier: SubscriptionTier.STARTER, interval: BillingInterval.MONTHLY };
}
```

### 6.3. Paddle Webhook Handler: `src/app/api/billing/paddle-webhook/route.ts`

```typescript
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { paddle } from '@/lib/paddle/server';
import prisma from '@/lib/prisma';
import { mapPaddlePriceToTier } from '@/lib/paddle/priceMap';
import { SubscriptionStatus } from '@prisma/client';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = headers().get('paddle-signature') || '';

  let eventData: any;
  try {
    eventData = paddle.webhooks.unmarshal(rawBody, process.env.PADDLE_WEBHOOK_SECRET_KEY!, signature);
  } catch (err: any) {
    console.error('Paddle Webhook Doğrulama Hatası:', err.message);
    return NextResponse.json({ error: `Webhook Hatası: ${err.message}` }, { status: 400 });
  }

  const { eventType, data } = eventData;

  switch (eventType) {
    case 'subscription.created':
    case 'subscription.activated':
    case 'subscription.updated': {
      const subscription = data;
      const organizationId = subscription.customData?.organizationId;
      if (!organizationId) break;

      const priceId = subscription.items?.[0]?.price?.id;
      const { tier, interval } = mapPaddlePriceToTier(priceId);

      let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
      if (subscription.status === 'past_due') status = SubscriptionStatus.PAST_DUE;
      if (subscription.status === 'canceled') status = SubscriptionStatus.CANCELED;
      if (subscription.status === 'trialing') status = SubscriptionStatus.TRIALING;

      await prisma.organization.update({
        where: { id: organizationId },
        data: { paddleCustomerId: subscription.customerId },
      });

      await prisma.subscription.upsert({
        where: { organizationId },
        update: {
          paddleSubscriptionId: subscription.id,
          paddlePriceId: priceId,
          tier,
          interval,
          status,
          currentPeriodStart: subscription.currentBillingPeriod?.startsAt ? new Date(subscription.currentBillingPeriod.startsAt) : new Date(),
          currentPeriodEnd: subscription.currentBillingPeriod?.endsAt ? new Date(subscription.currentBillingPeriod.endsAt) : new Date(),
          cancelAtPeriodEnd: subscription.scheduledChange?.action === 'cancel',
        },
        create: {
          organizationId,
          paddleSubscriptionId: subscription.id,
          paddlePriceId: priceId,
          tier,
          interval,
          status,
          trialStartDate: new Date(),
          trialEndDate: new Date(),
          currentPeriodStart: subscription.currentBillingPeriod?.startsAt ? new Date(subscription.currentBillingPeriod.startsAt) : new Date(),
          currentPeriodEnd: subscription.currentBillingPeriod?.endsAt ? new Date(subscription.currentBillingPeriod.endsAt) : new Date(),
        },
      });

      // Mağazaların aktifliğini sağla
      await prisma.store.updateMany({
        where: { organizationId },
        data: { isActive: true },
      });
      break;
    }

    case 'subscription.canceled': {
      const subscription = data;
      const organizationId = subscription.customData?.organizationId;
      if (!organizationId) break;

      await prisma.subscription.update({
        where: { organizationId },
        data: {
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: false,
        },
      });

      // Mağaza senkronizasyonunu dondur
      await prisma.store.updateMany({
        where: { organizationId },
        data: { isActive: false },
      });
      break;
    }

    case 'subscription.past_due': {
      const subscription = data;
      const organizationId = subscription.customData?.organizationId;
      if (!organizationId) break;

      await prisma.subscription.update({
        where: { organizationId },
        data: { status: SubscriptionStatus.PAST_DUE },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

---

## 7. FRONTEND: DOĞRUDAN KREDİ KARTI CHECKOUT AKIŞI

### 7.1. Paddle.js Entegrasyon Hook'u: `src/hooks/usePaddle.ts`

```typescript
'use client';
import { useEffect, useState } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

export function usePaddle() {
  const [paddleInstance, setPaddleInstance] = useState<Paddle | null>(null);

  useEffect(() => {
    initializePaddle({
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
      eventCallback: (data) => {
        if (data.name === 'checkout.completed') {
          window.location.href = '/dashboard/billing?payment=success';
        }
      },
    }).then((instance) => {
      if (instance) setPaddleInstance(instance);
    });
  }, []);

  return paddleInstance;
}
```

### 7.2. Fiyatlandırma ve Ödeme Tablosu: `src/components/billing/PricingTable.tsx`

```tsx
'use client';
import React, { useState } from 'react';
import { usePaddle } from '@/hooks/usePaddle';

interface PricingTableProps {
  organizationId: string;
  userEmail: string;
}

export const PricingTable: React.FC<PricingTableProps> = ({ organizationId, userEmail }) => {
  const paddle = usePaddle();
  const [isYearly, setIsYearly] = useState(false);

  const handleOpenCheckout = (priceId: string) => {
    if (!paddle) {
      alert('Ödeme modülü yükleniyor, lütfen birkaç saniye sonra tekrar deneyin.');
      return;
    }

    // Paddle Overlay Checkout - Kullanıcı siteden ayrılmadan doğrudan kredi kartını girer
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: userEmail },
      customData: { organizationId },
      settings: {
        displayMode: 'overlay',
        theme: 'light',
        locale: 'tr',
        allowLogout: false,
      },
    });
  };

  return (
    <div className="py-12 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-gray-900">E-Ticaret Mağazanız İçin Esnek Planlar</h2>
        <p className="mt-3 text-lg text-gray-500">14 gün boyunca tüm özellikleri kredi kartı girmeden ücretsiz deneyin.</p>
        
        {/* Aylık / Yıllık Geçiş */}
        <div className="mt-6 flex justify-center items-center gap-3">
          <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>Aylık</span>
          <button
            type="button"
            onClick={() => setIsYearly(!isYearly)}
            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-indigo-600 transition-colors duration-200 ease-in-out"
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out ${isYearly ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <span className={`text-sm font-medium ${isYearly ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
            Yıllık <span className="text-emerald-600 font-bold text-xs bg-emerald-100 px-2 py-0.5 rounded-full ml-1">2 Ay Ücretsiz</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Starter Plan */}
        <div className="border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col justify-between bg-white">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Starter</h3>
            <p className="text-sm text-gray-500 mt-2">Tek mağazalı butik satıcılar için ideal başlangıç.</p>
            <div className="mt-4 text-4xl font-extrabold text-gray-900">
              ${isYearly ? '190' : '19'}
              <span className="text-base font-medium text-gray-500">/{isYearly ? 'yıl' : 'ay'}</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              <li>✓ 1 Mağaza Bağlantısı</li>
              <li>✓ 500 SKU / Varyant Takibi</li>
              <li>✓ 30 Dakikada Bir Senkronizasyon</li>
              <li>✓ E-posta & Telegram Bildirimi</li>
              <li>✓ 1 Kullanıcı Erişimi</li>
            </ul>
          </div>
          <button
            onClick={() => handleOpenCheckout(isYearly ? process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_YEARLY! : process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTHLY!)}
            className="mt-8 w-full bg-gray-900 text-white font-semibold py-3 px-4 rounded-xl hover:bg-gray-800 transition"
          >
            Kredi Kartı ile Abone Ol
          </button>
        </div>

        {/* Growth Plan */}
        <div className="border-2 border-indigo-600 rounded-2xl p-8 shadow-lg flex flex-col justify-between bg-white relative">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold py-1 px-4 rounded-full uppercase tracking-wider">
            En Çok Tercih Edilen
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Growth</h3>
            <p className="text-sm text-gray-500 mt-2">Büyüyen ve birden çok kanalda satış yapanlar için.</p>
            <div className="mt-4 text-4xl font-extrabold text-gray-900">
              ${isYearly ? '490' : '49'}
              <span className="text-base font-medium text-gray-500">/{isYearly ? 'yıl' : 'ay'}</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              <li>✓ 3 Mağaza Bağlantısı</li>
              <li>✓ 2.500 SKU / Varyant Takibi</li>
              <li>✓ 5 Dakikada Bir Senkronizasyon</li>
              <li>✓ Telegram, Discord & Slack Bildirimleri</li>
              <li>✓ Ürün Bazlı Özel Eşik Seviyesi</li>
              <li>✓ CSV / Excel Stok Raporlama</li>
              <li>✓ 3 Kullanıcı Erişimi</li>
            </ul>
          </div>
          <button
            onClick={() => handleOpenCheckout(isYearly ? process.env.NEXT_PUBLIC_PADDLE_PRICE_GROWTH_YEARLY! : process.env.NEXT_PUBLIC_PADDLE_PRICE_GROWTH_MONTHLY!)}
            className="mt-8 w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-indigo-700 transition shadow-md"
          >
            Kredi Kartı ile Abone Ol
          </button>
        </div>

        {/* Scale Plan */}
        <div className="border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col justify-between bg-white">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Scale</h3>
            <p className="text-sm text-gray-500 mt-2">Yüksek hacimli ve çoklu mağaza operasyonları için.</p>
            <div className="mt-4 text-4xl font-extrabold text-gray-900">
              ${isYearly ? '1.190' : '119'}
              <span className="text-base font-medium text-gray-500">/{isYearly ? 'yıl' : 'ay'}</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              <li>✓ 10 Mağaza Bağlantısı</li>
              <li>✓ 15.000 SKU / Varyant Takibi</li>
              <li>✓ Anlık (Real-time Queue) Senkronizasyon</li>
              <li>✓ Tüm Kanallar + Özel Webhook (n8n / Make / ERP)</li>
              <li>✓ 100 SMS / ay Dahil</li>
              <li>✓ Satış Hızı (Velocity) Tahmini</li>
              <li>✓ 10 Kullanıcı Erişimi</li>
            </ul>
          </div>
          <button
            onClick={() => handleOpenCheckout(isYearly ? process.env.NEXT_PUBLIC_PADDLE_PRICE_SCALE_YEARLY! : process.env.NEXT_PUBLIC_PADDLE_PRICE_SCALE_MONTHLY!)}
            className="mt-8 w-full bg-gray-900 text-white font-semibold py-3 px-4 rounded-xl hover:bg-gray-800 transition"
          >
            Kredi Kartı ile Abone Ol
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 8. BİLDİRİM DAĞITIM SERVİSİ (WHATSAPP HARİÇ)

`src/services/notification.service.ts` dosyasını oluşturun:

```typescript
import prisma from '@/lib/prisma';
import { getOrganizationPlanContext } from '@/lib/plans/guard';
import { NotificationChannelType } from '@prisma/client';

export interface AlertPayload {
  productTitle: string;
  sku: string;
  currentStock: number;
  threshold: number;
  storeName: string;
}

export async function dispatchStockAlert(organizationId: string, payload: AlertPayload) {
  const ctx = await getOrganizationPlanContext(organizationId);
  if (!ctx.isAccessAllowed) {
    console.warn(`Org ${organizationId} bildirim engellendi: Abonelik/Trial aktif değil.`);
    return;
  }

  const channels = await prisma.notificationChannel.findMany({
    where: { organizationId, isEnabled: true },
  });

  for (const channel of channels) {
    if (!ctx.limits.allowedChannels.includes(channel.type)) continue;

    switch (channel.type) {
      case NotificationChannelType.EMAIL:
        // E-posta gönderimi (Resend / Postmark)
        break;

      case NotificationChannelType.TELEGRAM: {
        const { botToken, chatId } = channel.config as any;
        const msg = `🚨 *StockAlert Uyarısı*\n\n*Mağaza:* ${payload.storeName}\n*Ürün:* ${payload.productTitle}\n*SKU:* \`${payload.sku}\`\n*Kalan Stok:* *${payload.currentStock}* (Eşik: ${payload.threshold})`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
        });
        break;
      }

      case NotificationChannelType.DISCORD: {
        const { webhookUrl } = channel.config as any;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: "⚠️ Kritik Stok Alarmı",
              color: 15158332,
              fields: [
                { name: "Mağaza", value: payload.storeName, inline: true },
                { name: "SKU", value: payload.sku, inline: true },
                { name: "Kalan Stok", value: `${payload.currentStock} adet`, inline: true },
                { name: "Eşik", value: `${payload.threshold} adet`, inline: true },
              ],
              description: `**${payload.productTitle}** kritik stok seviyesine indi!`,
              timestamp: new Date().toISOString(),
            }],
          }),
        });
        break;
      }

      case NotificationChannelType.SLACK: {
        const { webhookUrl } = channel.config as any;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blocks: [
              {
                type: "header",
                text: { type: "plain_text", text: "🚨 StockAlert: Kritik Stok Uyarısı" },
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*${payload.storeName}* mağazasında *${payload.productTitle}* (SKU: \`${payload.sku}\`) kritik seviyede!
*Mevcut:* ${payload.currentStock} | *Eşik:* ${payload.threshold}`,
                },
              },
            ],
          }),
        });
        break;
      }

      case NotificationChannelType.CUSTOM_WEBHOOK: {
        if (ctx.limits.hasCustomWebhooks) {
          const { endpointUrl, secretToken } = channel.config as any;
          await fetch(endpointUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-StockAlert-Signature': secretToken || '',
            },
            body: JSON.stringify({
              event: 'stock.critical',
              timestamp: new Date().toISOString(),
              data: payload,
            }),
          });
        }
        break;
      }

      case NotificationChannelType.SMS: {
        const now = new Date();
        const usage = await prisma.smsQuotaUsage.upsert({
          where: {
            organizationId_periodYear_periodMonth: {
              organizationId,
              periodYear: now.getFullYear(),
              periodMonth: now.getMonth() + 1,
            },
          },
          update: {},
          create: {
            organizationId,
            periodYear: now.getFullYear(),
            periodMonth: now.getMonth() + 1,
            usedCount: 0,
            limit: ctx.limits.monthlyFreeSms,
          },
        });

        if (usage.usedCount < usage.limit) {
          // SMS API Sağlayıcı Çağrısı (Netgsm / Twilio)
          await prisma.smsQuotaUsage.update({
            where: { id: usage.id },
            data: { usedCount: { increment: 1 } },
          });
        }
        break;
      }
    }
  }
}
```

---

## 9. DASHBOARD UX & KİLİT BİLEŞENLERİ

### 9.1. Kalan Deneme Süresi Banner'ı: `src/components/layout/TrialBanner.tsx`

```tsx
'use client';
import React from 'react';
import Link from 'next/link';

interface TrialBannerProps {
  trialEndDate: Date;
  status: string;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ trialEndDate, status }) => {
  if (status !== 'TRIALING') return null;

  const now = new Date();
  const diffDays = Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="bg-amber-500 text-white px-4 py-2.5 text-center text-sm font-medium flex items-center justify-center justify-between">
      <span>
        ⚡ <strong>Growth Planı</strong> deneme sürümündesiniz. Kalan süre: <strong>{diffDays} gün</strong>.
      </span>
      <Link href="/dashboard/billing" className="ml-4 bg-white text-amber-600 font-bold px-3 py-1 rounded-lg text-xs hover:bg-amber-50 transition">
        Kredi Kartı ile Abone Ol
      </Link>
    </div>
  );
};
```

### 9.2. Süre Dolumu Kilit Modalı: `src/components/modals/TrialExpiredModal.tsx`

```tsx
'use client';
import React from 'react';
import Link from 'next/link';

interface TrialExpiredModalProps {
  isOpen: boolean;
}

export const TrialExpiredModal: React.FC<TrialExpiredModalProps> = ({ isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          🔒
        </div>
        <h3 className="text-2xl font-bold text-gray-900">14 Günlük Deneme Süreniz Sona Erdi</h3>
        <p className="text-gray-600 mt-3 text-sm">
          Mağaza stok takiplerinizin, senkronizasyonun ve bildirimlerinizin kesintisiz devam etmesi için lütfen kredi kartınızla bir plan seçin.
        </p>
        <Link
          href="/dashboard/billing"
          className="mt-6 inline-block w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-indigo-700 transition"
        >
          Planları İncele ve Abone Ol
        </Link>
      </div>
    </div>
  );
};
```

---

## 10. CLAUDE CODE İÇİN ADIM ADIM UYGULAMA SIRASI (EXECUTION PHASES)

Claude Code CLI ile çalışırken aşağıdaki adımları sırayla icra edin:

### FAZ 1: Paketler ve Veritabanı Şeması
1. `npm install @paddle/paddle-node-sdk @paddle/paddle-js` çalıştırın.
2. `prisma/schema.prisma` dosyasını `Subscription`, `NotificationChannel`, `SmsQuotaUsage` modelleriyle güncelleyin.
3. `npx prisma db push` komutunu çalıştırarak veritabanı şemasını uygulayın.

### FAZ 2: Reverse Trial ve Kısıt Altyapısı
1. `src/lib/plans/config.ts` ve `src/lib/plans/guard.ts` dosyalarını oluşturun.
2. Kullanıcı kayıt akışına `createOrganizationWithTrial` servisini bağlayarak 14 günlük Growth denemesini otomatik başlatın.
3. `src/jobs/trialChecker.ts` dosyasını oluşturup cron tetikleyicisine bağlayın.

### FAZ 3: Paddle Sunucu Entegrasyonu
1. `src/lib/paddle/server.ts` ve `src/lib/paddle/priceMap.ts` dosyalarını oluşturun.
2. `src/app/api/billing/paddle-webhook/route.ts` dosyasını ekleyin ve unmarshal imza doğrulamasını test edin.

### FAZ 4: Frontend ve Doğrudan Kredi Kartı Checkout
1. `src/hooks/usePaddle.ts` dosyasını yazın.
2. `src/components/billing/PricingTable.tsx` bileşeninde `paddle.Checkout.open({ displayMode: 'overlay' })` akışını entegre edin.
3. Dashboard layout'una `TrialBanner.tsx` ve `TrialExpiredModal.tsx` bileşenlerini yerleştirin.

### FAZ 5: Bildirim Gönderici ve Yetkilendirme
1. `src/services/notification.service.ts` dosyasını oluşturun (WhatsApp hariç; Telegram, Discord, Slack, Webhook, SMS).
2. Mağaza ekleme, SKU ekleme ve kanal tanımlama API rotalarına `assertCanAddStore`, `assertCanAddSKUs` ve `assertCanUseChannel` kontrollerini bağlayın.

### FAZ 6: Doğrulama ve Canlı Test
1. Test kullanıcısı oluşturup 14 günlük Growth paketinin aktif olduğunu doğrulayın.
2. Paddle Sandbox kredi kartları ile test ödemesi yapıp webhook'un hesabı anında `ACTIVE` durumuna getirdiğini teyit edin.