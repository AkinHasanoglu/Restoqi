import type { Metadata } from 'next'
import { LoginForm } from '../../../../components/auth/login-form'

export const metadata: Metadata = { title: 'Sign In' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>
}) {
  const { redirectTo } = await searchParams
  return <LoginForm redirectTo={redirectTo} />
}
