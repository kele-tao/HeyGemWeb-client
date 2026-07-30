/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // === 品牌: 极光紫蓝青渐变 ===
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        // === 状态色 ===
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
        },
        // === 极光色 ===
        aurora: {
          violet: '#8b5cf6',
          blue: '#3b82f6',
          cyan: '#06b6d4',
          pink: '#ec4899',
          amber: '#f59e0b',
        },
        // === 中性色(深色友好) ===
        ink: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"Source Han Sans CN"',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          '"Fira Code"',
          'Menlo',
          'Consolas',
          'monospace',
        ],
        display: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      fontSize: {
        // 更精细的字号阶梯
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.0625rem', { lineHeight: '1.625rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
        '5xl': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        '6xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
      },
      borderRadius: {
        DEFAULT: '0.625rem',
        lg: '0.875rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        // 柔和阴影阶梯
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        soft: '0 2px 8px -2px rgba(0, 0, 0, 0.06), 0 4px 16px -4px rgba(0, 0, 0, 0.04)',
        md: '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 8px 24px -8px rgba(0, 0, 0, 0.06)',
        lg: '0 8px 24px -4px rgba(0, 0, 0, 0.10), 0 16px 48px -8px rgba(0, 0, 0, 0.08)',
        xl: '0 20px 40px -8px rgba(0, 0, 0, 0.12), 0 32px 64px -16px rgba(0, 0, 0, 0.10)',
        // 极光发光
        glow: '0 0 0 1px rgba(139, 92, 246, 0.20), 0 8px 32px -4px rgba(139, 92, 246, 0.30), 0 0 64px -16px rgba(139, 92, 246, 0.20)',
        'glow-lg': '0 0 0 1px rgba(139, 92, 246, 0.25), 0 16px 48px -8px rgba(139, 92, 246, 0.40), 0 0 96px -16px rgba(59, 130, 246, 0.30)',
        'glow-cyan': '0 0 0 1px rgba(6, 182, 212, 0.20), 0 8px 32px -4px rgba(6, 182, 212, 0.30)',
        // 内部高光(用于卡片顶部)
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-out': 'fadeOut 0.3s cubic-bezier(0.4, 0, 0.6, 1) forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'shimmer-fast': 'shimmer 1.2s linear infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-slower': 'float 12s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'gradient': 'gradient 8s ease infinite',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-soft': 'bounceSoft 2s ease-in-out infinite',
        'progress': 'progress 2s ease-in-out infinite',
        'aurora-shift': 'auroraShift 16s ease infinite',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '33%': { transform: 'translateY(-12px) translateX(6px)' },
          '66%': { transform: 'translateY(-6px) translateX(-6px)' },
        },
        pulseGlow: {
          '0%, 100%': {
            boxShadow:
              '0 0 0 1px rgba(139,92,246,0.2), 0 8px 24px -4px rgba(139,92,246,0.3)',
          },
          '50%': {
            boxShadow:
              '0 0 0 1px rgba(139,92,246,0.35), 0 12px 36px -4px rgba(139,92,246,0.5)',
          },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        auroraShift: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg) scale(1)' },
          '33%': { transform: 'translate(30px, -20px) rotate(5deg) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 30px) rotate(-3deg) scale(0.95)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      backgroundImage: {
        // 极光渐变预设
        'aurora-1': 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 50%, #06b6d4 100%)',
        'aurora-2': 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
        'aurora-3': 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
        'aurora-4': 'linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%)',
        'aurora-soft': 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.10) 50%, rgba(6,182,212,0.10) 100%)',
        'mesh-1':
          'radial-gradient(at 20% 20%, rgba(139,92,246,0.18) 0px, transparent 50%), radial-gradient(at 80% 30%, rgba(6,182,212,0.15) 0px, transparent 50%), radial-gradient(at 50% 80%, rgba(236,72,153,0.10) 0px, transparent 50%)',
        'mesh-dark':
          'radial-gradient(at 20% 20%, rgba(139,92,246,0.20) 0px, transparent 50%), radial-gradient(at 80% 30%, rgba(6,182,212,0.18) 0px, transparent 50%), radial-gradient(at 50% 80%, rgba(59,130,246,0.15) 0px, transparent 50%)',
        'shine':
          'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)',
        'glass':
          'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)',
        'glass-dark':
          'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
      },
      backgroundSize: {
        '200': '200% 200%',
        '300': '300% 300%',
      },
    },
  },
  plugins: [],
}
