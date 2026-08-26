'use client'

import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button } from '@stockalert/ui'
import type { Locale } from '@stockalert/i18n'

interface TrialExpiredDialogProps {
  open: boolean
}

/**
 * The dashboard's read-only lock, rendered whenever getPlanContext
 * (apps/dashboard/src/lib/plan-limits.ts) reports isAccessAllowed: false
 * — trial expired with no payment, or a lapsed subscription. Deliberately
 * not dismissable: `onOpenChange` is a no-op (Radix's controlled `open`
 * prop stays true no matter what closed it internally — clicking the
 * shared DialogContent's built-in close button, pressing Escape, or
 * clicking the overlay), and onEscapeKeyDown/onPointerDownOutside/
 * onInteractOutside are suppressed for the same reason. This is UX only:
 * the actual write-time enforcement is server-side (see
 * getSubscriptionLockError in lib/auth-guard.ts) — this dialog can't be
 * the only thing standing between a locked account and a mutation.
 */
export function TrialExpiredDialog({ open }: TrialExpiredDialogProps) {
  const t = useTranslations('dashboard.trial.expired')
  const locale = useLocale() as Locale
  const supportEmail = process.env['NEXT_PUBLIC_SUPPORT_EMAIL']

  return (
    <Dialog open={open} onOpenChange={() => { /* not dismissable — see comment above */ }}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('body')}</DialogDescription>
        </DialogHeader>
        <Button asChild className="w-full">
          <Link href={`/${locale}/settings/billing`}>{t('cta')}</Link>
        </Button>
        {/* This lock is a billing-status check, not a fraud/moderation
            decision, but it's still fully automated — an appeal path
            costs one link and means a wrong lock (e.g. a webhook that
            silently failed to record a real payment) doesn't dead-end
            the account. Compliance audit rule 38. */}
        {supportEmail && (
          <a
            href={`mailto:${supportEmail}?subject=StockAlert trial/subscription status looks wrong`}
            className="block text-center text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {t('contactSupport')}
          </a>
        )}
      </DialogContent>
    </Dialog>
  )
}
