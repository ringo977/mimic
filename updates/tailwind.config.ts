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
        // Colori Istituzionali PoliMi
        polimi: {
          'blue-heritage': '#102C53',
          'black': '#000000',
          'white': '#FFFFFF',
          'gray': '#E0DCDC',
          // Colori Ingegneria (accenti)
          'bright-blue': '#4DC9FF',
          'alpha-blue': '#2CB7FF',
          'beta-blue': '#0BA4FF',
          // Colori Terziaria (accenti secondari)
          'binary-cyan': '#73A2D1',
          'space-blue': '#6698FF',
          'photonic-azure': '#73A1F7',
          'steel-indigo': '#5C9BE0',
          'sustainable-sage': '#67B2C6',
        },
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'Arial', 'sans-serif'],
        serif: ['var(--font-frank)', 'Georgia', 'serif'],
      },
      spacing: {
        '18': '4.5rem',    // 72px
        '78': '19.5rem',   // 312px (margini laterali PoliMi)
      },
      maxWidth: {
        'content': '1400px',
      },
      borderRadius: {
        'polimi': '0.75rem', // 12px
      },
      boxShadow: {
        'polimi': '0 4px 6px -1px rgba(16, 44, 83, 0.1), 0 2px 4px -1px rgba(16, 44, 83, 0.06)',
        'polimi-lg': '0 10px 15px -3px rgba(16, 44, 83, 0.1), 0 4px 6px -2px rgba(16, 44, 83, 0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
