import type { Metadata } from 'next'
import { Hero } from '../../../components/landing/hero'
import { LogoCloud } from '../../../components/landing/logo-cloud'
import { Features } from '../../../components/landing/features'
import { Pricing } from '../../../components/landing/pricing'

export const metadata: Metadata = {
  title: 'StockAlert — Real-time Inventory Alerts for E-Commerce',
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoCloud />
      <Features />
      <Pricing />
    </>
  )
}
