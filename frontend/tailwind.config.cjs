/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
        surface: {
          0:   '#080c12',
          1:   '#0d1117',
          2:   '#131920',
          3:   '#1a2030',
          4:   '#212840',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
        xs:    ['0.75rem',   { lineHeight: '1.125rem' }],
        sm:    ['0.875rem',  { lineHeight: '1.375rem' }],
        base:  ['1rem',      { lineHeight: '1.5rem' }],
        lg:    ['1.125rem',  { lineHeight: '1.75rem' }],
        xl:    ['1.25rem',   { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem',    { lineHeight: '2rem' }],
        '3xl': ['1.875rem',  { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem',   { lineHeight: '2.5rem' }],
        '5xl': ['3rem',      { lineHeight: '1' }],
      },
      borderRadius: {
        sm:    '6px',
        DEFAULT:'10px',
        md:    '10px',
        lg:    '14px',
        xl:    '18px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        card:    '0 1px 2px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)',
        glow:    '0 0 32px rgba(99,102,241,0.2)',
        'glow-g':'0 0 32px rgba(16,185,129,0.2)',
        'glow-r':'0 0 32px rgba(239,68,68,0.2)',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
        think: {
          '0%':   { width: '15%' },
          '50%':  { width: '75%' },
          '100%': { width: '30%' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
        think:    'think 2.2s ease-in-out infinite',
        shimmer:  'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
