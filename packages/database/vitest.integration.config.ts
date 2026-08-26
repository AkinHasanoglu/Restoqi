import { defineConfig } from 'vitest/config'

// Separate from vitest.config.ts's default `pnpm test` — this suite talks
// to a real local Supabase instance (`supabase start`, see
// packages/database/README.md) rather than pure in-process logic. Run
// explicitly via `pnpm test:integration`, never as part of the default
// `pnpm turbo test`.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/integration/**/*.test.ts'],
    // These hit a real Postgres instance repeatedly (signups, RLS
    // round-trips) — the vitest default (5s) is too tight.
    testTimeout: 20_000,
  },
})
