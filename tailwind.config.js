/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A0F14',
          900: '#101820',
          800: '#19252F',
          700: '#202E3A',
          600: '#2A3A47',
          500: '#344654',
          400: '#475867',
          300: '#5C6E7D',
        },
        signal: {
          amber: '#F4B942',
          amberDim: '#B8862E',
          coral: '#F06A61',
          coralDim: '#B04F48',
          teal: '#4BC6B0',
          tealDim: '#358A7C',
        },
        text: {
          DEFAULT: '#E8EDF0',
          dim: '#91A0AC',
          faint: '#6B7785',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['"Fraunces"', '"Iowan Old Style"', 'Georgia', 'serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(244,185,66,0.25), 0 0 24px -8px rgba(244,185,66,0.35)',
        inset: 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '0.7' },
          '70%': { transform: 'scale(1.3)', opacity: '0' },
          '100%': { transform: 'scale(1.3)', opacity: '0' },
        },
        'dash-flow': {
          to: { strokeDashoffset: '-20' },
        },
        'ticker': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.28s cubic-bezier(0.16,1,0.3,1)',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
        'dash-flow': 'dash-flow 1.2s linear infinite',
      },
    },
  },
  plugins: [],
};
