/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0F0E',      
        surface: '#121816',   
        line: '#22302B',      
        mist: '#8B9A96',     
        paper: '#E7ECEA',    
        signal: '#B6FF3C',   
        alert: '#FF5C5C',     
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
      },
    },
  },
  plugins: [],
};
