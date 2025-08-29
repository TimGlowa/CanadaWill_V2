/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // CanadaWill brand colors
        brand: {
          red: '#DC2626',    // Canadian red
          white: '#FFFFFF',
          gray: '#6B7280'
        },
        
        // Stance colors
        stance: {
          pro: '#059669',     // Pro Canada green
          against: '#DC2626', // Pro separation red
          neutral: '#6B7280', // No position gray
          unknown: '#9CA3AF'  // Unknown light gray
        }
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      
      screens: {
        'xs': '475px'
      },
      
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      },
      
      maxWidth: {
        '8xl': '88rem'
      }
    },
  },
  plugins: [],
} 