import { getTranslations } from 'next-intl/server'
import { Hero } from '../../../components/landing/hero'
import { LogoCloud } from '../../../components/landing/logo-cloud'
import { Features } from '../../../components/landing/features'
import { HowItWorks } from '../../../components/landing/how-it-works'
import { Trust } from '../../../components/landing/trust'
import { Pricing } from '../../../components/landing/pricing'
import { Faq } from '../../../components/landing/faq'
import { CtaBanner } from '../../../components/landing/cta-banner'

// No metadata export here — this page inherits the parent [locale]/layout.tsx's
// localized `title.default` (landing.meta.home.title) as-is, so this used to
// be a hardcoded English string that silently overrode it for every locale.
// See "batırma listesi" audit item 20.

export default async function HomePage() {
  // howItWorks.ctaTitle already exists (and is translated) as this
  // section's own closing line — reused here for the page's single final
  // CTA rather than adding a redundant "landing.cta.*" key.
  const t = await getTranslations('landing.howItWorks')

  return (
    <>
      <Hero />
      <LogoCloud />
      <Features />
      <HowItWorks variant="section" />
      <Trust />
      <Pricing />
      <Faq variant="section" />
      <CtaBanner title={t('ctaTitle')} />
    </>
  )
}
