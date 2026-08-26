'use client'

import dynamic from 'next/dynamic'

// recharts (~90KB gzipped on its own, more once its d3-* dependencies are
// counted) was bundled into every visit to /overview even though the
// chart sits below the fold and isn't needed for first paint. `ssr: false`
// only works from within a Client Component in the App Router — this
// wrapper exists so overview/page.tsx (a Server Component) can still
// import a plain <StockChart> without itself becoming a client boundary.
// See the "batırma listesi" audit item 13 (bundle size was never
// measured or budgeted at all before this).
export const StockChart = dynamic(() => import('./stock-chart').then((m) => m.StockChart), {
  ssr: false,
  loading: () => (
    <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">…</div>
  ),
})
