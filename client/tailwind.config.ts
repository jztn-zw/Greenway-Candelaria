import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

// Legacy utility names share the global palette; colors are edited in index.css.
const colorScale = (name: string) => Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
    .map((shade) => [shade, `hsl(var(--${name}-${shade}) / <alpha-value>)`]),
);

const badgeColors = Object.fromEntries(
  ["primary", "success", "warning", "info", "violet", "error", "neutral"].map((name) => [name, {
    DEFAULT: `var(--badge-${name}-background)`,
    foreground: `var(--badge-${name}-foreground)`,
    border: `var(--badge-${name}-border)`,
  }]),
);

export default {
  darkMode: ["class"],
  safelist: Object.keys(badgeColors).flatMap((name) => [
    `bg-badge-${name}`, `text-badge-${name}-foreground`, `border-badge-${name}-border`,
  ]),
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
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
      fontFamily: {
        sans: ["var(--font-ui)"],
        display: ["var(--font-heading)"],
        body: ["var(--font-ui)"],
      },
      fontSize: {
        "ui-overline": ["var(--font-size-overline)", { lineHeight: "1.4" }],
        "ui-caption": ["var(--font-size-caption)", { lineHeight: "1.5" }],
        "ui-label": ["var(--font-size-label)", { lineHeight: "1.5" }],
        "ui-body": ["var(--font-size-body)", { lineHeight: "1.5" }],
        "ui-title": ["var(--font-size-title)", { lineHeight: "1.375" }],
        "ui-page": ["var(--font-size-page)", { lineHeight: "1.25" }],
        "ui-page-lg": ["var(--font-size-page-lg)", { lineHeight: "1.25" }],
      },
      colors: {
        badge: badgeColors,
        brand: colorScale("brand"),
        emerald: colorScale("success"),
        green: colorScale("success"),
        lime: colorScale("success"),
        teal: colorScale("brand"),
        amber: colorScale("warning"),
        orange: colorScale("warning"),
        yellow: colorScale("warning"),
        red: colorScale("error"),
        rose: colorScale("error"),
        blue: colorScale("info"),
        sky: colorScale("info"),
        cyan: colorScale("info"),
        violet: colorScale("violet"),
        purple: colorScale("violet"),
        indigo: colorScale("violet"),
        fuchsia: colorScale("violet"),
        pink: colorScale("error"),
        slate: colorScale("neutral"),
        gray: colorScale("neutral"),
        zinc: colorScale("neutral"),
        neutral: colorScale("neutral"),
        stone: colorScale("neutral"),
        highlight: "hsl(var(--highlight) / <alpha-value>)",
        success: { ...colorScale("success"), DEFAULT: "hsl(var(--success) / <alpha-value>)", foreground: "hsl(var(--success-foreground) / <alpha-value>)" },
        warning: { ...colorScale("warning"), DEFAULT: "hsl(var(--warning) / <alpha-value>)", foreground: "hsl(var(--warning-foreground) / <alpha-value>)" },
        info: { ...colorScale("info"), DEFAULT: "hsl(var(--info) / <alpha-value>)", foreground: "hsl(var(--info-foreground) / <alpha-value>)" },
        error: "hsl(var(--error) / <alpha-value>)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        field: {
          DEFAULT: "var(--field-background)",
          placeholder: "var(--field-placeholder)",
        },
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
        forest: {
          DEFAULT: "hsl(var(--forest))",
          foreground: "hsl(var(--forest-foreground))",
        },
        leaf: "hsl(var(--leaf))",
        earth: {
          DEFAULT: "hsl(var(--earth))",
          dark: "hsl(var(--earth-dark))",
        },
        sand: "hsl(var(--sand))",
        canopy: {
          DEFAULT: "hsl(var(--canopy))",
          foreground: "hsl(var(--canopy-foreground))",
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
      },
      borderRadius: {
        DEFAULT: "var(--radius-small)",
        sm: "var(--radius-small)",
        md: "var(--radius)",
        detail: "var(--radius-detail)",
        compact: "var(--radius-compact)",
        lg: "var(--radius)",
        xl: "var(--radius-card)",
        "2xl": "var(--radius-card)",
        "3xl": "var(--radius-card)",
        modal: "var(--radius-modal)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        "2xs": "none",
        xs: "none",
        sm: "0 1px 2px hsl(var(--shadow) / 0.04)",
        md: "0 4px 12px -2px hsl(var(--shadow) / 0.08)",
        lg: "0 8px 24px -6px hsl(var(--shadow) / 0.12)",
        xl: "0 12px 32px -8px hsl(var(--shadow) / 0.14)",
        "2xl": "0 16px 40px -10px hsl(var(--shadow) / 0.18)",
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
        "fade-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out forwards",
      },
    },
  },
  plugins: [tailwindAnimate, typography],
} satisfies Config;
