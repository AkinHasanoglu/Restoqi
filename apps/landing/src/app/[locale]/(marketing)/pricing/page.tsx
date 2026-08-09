import type { Metadata } from 'next'
import { Pricing } from '../../../../components/landing/pricing'

export const metadata: Metadata = {
  title: 'Pricing',
}

export default function PricingPage() {
  return (
    <div className="pt-16">
      <Pricing />
    </div>
  )
}
