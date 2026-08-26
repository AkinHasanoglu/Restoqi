import type { Config } from 'tailwindcss'
import { stockalertPreset } from '@stockalert/config/tailwind'

const config: Config = {
  ...stockalertPreset,
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    ...stockalertPreset.theme,
    extend: {
      ...stockalertPreset.theme?.extend,
      fontFamily: {
        ...stockalertPreset.theme?.extend?.fontFamily,
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      colors: {
        ...stockalertPreset.theme?.extend?.colors,
        'accent-2': {
          DEFAULT: 'hsl(var(--accent-2))',
          foreground: 'hsl(var(--accent-2-foreground))',
        },
      },
    },
  },
}

export default config
