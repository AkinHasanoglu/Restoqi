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
      },
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
