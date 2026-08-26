'use client'

import * as React from 'react'
import { Checkbox, Label } from '@stockalert/ui'
import { PaddleCheckoutButton } from './paddle-checkout-button'

export interface CheckoutPlanOption {
  plan: string
  priceId: string
  label: string
  variant: 'default' | 'outline'
}

interface CheckoutPanelProps {
  teamId: string
  plans: CheckoutPlanOption[]
}

/**
 * Renewal-terms disclosure + EU digital-content withdrawal-waiver gate,
 * both directly above the checkout buttons they govern (compliance audit
 * rules 09, 37). Split out from billing/page.tsx (a Server Component)
 * because the waiver checkbox needs client-side state to gate the
 * buttons — mirrors why paddle-checkout-button.tsx is already 'use client'.
 */
export function CheckoutPanel({ teamId, plans }: CheckoutPanelProps) {
  // Both derived from one state value (rather than two) so they can never
  // disagree — "accepted" is just "acceptedAt is set".
  const [waiverAcceptedAt, setWaiverAcceptedAt] = React.useState<string | undefined>(undefined)
  const waiverAccepted = waiverAcceptedAt !== undefined

  function handleWaiverChange(checked: boolean) {
    setWaiverAcceptedAt(checked ? new Date().toISOString() : undefined)
  }

  return (
    <div className="space-y-4">
      {/* Directly above the payment buttons, per compliance audit rule 09 —
          recurring amount/interval is already in each button's label
          ("Subscribe to Growth — $49/mo"); this covers renewal + cancellation. */}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Billed monthly, starting today, and renews automatically at the price shown above every month
        until you cancel. Cancel anytime from "Manage subscription" below — no phone call or support
        request needed — and you'll keep access through the end of the period you already paid for.
      </p>

      <div className="flex items-start gap-2 rounded-lg border border-border p-3">
        <Checkbox
          id="digital-content-waiver"
          checked={waiverAccepted}
          onCheckedChange={(checked) => handleWaiverChange(checked === true)}
          className="mt-0.5"
        />
        <Label htmlFor="digital-content-waiver" className="text-xs font-normal leading-snug text-muted-foreground">
          I want immediate access to StockAlert starting today, and I understand this means I waive my
          statutory right to a withdrawal/cooling-off period for this digital service.
        </Label>
      </div>

      <div className="space-y-2">
        {plans.map(({ plan, priceId, label, variant }) => (
          <PaddleCheckoutButton
            key={plan}
            priceId={priceId}
            teamId={teamId}
            label={label}
            variant={variant}
            disabled={!waiverAccepted}
            waiverAcknowledgedAt={waiverAcceptedAt}
          />
        ))}
      </div>
    </div>
  )
}
