import type { Metadata } from 'next'
import { SignupForm } from '../../../../components/auth/signup-form'

export const metadata: Metadata = { title: 'Create Account' }

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const { plan } = await searchParams
  return <SignupForm plan={plan} />
}
