import React from "react"
import { FlexWidget, TextWidget } from "react-native-android-widget"
import { formatCurrency } from "@toliso/core"
import type { SpendingSummary } from "./spending-summary"

interface SpendingWidgetProps {
  summary: SpendingSummary | null
  /** Largura atual do widget em dp — usada para decidir entre o layout compacto (2x2) e o completo. */
  width?: number
}

const BG_FROM = "#1E2124"
const BG_TO = "#141619"
const ACCENT = "#2ECC71"
const MUTED = "#8B98A5"
const TEXT = "#F2F6F8"
const NEGATIVE = "#FF7A6D"
const POSITIVE = "#3FE08A"
const TRACK = "#2A2C2F"

const COMPACT_WIDTH_THRESHOLD = 180
const COMPACT_PADDING = 14
const FULL_PADDING = 18

/** Widget de tela inicial: gasto, pago e a pagar no período atual. */
export function SpendingWidget({ summary, width }: SpendingWidgetProps) {
  const compact = typeof width === "number" && width < COMPACT_WIDTH_THRESHOLD
  const padding = compact ? COMPACT_PADDING : FULL_PADDING

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundGradient: { from: BG_FROM, to: BG_TO, orientation: "TOP_BOTTOM" },
        borderRadius: 28,
        padding,
        flexDirection: "column",
      }}
    >
      <FlexWidget style={{ flexDirection: "row", alignItems: "center", width: "match_parent", flexGap: 6 }}>
        <FlexWidget style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT }} />
        <TextWidget
          text={summary ? `To Liso · ${summary.periodLabel}` : "To Liso"}
          style={{ fontSize: compact ? 10 : 12, color: MUTED, fontWeight: "700" }}
          maxLines={1}
        />
      </FlexWidget>

      {!summary ? (
        <FlexWidget style={{ flex: 1, width: "match_parent", justifyContent: "center" }}>
          <TextWidget text="Abra o app para sincronizar" style={{ fontSize: 11, color: MUTED }} maxLines={2} />
        </FlexWidget>
      ) : compact ? (
        <CompactBody summary={summary} width={width as number} padding={padding} />
      ) : (
        <FlexWidget style={{ flex: 1, flexDirection: "column", width: "match_parent", justifyContent: "center", flexGap: 8 }}>
          <Row label="Gasto no período" value={summary.totalExpenses} color={NEGATIVE} />
          <Row label="Pago" value={summary.totalPayments} color={POSITIVE} />
          <FlexWidget style={{ height: 1, width: "match_parent", backgroundColor: TRACK }} />
          <Row label="Falta pagar" value={summary.remaining} color={TEXT} strong />
        </FlexWidget>
      )}
    </FlexWidget>
  )
}

/** Layout 2x2: preenche todo o espaço vertical em vez de deixar um vão vazio embaixo. */
function CompactBody({ summary, width, padding }: { summary: SpendingSummary; width: number; padding: number }) {
  const quitado = summary.remaining <= 0.005
  const innerWidth = Math.max(width - padding * 2, 40)
  const paidRatio = summary.totalExpenses > 0.005 ? Math.min(summary.totalPayments / summary.totalExpenses, 1) : 1
  const fillWidth = Math.round(innerWidth * paidRatio)

  return (
    <FlexWidget style={{ flex: 1, flexDirection: "column", width: "match_parent", justifyContent: "center", flexGap: 5 }}>
      <TextWidget
        text={quitado ? "TUDO PAGO" : "FALTA PAGAR"}
        style={{ fontSize: 10, color: MUTED, fontWeight: "700", letterSpacing: 0.4 }}
        maxLines={1}
      />
      <TextWidget
        text={quitado ? "Fatura quitada" : formatCurrency(summary.remaining)}
        style={{
          fontSize: quitado ? 15 : 22,
          color: quitado ? POSITIVE : NEGATIVE,
          fontWeight: "800",
          adjustsFontSizeToFit: true,
        }}
        maxLines={1}
      />

      <FlexWidget style={{ height: 5, width: innerWidth, backgroundColor: TRACK, borderRadius: 3 }}>
        <FlexWidget style={{ height: 5, width: fillWidth, backgroundColor: POSITIVE, borderRadius: 3 }} />
      </FlexWidget>
      <TextWidget
        text={`${Math.round(paidRatio * 100)}% pago`}
        style={{ fontSize: 9, color: MUTED, fontWeight: "600" }}
        maxLines={1}
      />
    </FlexWidget>
  )
}

function Row({
  label,
  value,
  color,
  strong,
}: {
  label: string
  value: number
  color: `#${string}`
  strong?: boolean
}) {
  return (
    <FlexWidget style={{ flexDirection: "row", width: "match_parent", justifyContent: "space-between" }}>
      <TextWidget text={label} style={{ fontSize: 12, color: MUTED }} maxLines={1} />
      <TextWidget
        text={formatCurrency(value)}
        style={{ fontSize: strong ? 16 : 14, color, fontWeight: strong ? "800" : "600" }}
        maxLines={1}
      />
    </FlexWidget>
  )
}
