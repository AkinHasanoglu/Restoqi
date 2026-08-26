import { test, expect } from '@playwright/test'
import { createConfirmedUser, uniqueTestEmail } from './helpers/supabase-admin'

// Requires a real (or local `supabase start`) Supabase project — creates
// the user via the admin API to skip email confirmation, then drives the
// actual login form so the assertion covers the real client-side auth
// flow, not just the API.
test.describe('Auth flow', () => {
  test('login -> workspace -> logout -> protected route redirects to login', async ({ page }) => {
    const email = uniqueTestEmail('auth-flow')
    const password = 'Sup3r-Secret-Passw0rd!'
    await createConfirmedUser(email, password, 'E2E Test User')

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/password/i).fill(password)
    await page.getByRole('button', { name: /sign in/i }).click()

    // handle_new_user's trigger creates the team synchronously on signup,
    // so login should land straight on a workspace page, not a "no team"
    // empty state.
    await page.waitForURL(/\/(tr|en)\/overview/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Sign out via the topbar's avatar dropdown — has its own aria-label
    // now (components/layout/topbar.tsx, compliance audit rule 13),
    // rather than being targeted positionally as "the last button".
    await page.getByRole('button', { name: 'Kullanıcı menüsü' }).click()
    await page.getByText('Çıkış Yap').click()
    await page.waitForURL(/\/login/)

    // Now confirm a protected route bounces back to login with a
    // redirectTo pointing at the page we tried to reach.
    await page.goto('/tr/products')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('redirectTo')
  })
})
