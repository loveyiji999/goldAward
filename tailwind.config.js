// tailwind.config.js
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',   // 藍色主色
        secondary: '#4B5563', // 深灰次要文字
        accent: '#10B981',    // 綠色重點
        background: '#F9FAFB',// 網頁背景
        border: '#E5E7EB'     // 邊框顏色
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem'
      },
      borderRadius: {
        'xl': '1rem'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
};
