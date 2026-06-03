/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Mirror lib/theme.ts. NativeWind doesn't read CSS variables, so
        // colors are hard-coded here; update both files together.
        background: {
          DEFAULT: '#f7f4ec',
          dark: '#1a1816',
          sepia: '#efe5d2',
        },
        foreground: {
          DEFAULT: '#1f1c18',
          dark: '#efeae0',
          sepia: '#3a2c20',
        },
        card: {
          DEFAULT: '#fbf8f0',
          dark: '#221f1c',
        },
        muted: {
          DEFAULT: '#ece5d4',
          dark: '#2a2624',
        },
        mutedForeground: {
          DEFAULT: '#6b6760',
          dark: '#a8a39a',
        },
        accent: {
          DEFAULT: '#c2693d',
          dark: '#cf7950',
        },
        border: {
          DEFAULT: '#ddd5c4',
          dark: '#3a342f',
        },
        destructive: {
          DEFAULT: '#b91c1c',
        },
      },
      fontFamily: {
        serif: ['Georgia'],
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
