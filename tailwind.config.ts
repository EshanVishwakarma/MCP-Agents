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
        arul: {
          teal: "#0d9488",
          "teal-dark": "#0f766e",
          mint: "#99f6e4",
          sage: "#5eead4",
          navy: "#134e4a",
          purple: "#7c3aed",
          "purple-dark": "#6d28d9",
          forest: "#14532d",
          "forest-light": "#166534",
        },
      },
    },
  },
  plugins: [],
};

export default config;
