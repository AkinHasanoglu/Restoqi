import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Legal' }

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-32">
      <h1 className="text-3xl font-bold">Legal</h1>
      <ul className="mt-6 space-y-2">
        {['Terms of Service', 'Privacy Policy', 'Data Processing Agreement'].map((item) => (
          <li key={item}>
            <a href="#" className="text-primary hover:underline">{item}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
