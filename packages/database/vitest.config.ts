import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Integration tests need a live local Supabase (`supabase start`) and
    // run separately via `vitest.integration.config.ts` / the `test:integration`
    // script — excluded here so a plain `pnpm turbo test` never tries to
    // reach a database that isn't running.
    exclude: ['**/node_modules/**', 'src/integration/**'],
    coverage: {
      provider: 'v8',
      // Scoped to crypto.ts alone (see CI's coverage step) — this is the
      // one module in the repo where a missed branch means a
      // credential-handling bug, not a UI nit. Other files in this
      // package aren't held to the same bar yet.
      include: ['src/crypto.ts'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
})
