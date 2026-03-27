import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The Cartographer — dark forest + warm gold palette
        forest: {
          950: '#0e1210',
          900: '#111814',
          800: '#151c18',
          700: '#1c2820',
          600: '#233028',
          500: '#2a3a2f',
          400: '#3a5040',
          300: '#5a7060',
        },
        gold: {
          300: '#e8d4a0',
          400: '#dfc088',
          500: '#c8a96e',
          600: '#b09050',
          700: '#8a7040',
        },
        parchment: {
          50: '#faf8f2',
          100: '#f5f0e4',
          200: '#ede5d0',
        },
        ink: {
          900: '#1a1a18',
          800: '#2a2a26',
          700: '#3a3a36',
        },
        cream: {
          100: '#f0ebe0',
          200: '#e8e3d6',
          300: '#d8d2c4',
          400: '#b8b2a4',
          500: '#909080',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        document: ['"EB Garamond"', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-gold': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        'pulse-gold': 'pulse-gold 1.5s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
