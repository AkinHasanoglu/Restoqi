import Link from 'next/link'
import { Logo } from '@stockalert/ui'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const landingUrl = process.env['NEXT_PUBLIC_LANDING_URL'] ?? '/'

  return (
    <div className="flex min-h-screen flex-col">
      {/* Auth nav */}
      <header className="border-b border-border/50 px-6 py-4">
        <Link href={landingUrl} className="flex w-fit items-center gap-2">
          <Logo compact height={26} />
          <span className="font-bold">StockAlert</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>

      <footer className="py-4 text-center text-xs text-muted-foreground">
        <Link href={`${landingUrl}/legal/terms`} className="hover:underline">Terms</Link>
        {' · '}
        <Link href={`${landingUrl}/legal/privacy`} className="hover:underline">Privacy</Link>
      </footer>
    </div>
  )
}
