'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { CommandPalette } from '../command-palette'
import { TrialBanner } from '../billing/trial-banner'
import { TrialExpiredDialog } from '../billing/trial-expired-dialog'

interface AppShellProps {
  children: React.ReactNode
  userEmail?: string
  userName?: string
  teams?: Array<{ id: string; name: string; slug: string }>
  currentTeamId?: string
  /** Reverse-trial state resolved server-side in (app)/layout.tsx via getPlanContext — see @stockalert/plans' resolveEffectivePlan. */
  isTrialActive?: boolean
  trialDaysLeft?: number | null
  isAccessAllowed?: boolean
}

export function AppShell({
  children, userEmail, userName, teams, currentTeamId,
  isTrialActive = false, trialDaysLeft = null, isAccessAllowed = true,
}: AppShellProps) {
  const [cmdOpen, setCmdOpen] = React.useState(false)
  const pathname = usePathname()

  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onCommandPaletteOpen={() => setCmdOpen(true)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {isTrialActive && trialDaysLeft !== null && <TrialBanner trialDaysLeft={trialDaysLeft} />}
        <Topbar
          userEmail={userEmail}
          userName={userName}
          teams={teams}
          currentTeamId={currentTeamId}
          onCommandPaletteOpen={() => setCmdOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <TrialExpiredDialog open={!isAccessAllowed} />
    </div>
  )
}
