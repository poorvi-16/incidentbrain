/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0F172A",
          panel: "#1E293B",
          line: "rgba(255,255,255,0.1)",
          light: "#F8FAFC",
          blue: "#3B82F6",
          green: "#10B981",
          amber: "#F59E0B",
          red: "#EF4444"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(59,130,246,0.15), 0 20px 60px rgba(59,130,246,0.18)",
        panel: "0 20px 50px rgba(15,23,42,0.35)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top, rgba(59,130,246,0.18), transparent 30%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)"
      },
      backgroundSize: {
        "hero-grid": "auto, 32px 32px, 32px 32px"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        }
      },
      animation: {
        float: "float 6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
