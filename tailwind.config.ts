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
        polimi: {
          'blue-heritage': '#102C53',
          'black': '#000000',
          'white': '#FFFFFF',
          'gray': '#E0DCDC',
          'bright-blue': '#4DC9FF',
          'alpha-blue': '#2CB7FF',
          'beta-blue': '#0BA4FF',
          'binary-cyan': '#73A2D1',
          'space-blue': '#6698FF',
          'photonic-azure': '#73A1F7',
        }
      },
      fontFamily: {
        manrope: ['var(--font-manrope)', 'Arial', 'sans-serif'],
        frank: ['var(--font-frank)', 'Georgia', 'serif'],
      },
      spacing: {
        '78': '78px',
      }
    },
  },
  plugins: [],
};

export default config;
