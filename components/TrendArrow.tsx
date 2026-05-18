import type { KpiDirection, KpiTrend } from "../data/types.ts";

interface Props {
  trend: KpiTrend;
  delta: number;
  unit: string;
  direction: KpiDirection;
  window: string;
}

export function TrendArrow(
  { trend, delta, unit, direction, window }: Props,
) {
  const goodWhenUp = direction === "higher-better";
  const isGood = trend === "flat"
    ? true
    : (trend === "up" ? goodWhenUp : !goodWhenUp);
  const tone = trend === "flat"
    ? "text-base-content/60"
    : isGood
    ? "text-success"
    : "text-error";

  const glyph = trend === "up" ? "▲" : trend === "down" ? "▼" : "▬";
  const sign = delta > 0 ? "+" : "";
  const showUnit = unit.length <= 4 ? unit : "";

  return (
    <span class={`inline-flex items-center gap-1 text-sm ${tone}`}>
      <span aria-hidden="true">{glyph}</span>
      <span class="tabular-nums">
        {sign}
        {delta.toFixed(1)}
        {showUnit}
      </span>
      <span class="text-base-content/50 font-normal">· {window}</span>
    </span>
  );
}
