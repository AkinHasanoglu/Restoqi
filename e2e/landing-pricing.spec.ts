import { test, expect } from '@playwright/test'

test.describe('Landing — fiyatlandırma sayfası', () => {
  test('yükleniyor, üç plan kartı render ediliyor ve navbar navigasyonu çalışıyor', async ({ page }) => {
    const response = await page.goto('/pricing')
    expect(response?.ok()).toBeTruthy()

    await expect(page.getByRole('heading', { name: /pricing/i }).first()).toBeVisible()

    // Starter + Growth + Scale "Start 14-day free trial" CTA'ları = 3 plan kartı
    // (mini-FAQ accordion buttons and the comparison table below don't add
    // any more role="link" matches, so this stays scoped to the cards.)
    const planCtas = page.getByRole('link', { name: /free trial/i })
    await expect(planCtas).toHaveCount(3)

    // Scope to the navbar specifically — the footer also has an "Integrations" link.
    await page.getByRole('navigation').getByRole('link', { name: /integrations/i }).click()
    await expect(page).toHaveURL(/\/integrations/)
  })
})
