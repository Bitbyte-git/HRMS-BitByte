/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Muted teal/blue — professional, inspired by BitByte Tech
        primary: {
          50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
          400: '#2dd4bf', 500: '#0ea5a4', 600: '#0d9488', 700: '#0f766e',
          800: '#115e59', 900: '#134e4a',
        },
        // Sidebar / dark surface color
        corporate: {
          navy:  '#1e293b',   // deep neutral-gray (slate-800)
          panel: '#334155',   // slightly lighter panel
          steel: '#475569',
          muted: '#64748b',
          light: '#f8fafc',
        },
        // Semantic status (unchanged — used in badges)
        status: {
          pending:   '#d97706',
          submitted: '#3b82f6',
          approved:  '#059669',
          rejected:  '#dc2626',
          review:    '#7c3aed',
        },
        // App canvas — soft light gray
        canvas: {
          DEFAULT: '#f3f4f6',
          subtle:  '#e5e7eb',
        },
      },
      boxShadow: {
        // Named shadow scale — intentional, not noisy
        'xs':        '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'sm':        '0 1px 4px 0 rgb(0 0 0 / 0.06)',
        'card':      '0 2px 8px -2px rgb(0 0 0 / 0.08), 0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'card-lift': '0 8px 24px -4px rgb(0 0 0 / 0.10), 0 2px 6px -2px rgb(0 0 0 / 0.06)',
        'sidebar':   '1px 0 0 0 #1f2937',
        'topbar':    '0 1px 0 0 #e5e7eb',
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
