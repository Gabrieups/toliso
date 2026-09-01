/**
 * Design tokens do To Liso mobile.
 *
 * A linguagem visual é "liquid glass": um fundo com gradiente profundo e
 * manchas de cor desfocadas, sobre o qual flutuam superfícies translúcidas com
 * desfoque, borda-fio de 1px e um brilho sutil no topo. As cores de marca
 * (verde/turquesa) são as mesmas da plataforma web, para que as duas pareçam o
 * mesmo produto.
 */

export const palette = {
  primary: "#2ECC71",
  primaryDark: "#27AE60",
  primaryDeep: "#1E8449",
  secondary: "#1ABC9C",
  secondaryDark: "#16A085",
  danger: "#E74C3C",
  dangerSoft: "#F1786B",
  warning: "#F1C40F",
  info: "#4AA8FF",
} as const

export interface ThemeTokens {
  mode: "light" | "dark"
  /** Gradiente de fundo da tela, de cima para baixo. */
  backdrop: [string, string, string]
  /** Manchas de cor desfocadas que dão o efeito "liquid". */
  orbs: { primary: string; secondary: string; tertiary: string }
  /** Gradiente sólido dos formulários — fundo opaco, sem transparência. */
  surface: [string, string]
  /** Preenchimento das superfícies de vidro. */
  glass: {
    fill: string
    fillStrong: string
    fillSoft: string
    border: string
    borderStrong: string
    highlight: string
    shadow: string
  }
  text: {
    primary: string
    secondary: string
    muted: string
    inverse: string
  }
  accent: {
    primary: string
    primaryDark: string
    secondary: string
    danger: string
    warning: string
    info: string
    positive: string
    negative: string
  }
  /** Fundos de tags/badges com transparência. */
  tint: {
    positive: string
    negative: string
    neutral: string
    info: string
    warning: string
  }
  /** Intensidade do BlurView por tipo de superfície. */
  blur: { subtle: number; card: number; bar: number; modal: number }
  blurTint: "light" | "dark"
  statusBar: "light" | "dark"
}

const dark: ThemeTokens = {
  mode: "dark",
  backdrop: ["#222224", "#191A1C", "#313233"],
  orbs: {
    primary: "rgba(88, 214, 151, 0.50)",
    secondary: "rgba(64, 210, 199, 0.42)",
    tertiary: "rgba(90, 168, 235, 0.36)",
  },
  surface: ["#26282B", "#1C2320"],
  glass: {
    fill: "rgba(255, 255, 255, 0.30)",
    fillStrong: "rgba(255, 255, 255, 0.42)",
    fillSoft: "rgba(255, 255, 255, 0.20)",
    border: "rgba(255, 255, 255, 0.20)",
    borderStrong: "rgba(255, 255, 255, 0.28)",
    highlight: "rgba(255, 255, 255, 0.26)",
    shadow: "#000000",
  },
  text: {
    primary: "#F2F6F8",
    secondary: "rgba(242, 246, 248, 0.68)",
    muted: "rgba(242, 246, 248, 0.42)",
    inverse: "#06121A",
  },
  accent: {
    primary: palette.primary,
    primaryDark: palette.primaryDark,
    secondary: palette.secondary,
    danger: "#FF6B5E",
    warning: palette.warning,
    info: palette.info,
    positive: "#3FE08A",
    negative: "#FF7A6D",
  },
  tint: {
    positive: "rgba(46, 204, 113, 0.16)",
    negative: "rgba(231, 76, 60, 0.16)",
    neutral: "rgba(255, 255, 255, 0.08)",
    info: "rgba(74, 168, 255, 0.16)",
    warning: "rgba(241, 196, 15, 0.16)",
  },
  blur: { subtle: 18, card: 28, bar: 40, modal: 50 },
  blurTint: "dark",
  statusBar: "light",
}

const light: ThemeTokens = {
  mode: "light",
  backdrop: ["#F8F8F8", "#F5F5F5", "#F2F2F2"],
  orbs: {
    primary: "rgba(88, 214, 151, 0.42)",
    secondary: "rgba(64, 210, 199, 0.36)",
    tertiary: "rgba(90, 168, 235, 0.30)",
  },
  surface: ["#FFFFFF", "#F1F9F5"],
  glass: {
    fill: "rgba(255, 255, 255, 0.58)",
    fillStrong: "rgba(255, 255, 255, 0.78)",
    fillSoft: "rgba(255, 255, 255, 0.38)",
    border: "rgba(15, 40, 60, 0.08)",
    borderStrong: "rgba(15, 40, 60, 0.14)",
    highlight: "rgba(255, 255, 255, 0.90)",
    shadow: "#1B3A4B",
  },
  text: {
    primary: "#0F2233",
    secondary: "rgba(15, 34, 51, 0.66)",
    muted: "rgba(15, 34, 51, 0.42)",
    inverse: "#FFFFFF",
  },
  accent: {
    primary: palette.primaryDark,
    primaryDark: palette.primaryDeep,
    secondary: palette.secondaryDark,
    danger: "#D64231",
    warning: "#C79A06",
    info: "#1F7FD6",
    positive: palette.primaryDark,
    negative: "#D64231",
  },
  tint: {
    positive: "rgba(46, 204, 113, 0.14)",
    negative: "rgba(231, 76, 60, 0.12)",
    neutral: "rgba(15, 40, 60, 0.06)",
    info: "rgba(31, 127, 214, 0.12)",
    warning: "rgba(241, 196, 15, 0.18)",
  },
  blur: { subtle: 24, card: 34, bar: 50, modal: 60 },
  blurTint: "light",
  statusBar: "dark",
}

export const themes = { light, dark } as const

/** Escala de espaçamento em múltiplos de 4. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
} as const

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: "700" as const, letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700" as const, letterSpacing: -0.4 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: "500" as const },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: "600" as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "500" as const },
  micro: { fontSize: 11, lineHeight: 15, fontWeight: "600" as const, letterSpacing: 0.4 },
  /** Valores monetários usam tabular para não "dançar" ao atualizar. */
  amount: { fontSize: 28, lineHeight: 34, fontWeight: "700" as const, letterSpacing: -0.8 },
  amountSmall: { fontSize: 17, lineHeight: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
} as const

/** Cores padrão de cartão, iguais às oferecidas na web. */
export const CARD_COLORS = [
  "#2ECC71",
  "#1ABC9C",
  "#3498DB",
  "#9B59B6",
  "#E67E22",
  "#E74C3C",
  "#34495E",
  "#F1C40F",
] as const
