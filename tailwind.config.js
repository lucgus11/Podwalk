/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#07070d',
        surface: '#0f0f1a',
        panel: '#161624',
        border: '#252538',
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e8c97a',
          dark: '#8a6b2a',
        },
        amber: {
          glow: '#f59e0b',
        },
        cream: '#f5f0e8',
        muted: '#6b6b8a',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        body: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 0 0 rgba(201, 168, 76, 0.4)' },
          '50%': { opacity: 0.8, boxShadow: '0 0 0 8px rgba(201, 168, 76, 0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'glow': {
          'from': { textShadow: '0 0 10px rgba(201, 168, 76, 0.3)' },
          'to': { textShadow: '0 0 20px rgba(201, 168, 76, 0.7), 0 0 40px rgba(201, 168, 76, 0.3)' },
        },
      },
    },
  },
  plugins: [],
};
