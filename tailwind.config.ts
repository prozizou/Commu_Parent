import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Palette "carnet de correspondance" : bleu encre + papier crème + accent corail doux
        ink: {
          50: "#eef2f6",
          100: "#d7e0ea",
          400: "#4a6a8a",
          600: "#2c4a68",
          800: "#1a2f45",
          900: "#101d2c"
        },
        paper: "#f7f4ee",
        accent: "#c96a4d"
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"]
      }
    }
  },
  plugins: []
};
export default config;
