import { test, expect } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { AddressInfo } from 'node:net'
import { createAdminClient, createConfirmedUser, uniqueTestEmail } from './helpers/supabase-admin'

// The critical path the rest of the suite doesn't cover: webhook in ->
// snapshot -> rule evaluation -> alert + alert_deliveries rows ->
// notification actually delivered -> second identical trigger suppressed
// by cooldown. Runs against the MOCK_MARKETPLACE fixture connector so it
// doesn't depend on a real Shopify store, and drives the worker route
// directly (bypassing QStash) so results are deterministic instead of
// depending on async queue delivery timing.
//
// The notification channel and alert rule are seeded directly via the
// admin client rather than through the UI — their own create/edit forms
// aren't what this spec is verifying; the alert *pipeline* is.
test.describe('Core alert flow', () => {
  let receiver: Server
  let receivedPayloads: unknown[] = []
  let receiverUrl: string

  test.beforeAll(async () => {
    receiver = createServer((req, res) => {
      const chunks: Buffer[] = []
      req.on('data', (c: Buffer) => chunks.push(c))
      req.on('end', () => {
        try {
          receivedPayloads.push(JSON.parse(Buffer.concat(chunks).toString('utf8')))
        } catch {
          receivedPayloads.push(null)
        }
        res.writeHead(200).end('ok')
      })
    })
    await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', resolve))
    const { port } = receiver.address() as AddressInfo
    receiverUrl = `http://127.0.0.1:${String(port)}/receive`
  })

  test.afterAll(async () => {
    await new Promise<void>((resolve) => receiver.close(() => resolve()))
  })

  test('webhook -> alert -> delivery, then cooldown suppresses an identical second trigger', async ({ page, request, baseURL }) => {
    const workerSecret = process.env['WORKER_SECRET']
    test.skip(!workerSecret, 'WORKER_SECRET must be set for this spec to drive the worker route directly')

    const email = uniqueTestEmail('core-alert-flow')
    const password = 'Sup3r-Secret-Passw0rd!'
    await createConfirmedUser(email, password, 'Core Alert Flow Tester')

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/password/i).fill(password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/(tr|en)\/overview/)

    const admin = createAdminClient()
    const { data: membership } = await admin
      .from('team_members')
      .select('team_id')
      .order('joined_at', { ascending: false })
      .limit(1)
      .single()
    const teamId = membership!.team_id

    // Connect the (mocked) store and sync once so the fixture product exists.
    // oauth-callback now verifies a `state` cookie set by oauth-start
    // (anti-CSRF — see apps/dashboard/src/lib/oauth-state.ts); this test
    // drives the callback directly rather than through the full redirect
    // dance, so it has to plant that cookie itself first.
    const E2E_OAUTH_STATE = 'e2e-fixed-state-value'
    await page.context().addCookies([
      { name: 'oauth_state_shopify', value: E2E_OAUTH_STATE, url: baseURL!, path: '/api/auth/oauth-callback' },
    ])
    await page.goto(`/api/auth/oauth-callback?platform=shopify&code=fake-e2e-code&shop=mock-shop.myshopify.com&state=${E2E_OAUTH_STATE}`)
    await page.waitForURL(/\/integrations\?connected=1/)

    const { data: store } = await admin
      .from('connected_stores')
      .select('id')
      .eq('team_id', teamId)
      .eq('platform', 'shopify')
      .single()
    const storeId = store!.id

    await request.post('/api/worker/sync', {
      headers: { Authorization: `Bearer ${workerSecret}` },
      data: { type: 'poll_store', platform: 'shopify', storeId, teamId },
    })

    const { data: product } = await admin
      .from('products')
      .select('id')
      .eq('store_id', storeId)
      .eq('external_id', 'mock-product-1')
      .single()
    expect(product).toBeTruthy()

    // Seed a webhook channel (pointing at the local receiver) and an
    // absolute-threshold rule that the mock's fixed quantity of 3 breaches.
    const { data: channel } = await admin
      .from('notification_channels')
      .insert({ team_id: teamId, name: 'e2e webhook', channel_type: 'webhook', config: { url: receiverUrl }, is_active: true })
      .select('id')
      .single()

    await admin.from('alert_rules').insert({
      team_id: teamId,
      name: 'e2e low stock',
      threshold_type: 'absolute',
      threshold_value: 5,
      channel_ids: [channel!.id],
      cooldown_minutes: 240,
      is_active: true,
    })

    // Drive the alert pipeline the same way a real inbound webhook would
    // (processWebhookEvent -> writeSnapshots -> runRulesEngine), directly
    // rather than through QStash, so this doesn't depend on queue latency.
    async function triggerWebhookEvent() {
      return request.post('/api/worker/sync', {
        headers: { Authorization: `Bearer ${workerSecret}` },
        data: { type: 'webhook_event', platform: 'shopify', storeId, teamId, rawBody: '{}', headers: {} },
      })
    }

    const first = await triggerWebhookEvent()
    expect(first.ok()).toBeTruthy()

    await expect.poll(async () => {
      const { data } = await admin.from('alerts').select('id, status').eq('team_id', teamId)
      return data?.length ?? 0
    }, { timeout: 15_000 }).toBeGreaterThan(0)

    const { data: alerts } = await admin.from('alerts').select('id, status').eq('team_id', teamId)
    expect(alerts).toHaveLength(1)

    const { data: deliveries } = await admin.from('alert_deliveries').select('status, channel_type').eq('alert_id', alerts![0]!.id)
    expect(deliveries).toHaveLength(1)
    expect(deliveries![0]!.channel_type).toBe('webhook')

    await expect.poll(() => receivedPayloads.length, { timeout: 15_000 }).toBeGreaterThan(0)
    expect(receivedPayloads[0]).toMatchObject({ event: 'low_stock_alert' })

    // Second identical trigger within cooldown_minutes must not create a
    // second alert row.
    const second = await triggerWebhookEvent()
    expect(second.ok()).toBeTruthy()

    const { data: alertsAfterSecond } = await admin.from('alerts').select('id').eq('team_id', teamId)
    expect(alertsAfterSecond).toHaveLength(1)
  })
})
