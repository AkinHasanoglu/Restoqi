import { test, expect } from '@playwright/test'
import { createAdminClient, createConfirmedUser, uniqueTestEmail } from './helpers/supabase-admin'

// Requires the dashboard server to be started with MOCK_MARKETPLACE=1 (see
// playwright.config.ts) so connector-registry.ts routes every platform to
// the deterministic fixture in lib/mock-marketplace-connector.ts instead
// of a real marketplace API.
//
// The OAuth *consent* hop itself (redirect to the real Shopify domain,
// user logs in there) isn't something this suite can or should simulate —
// instead this drives the callback URL directly with a fake `code`, the
// same shape Shopify's own redirect would produce. Since MOCK_MARKETPLACE
// replaces connect() with the fixture, the fake code is never actually
// validated against Shopify.
test.describe('Store connect', () => {
  test('OAuth callback connects a store, then a sync pulls the fixture product into /products', async ({ page, request, baseURL }) => {
    const workerSecret = process.env['WORKER_SECRET']
    test.skip(!workerSecret, 'WORKER_SECRET must be set for this spec to trigger a sync directly')

    const email = uniqueTestEmail('store-connect')
    const password = 'Sup3r-Secret-Passw0rd!'
    await createConfirmedUser(email, password, 'Store Connect Tester')

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/password/i).fill(password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/(tr|en)\/overview/)

    // oauth-callback verifies a `state` cookie set by oauth-start
    // (anti-CSRF — see apps/dashboard/src/lib/oauth-state.ts); this test
    // drives the callback directly rather than through the full redirect
    // dance, so it has to plant that cookie itself first.
    const E2E_OAUTH_STATE = 'e2e-fixed-state-value'
    await page.context().addCookies([
      { name: 'oauth_state_shopify', value: E2E_OAUTH_STATE, url: baseURL!, path: '/api/auth/oauth-callback' },
    ])
    await page.goto(`/api/auth/oauth-callback?platform=shopify&code=fake-e2e-code&shop=mock-shop.myshopify.com&state=${E2E_OAUTH_STATE}`)
    await page.waitForURL(/\/integrations\?connected=1/)

    const admin = createAdminClient()
    const { data: store } = await admin
      .from('connected_stores')
      .select('id, team_id, platform')
      .eq('platform', 'shopify')
      .eq('external_store_id', 'mock-shop.myshopify.com')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    expect(store).toBeTruthy()

    const syncRes = await request.post('/api/worker/sync', {
      headers: { Authorization: `Bearer ${workerSecret}` },
      data: { type: 'poll_store', platform: 'shopify', storeId: store!.id, teamId: store!.team_id },
    })
    expect(syncRes.ok()).toBeTruthy()

    await page.goto('/en/products')
    await expect(page.getByText('Mock Widget')).toBeVisible({ timeout: 15_000 })
  })
})
