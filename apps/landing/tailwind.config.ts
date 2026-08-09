import type { Config } from 'tailwindcss'
import { stockalertPreset } from '@stockalert/config/tailwind'

const config: Config = {
  ...stockalertPreset,
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
}

export default config
