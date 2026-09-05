import React from "react"
import type { WidgetTaskHandlerProps } from "react-native-android-widget"
import { SpendingWidget } from "./SpendingWidget"
import { readSpendingSummaryWithFallback } from "./spending-summary"

const WIDGET_NAME = "SpendingWidget"

/**
 * Ponto de entrada chamado pelo Android para desenhar o widget — tanto quando
 * ele é adicionado/redimensionado quanto no refresh periódico em segundo
 * plano (`updatePeriodMillis`, no mínimo a cada 30min, definido no app.json).
 *
 * Roda numa instância JS headless, sem o app/React tree normal montado — por
 * isso busca o resumo direto (`readSpendingSummaryWithFallback`) em vez de
 * depender de contexto do React.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== WIDGET_NAME) return
  if (props.widgetAction === "WIDGET_DELETED") return

  const summary = await readSpendingSummaryWithFallback()
  props.renderWidget(React.createElement(SpendingWidget, { summary }))
}
