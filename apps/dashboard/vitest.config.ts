import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Only pure lib/ logic is unit-tested here — route handlers and
    // Server Actions pull in Next.js request/response internals and
    // Supabase clients that belong in the Playwright e2e suite (e2e/)
    // instead of a mocked-to-uselessness unit test.
    include: ['src/lib/**/*.test.ts'],
  },
})
