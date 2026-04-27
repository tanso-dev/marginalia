/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f0f0e",
        surface: "#1a1918",
        "surface-hover": "#242320",
        "surface-active": "#2e2c28",
        border: "#33312c",
        "border-light": "#44413a",
        text: "#e8e4dc",
        "text-muted": "#9b9488",
        "text-dim": "#6b655c",
        accent: "#c49a6c",
        "accent-light": "#d4af82",
        "accent-dim": "#8a6d4b",
        success: "#6b9e6b",
        warning: "#c4a24c",
        danger: "#b05454",
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["'Source Serif 4'", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
