module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#EB0000', // Bright Red
        secondary: '#1a1919', // Dark Gray (almost black)
        neutral: '#FFFFFF', // White
        headerText:'#7a7676',
        lightRed:"#FF3333",
        container:"#09090A",
        primaryLight:"#330000",
      },
      fontFamily: {
        play: ["Orbitron", "sans-serif"], // Include Play font
        zilla: ['Zilla Slab', 'serif'], // Include Zilla Slab font
        ptserif: ['PT Serif', 'serif'], // Include PT Serif font
        spaceGrotesk: ['Space Grotesk', 'sans-serif'], // Include Space Grotesk font
      },
      animation: {
        'slide-in-right': 'slideInRight 1s ease-out forwards',
        'slide-in-left': 'slideInLeft 1s ease-out forwards',
        'loop-slide-in': 'loopSlideIn 5s infinite',
        'loop-slide': 'loopSlide 5s infinite',
        'marquee-right': 'marqueeRight 10s linear infinite',
        'marquee-left': 'marqueeLeft 10s linear infinite',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        loopSlideIn: {
          '0%, 100%': { transform: 'translateX(0)', opacity: 1 }, // From left/right
          '50%': { transform: 'translateX(-100%)', opacity: 1 },  // From right/left
        },
        loopSlide: {
          '0%': { transform: 'translateX(100%)', opacity: 1 }, // From right
          '50%': { transform: 'translateX(0)', opacity: 1 },    // From center
          '100%': { transform: 'translateX(-100%)', opacity: 1 }, // Back from left
        },
        marqueeRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        marqueeLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};