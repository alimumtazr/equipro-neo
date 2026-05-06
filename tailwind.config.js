/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        neo: {
          bg: "#FFF8E7",
          ink: "#0f0f0f",
          line: "#0f0f0f",
          yellow: "#FFE500",
          pink: "#FF4D6D",
          cyan: "#00E5FF",
          green: "#3DFF7A",
          muted: "#5c5c5c",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        neo: "4px 4px 0 0 #0f0f0f",
        "neo-sm": "2px 2px 0 0 #0f0f0f",
        "neo-lg": "6px 6px 0 0 #0f0f0f",
      },
    },
  },
  plugins: [],
};
