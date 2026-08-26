'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { Menu, X, ChevronDown, Check } from 'lucide-react'
import { Button, Logo } from '@stockalert/ui'
import { locales, defaultLocale, localeNames, localeFlags, type Locale } from '@stockalert/i18n'
import { env } from '../../env'

const NAV_LINKS = [
  { href: '/how-it-works', labelKey: 'nav.howItWorks' },
  { href: '/#features', labelKey: 'nav.features' },
  { href: '/integrations', labelKey: 'nav.integrations' },
  { href: '/pricing', labelKey: 'nav.pricing' },
  { href: '/faq', labelKey: 'nav.faq' },
] as const

function LocaleSwitcher({ locale }: { locale: Locale }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function switchLocale(newLocale: string) {
    setOpen(false)
    const pathname = window.location.pathname

    // Strip current locale prefix (as-needed: default locale has no prefix)
    let pathWithoutLocale = pathname
    for (const loc of locales) {
      if (pathname === `/${loc}`) { pathWithoutLocale = '/'; break }
      if (pathname.startsWith(`/${loc}/`)) { pathWithoutLocale = pathname.slice(`/${loc}`.length); break }
    }

    const newPath = newLocale === defaultLocale
      ? pathWithoutLocale || '/'
      : `/${newLocale}${pathWithoutLocale}`

    window.location.href = newPath
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-base leading-none">{localeFlags[locale]}</span>
        <span className="hidden font-medium sm:block">{localeNames[locale]}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg">
          <ul role="listbox" className="py-1">
            {(Object.entries(localeNames) as [Locale, string][]).map(([code, name]) => {
              const active = code === locale
              return (
                <li key={code} role="option" aria-selected={active}>
                  <button
                    onClick={() => switchLocale(code)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-accent font-medium text-accent-foreground'
                        : 'text-foreground hover:bg-accent/60'
                    }`}
                  >
                    <span className="text-base leading-none">{localeFlags[code]}</span>
                    <span className="flex-1 text-left">{name}</span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const t = useTranslations('common')
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const dashboardUrl = env.NEXT_PUBLIC_APP_URL

  function isActive(href: string) {
    const target = href.split('#')[0]
    if (!target) return false
    return pathname === `/${locale}${target}` || (target === '/' && pathname === `/${locale}`)
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-border/60 bg-background/90 shadow-sm backdrop-blur-md'
          : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <Logo compact height={30} />
          <span className="font-heading text-[18px] leading-none">StockAlert</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, labelKey }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={`/${locale}${href}`}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground'
                }`}
              >
                {t(labelKey as Parameters<typeof t>[0])}
              </Link>
            )
          })}
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <LocaleSwitcher locale={locale} />

          <div className="h-4 w-px bg-border" />

          <Button variant="ghost" size="sm" className="h-9 rounded-full px-4 text-sm" asChild>
            <a href={`${dashboardUrl}/login`}>{t('nav.login')}</a>
          </Button>
          <Button
            size="sm"
            className="h-9 rounded-full px-5 text-sm font-semibold shadow-md shadow-primary/15"
            asChild
          >
            <a href={`${dashboardUrl}/signup`}>{t('nav.signup')}</a>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-accent md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-b border-border bg-background/95 px-4 py-5 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map(({ href, labelKey }) => (
              <Link
                key={href}
                href={`/${locale}${href}`}
                className="rounded-full px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {t(labelKey as Parameters<typeof t>[0])}
              </Link>
            ))}
          </div>

          {/* Mobile locale switcher */}
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
              Language
            </p>
            <div className="grid grid-cols-2 gap-1">
              {(Object.entries(localeNames) as [Locale, string][]).map(([code, name]) => {
                const active = code === locale
                return (
                  <button
                    key={code}
                    onClick={() => {
                      setMobileOpen(false)
                      const pathname = window.location.pathname
                      let pathWithoutLocale = pathname
                      for (const loc of locales) {
                        if (pathname === `/${loc}`) { pathWithoutLocale = '/'; break }
                        if (pathname.startsWith(`/${loc}/`)) { pathWithoutLocale = pathname.slice(`/${loc}`.length); break }
                      }
                      const newPath = code === defaultLocale
                        ? pathWithoutLocale || '/'
                        : `/${code}${pathWithoutLocale}`
                      window.location.href = newPath
                    }}
                    className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-accent font-semibold text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span className="text-base leading-none">{localeFlags[code]}</span>
                    <span>{name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-4 flex gap-2 border-t border-border/60 pt-4">
            <Button variant="outline" size="sm" className="h-9 flex-1 rounded-full" asChild>
              <a href={`${dashboardUrl}/login`}>{t('nav.login')}</a>
            </Button>
            <Button size="sm" className="h-9 flex-1 rounded-full font-semibold" asChild>
              <a href={`${dashboardUrl}/signup`}>{t('nav.signup')}</a>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
