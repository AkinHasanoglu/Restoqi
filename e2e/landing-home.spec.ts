import { test, expect } from '@playwright/test'

test.describe('Landing — ana sayfa', () => {
  test('yükleniyor, hero içeriği ve CTA görünüyor, konsolda hata yok', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    const response = await page.goto('/')
    expect(response?.ok()).toBeTruthy()

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    await expect(heading).not.toHaveText('')

    // Exact match: the home page also renders a closing CtaBanner further
    // down whose CTA reads the same "Start free trial" copy (see
    // components/landing/cta-banner.tsx), plus the Pricing section's cards
    // whose CTAs read "Start 14-day free trial" — a loose /free trial/
    // match would resolve to all of those. .first() targets the Hero's,
    // which is always first in DOM order.
    const cta = page.getByRole('link', { name: 'Start free trial', exact: true }).first()
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('href', /\/signup/)

    expect(consoleErrors, `Beklenmeyen konsol hataları:\n${consoleErrors.join('\n')}`).toHaveLength(0)
  })
})
