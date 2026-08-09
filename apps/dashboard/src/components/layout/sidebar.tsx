'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { type Locale } from '@stockalert/i18n'
import { cn, Logo } from '@stockalert/ui'
import { LayoutDashboard, Package, AlertTriangle, SlidersHorizontal, PlugZap, FileText, Settings, Search } from 'lucide-react'

const NAV_ITEMS = [
  { key: 'overview', icon: LayoutDashboard, href: '/overview' },
  { key: 'products', icon: Package, href: '/products' },
  { key: 'alerts', icon: AlertTriangle, href: '/alerts' },
  { key: 'rules', icon: SlidersHorizontal, href: '/alerts/rules' },
  { key: 'integrations', icon: PlugZap, href: '/integrations' },
  { key: 'notes', icon: FileText, href: '/notes' },
  { key: 'settings', icon: Settings, href: '/settings/account' },
] as const

interface SidebarProps {
  onCommandPaletteOpen?: () => void
}

export function Sidebar({ onCommandPaletteOpen }: SidebarProps) {
  const t = useTranslations('dashboard.nav')
  const locale = useLocale() as Locale
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <Logo compact height={26} />
        <span className="text-[15px] font-bold tracking-tight text-sidebar-foreground">
          StockAlert
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-2 pt-3">
        {NAV_ITEMS.map(({ key, icon: Icon, href }) => {
          const fullHref = `/${locale}${href}`
          const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`)
          return (
            <motion.div
              key={key}
              whileHover={{ x: 2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Link
                href={fullHref}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors border-l-2',
                  isActive
                    ? 'border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'border-transparent text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-sidebar-primary')} />
                {t(key)}
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={onCommandPaletteOpen}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Ara veya git…</span>
          <kbd className="hidden rounded border border-sidebar-border bg-sidebar-border/40 px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
            ⌘K
          </kbd>
        </button>
      </div>
    </aside>
  )
}
