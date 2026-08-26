import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

/** @param {{ tsconfigPath?: string }} [opts] */
export function createConfig(opts = {}) {
  return tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: opts.tsconfigPath,
        },
      },
      plugins: {
        react: reactPlugin,
        'react-hooks': reactHooksPlugin,
      },
      rules: {
        // TypeScript
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',

        // React
        'react/jsx-no-target-blank': 'error',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',

        // General
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'prefer-const': 'error',

        // Encrypted columns must only be touched by their owning module
        // (packages/database/src/stores.ts, src/api-keys.ts) — both bind
        // ciphertext to its row via an AAD the column name alone can't
        // reconstruct; a stray `.select('encrypted_creds')` elsewhere
        // either fails loudly or, worse, gets "fixed" with the wrong AAD
        // and produces ciphertext nothing can ever decrypt again. See
        // packages/database/README.md's "Encrypted columns" section.
        'no-restricted-syntax': [
          'error',
          {
            selector: "Literal[value='encrypted_creds']",
            message:
              "store_secrets.encrypted_creds must only be read/written via @stockalert/database/stores — see packages/database/README.md.",
          },
          {
            selector: "Literal[value='encrypted_key']",
            message:
              "api_keys.encrypted_key must only be read/written via @stockalert/database/api-keys — see packages/database/README.md.",
          },
        ],
      },
    },
    {
      // The modules the rule above exists to fund a single choke point
      // for, plus the rotation script that legitimately re-encrypts both
      // columns directly.
      files: [
        '**/packages/database/src/stores.ts',
        '**/packages/database/src/api-keys.ts',
        '**/packages/database/scripts/rotate-credentials.ts',
      ],
      rules: { 'no-restricted-syntax': 'off' },
    },
    {
      ignores: [
        'node_modules/**',
        '.next/**',
        'dist/**',
        '*.config.*',
        '**/*.d.ts',
        'coverage/**',
      ],
    }
  )
}

export default createConfig()
