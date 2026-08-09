import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Documentation' }

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-32">
      <h1 className="text-4xl font-bold">Documentation</h1>
      <p className="mt-4 text-muted-foreground">Coming soon.</p>
    </div>
  )
}
