import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontSize: {
        "display-xl": ["6.5rem", { lineHeight: "1", letterSpacing: "-0.04em", fontWeight: "700" }],
        "display-lg": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-md": ["3rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
        "display-sm": ["2.25rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-xl": ["2rem", { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-lg": ["1.75rem", { lineHeight: "1.4", fontWeight: "600" }],
        "headline-md": ["1.5rem", { lineHeight: "1.5", fontWeight: "600" }],
        "headline-sm": ["1.25rem", { lineHeight: "1.5", fontWeight: "600" }],
        "title-lg": ["1.125rem", { lineHeight: "1.5", fontWeight: "600" }],
        "title-md": ["1rem", { lineHeight: "1.5", fontWeight: "500" }],
        "title-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "500" }],
        "body-lg": ["1.125rem", { lineHeight: "1.7", fontWeight: "400" }],
        "body-md": ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.6", fontWeight: "400" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Stance colors
        pro: {
          DEFAULT: "hsl(var(--pro))",
          light: "hsl(var(--pro-light))",
          dark: "hsl(var(--pro-dark))",
        },
        con: {
          DEFAULT: "hsl(var(--con))",
          light: "hsl(var(--con-light))",
          dark: "hsl(var(--con-dark))",
        },
        audience: {
          DEFAULT: "hsl(var(--audience))",
          light: "hsl(var(--audience-light))",
          dark: "hsl(var(--audience-dark))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "2rem",
      },
      boxShadow: {
        "spatial-sm": "0 2px 8px -2px rgba(0, 0, 0, 0.06), 0 1px 4px -1px rgba(0, 0, 0, 0.04)",
        "spatial": "0 4px 16px -4px rgba(0, 0, 0, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)",
        "spatial-md": "0 8px 24px -6px rgba(0, 0, 0, 0.1), 0 4px 12px -4px rgba(0, 0, 0, 0.06)",
        "spatial-lg": "0 16px 48px -12px rgba(0, 0, 0, 0.12), 0 8px 24px -8px rgba(0, 0, 0, 0.08)",
        "spatial-xl": "0 24px 64px -16px rgba(0, 0, 0, 0.16), 0 12px 32px -12px rgba(0, 0, 0, 0.1)",
        "glass-sm": "0 2px 8px -2px rgba(0, 0, 0, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
        "glass": "0 4px 16px -4px rgba(0, 0, 0, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)",
        "glass-md": "0 8px 24px -6px rgba(0, 0, 0, 0.08), inset 0 2px 0 0 rgba(255, 255, 255, 0.15)",
        "glow-sm": "0 0 20px rgba(59, 130, 246, 0.15)",
        "glow": "0 0 40px rgba(59, 130, 246, 0.25)",
        "glow-lg": "0 0 60px rgba(59, 130, 246, 0.35)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "fade-in-down": "fade-in-down 0.6s ease-out",
        "scale-in": "scale-in 0.4s ease-out",
        "slide-in-right": "slide-in-right 0.5s ease-out",
        "slide-in-left": "slide-in-left 0.5s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      transitionTimingFunction: {
        "ease-out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
        "ease-in-out-expo": "cubic-bezier(0.87, 0, 0.13, 1)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-mesh": "radial-gradient(at 20% 30%, hsla(var(--primary) / 0.3) 0px, transparent 50%), radial-gradient(at 80% 70%, hsla(var(--pro) / 0.2) 0px, transparent 50%), radial-gradient(at 40% 80%, hsla(var(--audience) / 0.2) 0px, transparent 50%)",
      },
    },
  },
  plugins: [],
};
export default config;
