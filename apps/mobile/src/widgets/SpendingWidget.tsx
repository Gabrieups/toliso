import React from "react"
import { FlexWidget, TextWidget } from "react-native-android-widget"
import { formatCurrency } from "@toliso/core"
import type { SpendingSummary } from "./spending-summary"

interface SpendingWidgetProps {
  summary: SpendingSummary | null
}

/** Widget de tela inicial: gasto, pago e a pagar no período atual. */
export function SpendingWidget({ summary }: SpendingWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: "#191A1C",
        borderRadius: 24,
        padding: 16,
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <TextWidget
        text={summary ? `To Liso · ${summary.periodLabel}` : "To Liso"}
        style={{ fontSize: 12, color: "#8B98A5", fontWeight: "600" }}
      />

      {summary ? (
        <FlexWidget style={{ flexDirection: "column", width: "match_parent", flexGap: 6 }}>
          <Row label="Gasto no período" value={summary.totalExpenses} color="#FF7A6D" />
          <Row label="Pago" value={summary.totalPayments} color="#3FE08A" />
          <Row label="Falta pagar" value={summary.remaining} color="#F2F6F8" strong />
        </FlexWidget>
      ) : (
        <TextWidget text="Abra o app para sincronizar" style={{ fontSize: 12, color: "#8B98A5" }} />
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
      <TextWidget text={label} style={{ fontSize: 12, color: "#8B98A5" }} />
      <TextWidget
        text={formatCurrency(value)}
        style={{ fontSize: strong ? 16 : 14, color, fontWeight: strong ? "700" : "600" }}
      />
    </FlexWidget>
  )
}
