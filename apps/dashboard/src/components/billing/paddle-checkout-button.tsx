'use client'

import * as React from 'react'
import { initializePaddle, type Paddle } from '@paddle/paddle-js'
import { Button } from '@stockalert/ui'
import { toast } from '@stockalert/ui'

interface PaddleCheckoutButtonProps {
  priceId: string
  teamId: string
  label: string
  variant?: 'default' | 'outline'
  /**
   * Gates checkout on the EU digital-content withdrawal waiver checkbox
   * (see checkout-panel.tsx) — disabled (in addition to the existing
   * !paddle/loading checks) until the customer has explicitly
   * acknowledged it. Compliance audit rule 37.
   */
  disabled?: boolean
  /** Recorded in Paddle's customData alongside team_id — the acknowledgment itself, not just its absence of blocking. */
  waiverAcknowledgedAt?: string
}

export function PaddleCheckoutButton({
  priceId, teamId, label, variant = 'default', disabled = false, waiverAcknowledgedAt,
}: PaddleCheckoutButtonProps) {
  const [paddle, setPaddle] = React.useState<Paddle | undefined>(undefined)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const clientToken = process.env['NEXT_PUBLIC_PADDLE_CLIENT_TOKEN']
    if (!clientToken) return
    const environment = (process.env['NEXT_PUBLIC_PADDLE_ENV'] as 'sandbox' | 'production') || 'sandbox'

    void initializePaddle({ environment, token: clientToken }).then((instance) => setPaddle(instance))
  }, [])

  function handleClick() {
    if (!paddle) {
      toast.error('Checkout is not available right now — please try again shortly.')
      return
    }
    setLoading(true)
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: {
        team_id: teamId,
        ...(waiverAcknowledgedAt ? { digital_content_waiver_accepted_at: waiverAcknowledgedAt } : {}),
      },
    })
    // Paddle's overlay handles its own lifecycle; this just clears the
    // button's disabled state once the overlay has had time to render.
    setTimeout(() => setLoading(false), 1000)
  }

  return (
    <Button onClick={handleClick} disabled={!paddle || loading || disabled} variant={variant} className="w-full">
      {label}
    </Button>
  )
}
