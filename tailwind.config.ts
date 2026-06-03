import type { Config } from 'tailwindcss';

// Tokens "propagande constructiviste" (voir design_handoff_revorun_quizz/README.md).
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: '#EEE6D4',
        card: '#F6F0E2',
        canvas: '#DED2BB',
        ink: { DEFAULT: '#1A1611', 2: '#5C5648', 3: '#8C8473' },
        cream: '#F2ECDD',
        brand: { DEFAULT: '#1E6499', deep: '#165080', light: '#5391C2', soft: '#DBE8F4' },
        success: { DEFAULT: '#1E9E5A', soft: '#DCF3E5' },
        fail: { DEFAULT: '#CC2E1E', soft: '#F8DED9' },
        admin: { bg: '#16130F', panel: '#211C16', border: '#3A3225' },
      },
      fontFamily: {
        disp: ['var(--font-disp)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        disp: '0.5px',
      },
      boxShadow: {
        hard: '4px 4px 0 #1A1611',
        'hard-blue': '4px 4px 0 #1E6499',
        'hard-lg': '6px 6px 0 #1A1611',
        cta: '5px 5px 0 #1E6499',
        'cta-ink': '5px 5px 0 #1A1611',
        pop: '7px 7px 0 #1E6499',
      },
      backgroundImage: {
        'elo-grad': 'linear-gradient(135deg, #5391C2 0%, #165080 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
