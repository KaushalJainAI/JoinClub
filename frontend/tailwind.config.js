/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // Fixed brand navy for hero/banner surfaces, the same in light and dark mode.
        navy: { DEFAULT: "hsl(221 70% 22%)", deep: "hsl(221 70% 12%)", mid: "hsl(221 70% 32%)" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
        warning: { DEFAULT: "hsl(var(--warning))", foreground: "hsl(var(--warning-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
      },
      borderRadius: { xl: "1rem", lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      boxShadow: {
        soft: "0 1px 2px hsl(220 40% 20% / 0.04), 0 4px 16px -4px hsl(220 40% 20% / 0.08)",
        lift: "0 2px 4px hsl(220 40% 20% / 0.06), 0 16px 40px -12px hsl(220 40% 20% / 0.18)",
      },
      keyframes: {
        "fade-up": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "none" } },
        blink: { "0%, 80%, 100%": { opacity: 0.2 }, "40%": { opacity: 1 } },
      },
      animation: { "fade-up": "fade-up .4s ease-out both", blink: "blink 1.4s infinite both" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
