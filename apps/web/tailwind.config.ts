import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './features/**/*.{js,ts,jsx,tsx}',
    './repositories/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        'bg-muted': 'var(--color-bg-muted)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-soft': 'var(--color-accent-soft)',
        'accent-muted': 'var(--color-accent-muted)',
        'accent-surface': 'var(--color-accent-surface)',
        border: 'var(--color-border)',
        brand: {
          green: {
            DEFAULT: '#16A34A',
            hover: '#15803D',
            soft: '#4ADE80',
            dark: '#052E16',
            border: '#14532D',
          },
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
      boxShadow: {
        'accent-glow': '0 10px 40px -12px rgba(5, 46, 22, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
