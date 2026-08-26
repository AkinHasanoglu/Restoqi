import { defineConfig, devices } from '@playwright/test'

const LANDING_PORT = 3000
const DASHBOARD_PORT = 3001
const HUB_API_KEY = process.env['HUB_API_KEY'] ?? 'test-hub-api-key'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'landing',
      testMatch: /landing-.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${LANDING_PORT}` },
    },
    {
      name: 'dashboard',
      testMatch: /dashboard-.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${DASHBOARD_PORT}` },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter landing start',
      url: `http://127.0.0.1:${LANDING_PORT}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
    {
      // Not the root URL: dashboard's middleware 307-redirects "/" to the
      // default locale, and Playwright's webServer readiness probe only
      // treats a 2xx response as "ready" (a redirect polls forever). /login
      // renders directly with a 200.
      command: 'pnpm --filter dashboard start',
      url: `http://127.0.0.1:${DASHBOARD_PORT}/login`,
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
      env: {
        HUB_API_KEY,
        SKIP_ENV_VALIDATION: 'true',
        // Routes every marketplace connector to the deterministic e2e
        // fixture (lib/mock-marketplace-connector.ts) instead of a real
        // platform API — see dashboard-store-connect.spec.ts and
        // dashboard-core-alert-flow.spec.ts. connector-registry.ts refuses
        // to honor this outside NODE_ENV !== 'production' regardless.
        MOCK_MARKETPLACE: '1',
      },
    },
  ],
})
