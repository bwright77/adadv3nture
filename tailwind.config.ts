import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream:      '#F5EDD6',
        'cream-dk': '#E8DFC6',
        rust:       '#C4522A',
        'rust-dk':  '#8B3A1E',
        teal:       '#5BBCB8',
        'teal-dk':  '#2F8783',
        dark:       '#1A1208',
        paper:      '#FBF7EC',
        sand:       '#D4824A',
        'sand-lt':  '#E8C99A',
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
