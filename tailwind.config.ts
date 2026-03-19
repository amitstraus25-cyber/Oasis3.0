import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        oasis: {
          teal: '#14B8A6',
          'teal-light': '#5EEAD4',
          'teal-dark': '#0D9488',
        },
        desert: {
          'sand-light': '#F5E6C8',
          'sand-mid': '#E8D5B7',
          'sand-dark': '#C4955C',
          'sand-deep': '#A67B45',
          cactus: '#5A7A5A',
          'cactus-dark': '#3D5E3D',
          rock: '#8B7355',
        },
      },
    },
  },
  plugins: [],
};

export default config;
