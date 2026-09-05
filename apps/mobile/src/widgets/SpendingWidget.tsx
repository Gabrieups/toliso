import React from "react"
import { FlexWidget, TextWidget } from "react-native-android-widget"
import { formatCurrency } from "@toliso/core"
import type { SpendingSummary } from "./spending-summary"

interface SpendingWidgetProps {
  summary: SpendingSummary | null
  /** Largura atual do widget em dp — usada para decidir entre o layout compacto (2x2) e o completo. */
  width?: number
}

const BG = "#191A1C"
const ACCENT = "#2ECC71"
const MUTED = "#8B98A5"
const TEXT = "#F2F6F8"
const NEGATIVE = "#FF7A6D"
const POSITIVE = "#3FE08A"

const COMPACT_WIDTH_THRESHOLD = 180

/** Widget de tela inicial: gasto, pago e a pagar no período atual. */
export function SpendingWidget({ summary, width }: SpendingWidgetProps) {
  const compact = typeof width === "number" && width < COMPACT_WIDTH_THRESHOLD

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: BG,
        borderRadius: 28,
        padding: compact ? 14 : 18,
        flexDirection: "column",
        justifyContent: "space-between",
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
        <TextWidget text="Abra o app para sincronizar" style={{ fontSize: 11, color: MUTED }} maxLines={2} />
      ) : compact ? (
        <FlexWidget style={{ flexDirection: "column", width: "match_parent" }}>
          <TextWidget text="Falta pagar" style={{ fontSize: 10, color: MUTED, fontWeight: "600" }} />
          <TextWidget
            text={formatCurrency(summary.remaining)}
            style={{ fontSize: 20, color: TEXT, fontWeight: "800", adjustsFontSizeToFit: true }}
            maxLines={1}
          />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: "column", width: "match_parent", flexGap: 8 }}>
          <Row label="Gasto no período" value={summary.totalExpenses} color={NEGATIVE} />
          <Row label="Pago" value={summary.totalPayments} color={POSITIVE} />
          <FlexWidget style={{ height: 1, width: "match_parent", backgroundColor: "#2A2C2F" }} />
          <Row label="Falta pagar" value={summary.remaining} color={TEXT} strong />
        </FlexWidget>
      )}
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
