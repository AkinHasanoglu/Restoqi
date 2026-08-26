import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Scoped to the pure business logic (rules-engine.ts), which is
      // what rules-engine.test.ts actually exercises. The channel senders
      // (channels/*.ts) are thin wrappers around external HTTP calls —
      // covered by the e2e core-alert-flow spec against a real request,
      // not worth mocking Resend/Slack/Twilio just to hit a line-coverage
      // number here.
      include: ['src/rules-engine.ts'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
})
