/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 프리미엄 디자인 연출을 위한 브랜드 색상 파레트 정의
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c7ff',
          400: '#80a3ff',
          500: '#4d7cff',
          600: '#2654eb',
          700: '#1c3ec7',
          800: '#1a34a3',
          900: '#1b2d80',
        }
      }
    },
  },
  plugins: [],
}
