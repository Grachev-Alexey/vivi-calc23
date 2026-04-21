import type { Config } from "tailwindcss";

const gold = {
  50: "hsl(45, 90%, 96%)",
  100: "hsl(45, 85%, 88%)",
  200: "hsl(44, 82%, 78%)",
  300: "hsl(43, 80%, 68%)",
  400: "hsl(43, 82%, 60%)",
  500: "hsl(43, 88%, 52%)",
  600: "hsl(40, 85%, 46%)",
  700: "hsl(36, 78%, 38%)",
  800: "hsl(32, 70%, 30%)",
  900: "hsl(28, 65%, 22%)",
  950: "hsl(28, 60%, 14%)",
};

const royalBlue = {
  50: "hsl(214, 100%, 96%)",
  100: "hsl(214, 95%, 90%)",
  200: "hsl(213, 92%, 80%)",
  300: "hsl(212, 90%, 70%)",
  400: "hsl(212, 90%, 60%)",
  500: "hsl(214, 92%, 52%)",
  600: "hsl(216, 88%, 44%)",
  700: "hsl(218, 80%, 36%)",
  800: "hsl(220, 75%, 28%)",
  900: "hsl(222, 70%, 20%)",
  950: "hsl(224, 70%, 12%)",
};

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        premium: gold[400],
        // Remap legacy pink/rose/fuchsia palettes to gold/blue tones
        pink: gold,
        rose: gold,
        fuchsia: gold,
        purple: royalBlue,
        violet: royalBlue,
        gold,
        royal: royalBlue,
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
