/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        success: '#22C55E',
        warning: '#EAB308',
        danger: '#EF4444',
        orange: '#F97316',
        dark: {
          bg: '#0A0A0A',
          card: '#141414',
          border: '#262626',
          text: '#E5E5E5',
          muted: '#A3A3A3',
        },
      },
      fontSize: {
        'display': ['2rem', { lineHeight: '1.2', fontWeight: '700' }],
        'heading': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'body': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.4' }],
      },
      borderRadius: {
        'card': '12px',
      },
    },
  },
  experimental: {
    optimizeUniversalDefaults: true,
  },
  plugins: [],
}
