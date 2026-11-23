/** @type {import('tailwindcss').Config} */

// 设计体系唯一事实源（见 ai-docs/前端设计/模块设计/设计_设计体系与应用外壳.md §1）
// 颜色以 CSS 变量（RGB 三元组）承载，业务代码只用语义色 + 克制的品牌色阶。
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // === 语义色（rgb(var(--x) / <alpha>)） ===
        bg: {
          DEFAULT: 'rgb(var(--bg) / <alpha-value>)',
          2: 'rgb(var(--bg-2) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
          3: 'rgb(var(--surface-3) / <alpha-value>)',
        },
        hairline: {
          DEFAULT: 'rgb(var(--hairline) / <alpha-value>)',
          strong: 'rgb(var(--hairline-strong) / <alpha-value>)',
        },
        text: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
          2: 'rgb(var(--text-2) / <alpha-value>)',
          3: 'rgb(var(--text-3) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          weak: 'rgb(var(--accent-weak) / <alpha-value>)',
          contrast: 'rgb(var(--accent-contrast) / <alpha-value>)',
        },
        // 旧变量兼容（部分页面仍用 --border / --text-muted）
        border: {
          DEFAULT: 'rgb(var(--hairline) / <alpha-value>)',
          2: 'rgb(var(--hairline-strong) / <alpha-value>)',
        },

        // === 品牌：暖铜色阶（studio key light），500 对应 --accent ===
        brand: {
          50: '#fbf5ec',
          100: '#f6e8d3',
          200: '#ebcfa6',
          300: '#dfb478',
          400: '#d29a5a',
          500: '#d9a559',
          600: '#b3823f',
          700: '#8a5e1a',
          800: '#6d4a15',
          900: '#573b11',
          950: '#31210a',
        },

        // === 状态色（低饱和，只用于徽标/图标/进度） ===
        success: {
          50: '#eef7f1',
          100: '#d8ecdf',
          400: '#6cbb8a',
          500: '#4fa96e',
          600: '#3d8c58',
          700: '#1c804c',
        },
        warning: {
          50: '#fbf6e8',
          100: '#f5ebcc',
          400: '#e0bf62',
          500: '#d8b04a',
          600: '#b08a2c',
          700: '#9a6816',
        },
        danger: {
          50: '#fceeef',
          100: '#f8d9db',
          400: '#ec6e72',
          500: '#e5484d',
          600: '#c33139',
          700: '#9e2530',
        },
        info: {
          50: '#eef3f8',
          100: '#dbe6f0',
          400: '#7ba6c6',
          500: '#5b8fb9',
          600: '#457699',
          700: '#2f6f9e',
        },

        // === 中性色阶（微暖，近黑到近白） ===
        ink: {
          50: '#faf9f8',
          100: '#f4f3f1',
          200: '#e6e4e0',
          300: '#d3d0ca',
          400: '#a8acb3',
          500: '#74787f',
          600: '#5a5d63',
          700: '#3a3d43',
          800: '#26292f',
          900: '#16181b',
          950: '#08090b',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Source Han Sans CN',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        // 设计体系 §1.3
        '2xs': ['0.6875rem', { lineHeight: '1.4' }], // 11 Overline/Caption
        xs: ['0.75rem', { lineHeight: '1.4' }], // 12 Caption
        sm: ['0.8125rem', { lineHeight: '1.4' }], // 13 Label/Body-sm
        base: ['0.875rem', { lineHeight: '1.6' }], // 14 Body
        lg: ['0.9375rem', { lineHeight: '1.5' }], // 15 H2
        xl: ['1.125rem', { lineHeight: '1.45' }],
        '2xl': ['1.375rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }], // 22 H1 移动
        '3xl': ['1.625rem', { lineHeight: '1.25', letterSpacing: '-0.02em' }], // 26 H1
        '4xl': ['2rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }], // 32 Display
        '5xl': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        '6xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '8px',
        xl: '12px',
        '2xl': '12px',
        '3xl': '14px',
      },
      boxShadow: {
        // 深色主题以边框表达层级，阴影只用于浮层
        panel:
          'inset 0 1px 0 0 rgb(255 255 255 / 0.03), 0 24px 60px -40px rgb(0 0 0 / 0.9)',
        lift: '0 18px 40px -24px rgb(0 0 0 / 0.85)',
        // 旧类名收敛：1px 强调色描边 + 中性投影，无彩色发光
        glow: '0 0 0 1px rgb(var(--accent) / 0.35), 0 18px 40px -24px rgb(0 0 0 / 0.85)',
        'inner-glow': 'inset 0 1px 0 0 rgb(255 255 255 / 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-out': 'fadeOut 160ms cubic-bezier(0.4, 0, 1, 1) forwards',
        'slide-up': 'slideUp 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-down': 'slideDown 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scaleIn 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        'drawer-in': 'drawerIn 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'shimmer-fast': 'shimmer 1.6s linear infinite',
        'progress': 'progress 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'shake': 'shake 400ms ease-in-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeOut: { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        drawerIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-3px)' },
          '75%': { transform: 'translateX(3px)' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      backgroundImage: {
        // 预览遮罩 / 弱化分隔（明度差 ≤ 12%，无彩色渐变）
        'stage-light':
          'radial-gradient(ellipse at 50% -10%, rgb(255 255 255 / 0.10) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
}