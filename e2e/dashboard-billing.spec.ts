import { test, expect } from '@playwright/test'
import { createHmac } from 'node:crypto'
import { createAdminClient, createConfirmedUser, uniqueTestEmail } from './helpers/supabase-admin'

function signPaddleBody(rawBody: string, secret: string): string {
  const ts = Math.floor(Date.now() / 1000)
  const digest = createHmac('sha256', secret).update(`${String(ts)}:${rawBody}`).digest('hex')
  return `ts=${String(ts)};h1=${digest}`
}

test.describe('Billing', () => {
  test('trial status renders on a fresh signup', async ({ page }) => {
    const email = uniqueTestEmail('billing-trial')
    const password = 'Sup3r-Secret-Passw0rd!'
    await createConfirmedUser(email, password, 'Trial Tester')

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/password/i).fill(password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/(tr|en)\/overview/)

    // handle_new_user seeds a `trialing` subscriptions row synchronously.
    await page.goto('/en/settings/billing')
    await expect(page.getByText(/trial/i)).toBeVisible({ timeout: 10_000 })
  })

  test('a signed Paddle subscription.created event upgrades the plan', async ({ page, request }) => {
    const secret = process.env['PADDLE_WEBHOOK_SECRET']
    const priceId = process.env['NEXT_PUBLIC_PADDLE_PRICE_ID_GROWTH_MONTHLY']
    test.skip(!secret || !priceId, 'PADDLE_WEBHOOK_SECRET and NEXT_PUBLIC_PADDLE_PRICE_ID_GROWTH_MONTHLY must be set')

    const email = uniqueTestEmail('billing-upgrade')
    const password = 'Sup3r-Secret-Passw0rd!'
    const user = await createConfirmedUser(email, password, 'Upgrade Tester')

    const admin = createAdminClient()
    const { data: membership } = await admin.from('team_members').select('team_id').eq('user_id', user.id).single()
    const teamId = membership!.team_id

    const event = {
      event_id: `evt_e2e_${String(Date.now())}`,
      event_type: 'subscription.created',
      occurred_at: new Date().toISOString(),
      data: {
        id: `sub_e2e_${String(Date.now())}`,
        customer_id: 'ctm_e2e_test',
        status: 'active',
        items: [{ price: { id: priceId } }],
        current_billing_period: { starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 30 * 86_400_000).toISOString() },
        management_urls: { update_payment_method: 'https://paddle.example.com/portal/e2e' },
        custom_data: { team_id: teamId },
      },
    }
    const rawBody = JSON.stringify(event)

    const res = await request.post('/api/webhooks/paddle', {
      headers: { 'paddle-signature': signPaddleBody(rawBody, secret!), 'content-type': 'application/json' },
      data: rawBody,
    })
    expect(res.ok()).toBeTruthy()

    await expect.poll(async () => {
      const { data } = await admin.from('subscriptions').select('plan, status').eq('team_id', teamId).single()
      return data?.plan
    }, { timeout: 10_000 }).toBe('growth')

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/password/i).fill(password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/(tr|en)\/overview/)

    await page.goto('/en/settings/billing')
    await expect(page.getByText(/growth/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('link', { name: /manage subscription/i })).toBeVisible()
  })
})
