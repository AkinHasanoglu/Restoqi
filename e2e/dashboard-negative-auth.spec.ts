import { test, expect } from '@playwright/test'
import { createAdminClient, createConfirmedUser, uniqueTestEmail } from './helpers/supabase-admin'

/**
 * The pre-launch security audit's finding: the two mechanisms guarding
 * money (Paddle signature) and the data pipeline (worker secret / QStash
 * signature) had positive-path coverage but no negative test asserting
 * an unsigned/unauthenticated request is actually rejected — exactly the
 * shape of bug that shipped once already (see webhooks/paddle/route.ts's
 * comment on the fail-open regression this guards against). This spec is
 * that missing half.
 */
test.describe('Negative auth — unsigned/unauthenticated requests are rejected', () => {
  test('unsigned Paddle webhook is rejected', async ({ request }) => {
    const event = {
      event_id: `evt_e2e_unsigned_${String(Date.now())}`,
      event_type: 'subscription.created',
      occurred_at: new Date().toISOString(),
      data: {
        id: 'sub_e2e_unsigned',
        customer_id: 'ctm_e2e_unsigned',
        status: 'active',
        items: [{ price: { id: 'pri_fake' } }],
        custom_data: { team_id: '00000000-0000-0000-0000-000000000000' },
      },
    }
    const res = await request.post('/api/webhooks/paddle', {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify(event),
    })
    expect([401, 500]).toContain(res.status())
    expect(res.ok()).toBeFalsy()
  })

  test('unsigned platform webhook is rejected', async ({ request }) => {
    const admin = createAdminClient()
    const externalStoreId = `e2e-negauth-${String(Date.now())}`

    // Seeded directly, not through OAuth connect — this test is only
    // exercising signature verification on the webhook route, not the
    // connect flow.
    const { data: team } = await admin
      .from('teams')
      .insert({ name: 'E2E negauth team', slug: `e2e-negauth-${String(Date.now())}` })
      .select('id')
      .single()
    const { data: store } = await admin
      .from('connected_stores')
      .insert({ team_id: team!.id, platform: 'shopify', store_name: 'negauth store', external_store_id: externalStoreId })
      .select('id')
      .single()
    await admin.from('store_secrets').insert({ store_id: store!.id, encrypted_creds: null })

    const res = await request.post('/api/webhooks/shopify', {
      headers: {
        'content-type': 'application/json',
        'x-shopify-shop-domain': externalStoreId,
        // Deliberately no x-shopify-hmac-sha256 header.
      },
      data: JSON.stringify({ inventory_item_id: 1, available: 5 }),
    })
    expect(res.status()).toBe(401)
  })

  test('worker/sync is rejected without a bearer token', async ({ request }) => {
    const res = await request.post('/api/worker/sync', {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({ type: 'poll_store', platform: 'shopify', storeId: '00000000-0000-0000-0000-000000000000', teamId: '00000000-0000-0000-0000-000000000000' }),
    })
    expect(res.status()).toBe(401)
  })

  test('worker/digest is rejected without a bearer token', async ({ request }) => {
    const res = await request.get('/api/worker/digest')
    expect(res.status()).toBe(401)
  })

  test('worker/predict is rejected without a bearer token', async ({ request }) => {
    const res = await request.get('/api/worker/predict')
    expect(res.status()).toBe(401)
  })

  test('oauth-start is rejected without a logged-in session', async ({ request }) => {
    const res = await request.get('/api/integrations/oauth-start?platform=shopify&redirectUri=http://127.0.0.1:3001/api/auth/oauth-callback&shopDomain=test.myshopify.com', {
      maxRedirects: 0,
    })
    expect(res.status()).toBe(401)
  })

  test('oauth-callback rejects a state that does not match the cookie oauth-start set (connection-CSRF)', async ({ page }) => {
    const email = uniqueTestEmail('negauth-oauth-state')
    const password = 'Sup3r-Secret-Passw0rd!'
    const user = await createConfirmedUser(email, password, 'Negauth OAuth State Tester')

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/password/i).fill(password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/(tr|en)\/overview/)

    // No oauth_state_shopify cookie was ever set (never went through
    // oauth-start) — state is attacker-suppliable and won't match.
    await page.goto('/api/auth/oauth-callback?platform=shopify&code=fake-e2e-code&shop=negauth-mock-shop.myshopify.com&state=attacker-supplied-state')
    await page.waitForURL(/error=invalid_state/)

    // And no store should have been connected as a side effect, scoped to
    // this test's own team — other specs legitimately connect
    // mock-shop.myshopify.com under their own teams in parallel.
    const admin = createAdminClient()
    const { data: membership } = await admin.from('team_members').select('team_id').eq('user_id', user.id).single()
    const { data: stores } = await admin
      .from('connected_stores')
      .select('id')
      .eq('team_id', membership!.team_id)
    expect(stores).toHaveLength(0)
  })
})
