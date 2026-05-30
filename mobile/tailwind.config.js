/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Mirror the web app's HSL tokens, hard-coded for RN (no CSS vars).
        background: {
          DEFAULT: '#f7f2e8',
          dark: '#11161f',
          sepia: '#efe5d2',
        },
        foreground: {
          DEFAULT: '#1a2236',
          dark: '#efe5d2',
          sepia: '#3a2c20',
        },
        card: {
          DEFAULT: '#fbf6ec',
          dark: '#161d2a',
        },
        muted: {
          DEFAULT: '#e6dccb',
          dark: '#23293a',
        },
        mutedForeground: {
          DEFAULT: '#6b6a5f',
          dark: '#9da3b3',
        },
        accent: {
          DEFAULT: '#f4a72c',
          dark: '#f0a634',
        },
        border: {
          DEFAULT: '#d8cdb7',
          dark: '#2a3245',
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
