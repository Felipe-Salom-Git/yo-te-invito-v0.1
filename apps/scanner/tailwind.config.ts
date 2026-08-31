import type { Config } from 'tailwindcss';
import { SCANNER_COLORS } from './lib/scanner-brand';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        scanner: {
          bg: SCANNER_COLORS.bg,
          muted: SCANNER_COLORS.bgMuted,
          accent: SCANNER_COLORS.accent,
          'accent-hover': SCANNER_COLORS.accentHover,
          border: SCANNER_COLORS.border,
        },
      },
    },
  },
  plugins: [],
};

export default config;
