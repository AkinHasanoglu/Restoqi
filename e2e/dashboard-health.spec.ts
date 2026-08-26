import { test, expect } from '@playwright/test'

const HUB_API_KEY = process.env['HUB_API_KEY'] ?? 'test-hub-api-key'

test.describe('Dashboard — sağlık ucu ve giriş sayfası', () => {
  test('anahtarsız istek 401 döner', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(401)
  })

  test('doğru Bearer anahtarıyla sağlık sözleşmesi doğrulanır', async ({ request }) => {
    const res = await request.get('/api/health', {
      headers: { Authorization: `Bearer ${HUB_API_KEY}` },
    })
    expect(res.ok()).toBeTruthy()

    const body = (await res.json()) as { app: string; status: string; metrics: Record<string, unknown> }
    expect(typeof body.app).toBe('string')
    expect(['healthy', 'degraded']).toContain(body.status)
    expect(body.metrics).toBeDefined()
  })

  test('giriş sayfası yükleniyor', async ({ page }) => {
    const response = await page.goto('/login')
    expect(response?.ok()).toBeTruthy()
    await expect(page.getByRole('heading', { name: /sign in to stockalert/i })).toBeVisible()
  })
})
