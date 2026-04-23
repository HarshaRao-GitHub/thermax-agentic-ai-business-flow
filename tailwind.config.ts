import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './data/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        thermax: {
          navy: '#0A2540',
          navyDeep: '#061A30',
          saffron: '#FF7A1A',
          saffronDeep: '#E5630A',
          slate: '#1F3A5F',
          mist: '#F4F6FA',
          line: '#E2E8F0',
          emerald: '#059669',
          emeraldLight: '#D1FAE5',
          red: '#DC2626',
          redLight: '#FEE2E2',
          amber: '#D97706',
          amberLight: '#FEF3C7'
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgba(10,37,64,.04), 0 4px 12px rgba(10,37,64,.06)',
        glow: '0 0 20px rgba(255,122,26,.15)'
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(255,122,26,.4)' },
          '70%': { boxShadow: '0 0 0 10px rgba(255,122,26,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(255,122,26,0)' }
        }
      },
      animation: {
        shimmer: 'shimmer 1.2s ease-in-out infinite',
        fadeIn: 'fadeIn 0.3s ease-out',
        pulseRing: 'pulseRing 2s infinite'
      }
    }
  },
  plugins: []
};

export default config;
