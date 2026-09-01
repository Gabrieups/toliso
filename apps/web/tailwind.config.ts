import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },

        // Paleta da marca. Os nomes `custom-*` são mantidos por compatibilidade
        // com as telas existentes; os valores acompanham o novo sistema visual e
        // o aplicativo mobile.
        "custom-primary": "hsl(var(--primary))",
        "custom-primary-dark": "hsl(var(--primary) / 0.85)",
        "custom-secondary": "hsl(var(--secondary))",
        "custom-secondary-dark": "hsl(var(--secondary) / 0.85)",
        "custom-text-primary": "hsl(var(--foreground))",
        "custom-text-primary-dark": "hsl(var(--foreground))",
        "custom-text-secondary": "hsl(var(--muted-foreground))",
        "custom-text-secondary-dark": "hsl(var(--muted-foreground))",
        "custom-error": "hsl(var(--destructive))",
        "custom-error-dark": "hsl(var(--destructive))",
        "custom-success-light": "hsl(var(--primary) / 0.12)",
        "custom-success-dark": "hsl(var(--primary) / 0.18)",
        "custom-border": "hsl(var(--border))",
        "custom-border-dark": "hsl(var(--border))",
        "custom-bg-dark": "hsl(var(--card))",

        // Tons semânticos de valor — usados em gastos e pagamentos.
        expense: {
          DEFAULT: "hsl(var(--destructive))",
          soft: "hsl(var(--destructive) / 0.12)",
        },
        income: {
          DEFAULT: "hsl(var(--primary))",
          soft: "hsl(var(--primary) / 0.12)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 6px)",
        "2xl": "calc(var(--radius) + 12px)",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 8px 32px -12px rgb(var(--glass-shadow))",
        "glass-lg": "0 24px 60px -20px rgb(var(--glass-shadow))",
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
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.28s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
