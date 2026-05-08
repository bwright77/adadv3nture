import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream:      'var(--color-cream)',
        'cream-dk': 'var(--color-cream-dk)',
        rust:       'var(--color-rust)',
        'rust-dk':  'var(--color-rust-dk)',
        teal:       'var(--color-teal)',
        'teal-dk':  'var(--color-teal-dk)',
        dark:       'var(--color-dark)',
        paper:      'var(--color-paper)',
        sand:       'var(--color-sand)',
        'sand-lt':  'var(--color-sand-lt)',
        ink60:      'var(--color-ink60)',
        ink40:      'var(--color-ink40)',
        ink20:      'var(--color-ink20)',
      },
      fontSize: {
        '10': 'var(--fs-10)',
        '11': 'var(--fs-11)',
        '12': 'var(--fs-12)',
        '13': 'var(--fs-13)',
        '14': 'var(--fs-14)',
        '15': 'var(--fs-15)',
        '16': 'var(--fs-16)',
        '17': 'var(--fs-17)',
        '18': 'var(--fs-18)',
        '22': 'var(--fs-22)',
        '24': 'var(--fs-24)',
        '26': 'var(--fs-26)',
        '56': 'var(--fs-56)',
      },
      fontFamily: {
        badge: ['"Big Shoulders Display"', 'sans-serif'],
        body:  ['Sora', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
