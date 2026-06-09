import type { Lang } from "../data/lang.ts";
import { formatUsdValue, t } from "../data/lang.ts";
import type { FindingChart, FiscalSeverity } from "../data/types.ts";

/**
 * Server-rendered SVG chart for a tracked finding — no island, no chart library.
 *
 * Both `histogram` and `burndown` render as vertical bars over time; the latest
 * bar is highlighted and the rest are dimmed. A `histogram` may carry a dashed
 * `target` reference line (e.g. an FRBM ceiling); a `burndown` shows its goal in
 * the caption (typically ₹0). New `actual` points appended each budget simply
 * add bars, so the picture fills in over the term.
 */

const SEV_COLOR: Record<FiscalSeverity, string> = {
  critical: "text-error",
  warning: "text-warning",
  ok: "text-success",
};

/** Compact value label, e.g. 78069 → "78,069", 33.22 → "33.2". */
function fmt(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString("en-IN");
  return n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

export function MetricChart(
  { chart, severity, lang, usdRate = 83.5 }: {
    chart: FindingChart;
    severity: FiscalSeverity;
    lang: Lang;
    usdRate?: number;
  },
) {
  const pts = chart.points;
  const W = 320;
  const H = 124;
  const padTop = 20; // headroom for the latest-value label
  const padBottom = 16; // year ticks
  const padX = 6;
  const plotH = H - padTop - padBottom;
  const plotW = W - 2 * padX;

  const max = Math.max(...pts.map((p) => p.value), chart.target ?? 0) || 1;
  const n = pts.length;
  const slot = plotW / n;
  const gap = Math.min(6, slot * 0.25);
  const barW = slot - gap;

  const yOf = (v: number) => padTop + plotH * (1 - v / max);
  const lastIdx = n - 1;

  // Draw a target reference line only when it sits above the axis (target 0 is
  // just the baseline and needs no line).
  const showTarget = chart.target !== undefined && chart.target > 0;
  const targetY = showTarget ? yOf(chart.target as number) : 0;

  const ariaLabel = `${chart.unit}: ${
    pts.map((p) => `${p.year} ${fmt(p.value)}`).join(", ")
  }`;

  const convertUnit = (unit: string, l: Lang): string => {
    if (unit === "₹ crore") {
      return l === "ml" ? "₹ കോടി (~$ ബില്യൺ)" : "₹ crore (~$B)";
    }
    if (unit === "₹ കോടി") return "₹ കോടി (~$ ബില്യൺ)";
    if (unit === "accumulated loss, ₹ crore") {
      return l === "ml"
        ? "സഞ്ചിത നഷ്ടം, ₹ കോടി (~$ ബില്യൺ)"
        : "accumulated loss, ₹ crore (~$B)";
    }
    if (unit === "സഞ്ചിത നഷ്ടം, ₹ കോടി") return "സഞ്ചിത നഷ്ടം, ₹ കോടി (~$ ബില്യൺ)";
    return unit;
  };

  const isCurrency = !!(chart.unit.includes("₹ crore") ||
    (chart.unitMl && chart.unitMl.includes("₹ കോടി")));

  return (
    <figure class="mt-3">
      <figcaption class="flex items-baseline justify-between gap-2 mb-1">
        <span class="text-[11px] font-semibold text-base-content/70">
          {convertUnit(pick(lang, chart.unit, chart.unitMl), lang)}
        </span>
        {chart.kind === "burndown" && (
          <span class="text-[10px] text-base-content/50">
            {t(lang, "goal", "ലക്ഷ്യം")}: {chart.targetLabel ?? "0"} ·{" "}
            {t(lang, "tracked each budget", "ഓരോ ബജറ്റിലും")}
          </span>
        )}
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        class={`w-full ${SEV_COLOR[severity]}`}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="none"
      >
        {/* baseline */}
        <line
          x1={padX}
          y1={padTop + plotH}
          x2={W - padX}
          y2={padTop + plotH}
          stroke="currentColor"
          stroke-width="1"
          opacity="0.25"
        />

        {/* target reference line */}
        {showTarget && (
          <g>
            <line
              x1={padX}
              y1={targetY}
              x2={W - padX}
              y2={targetY}
              stroke="currentColor"
              stroke-width="1"
              stroke-dasharray="3 3"
              opacity="0.7"
            />
            <text
              x={W - padX}
              y={targetY - 2}
              text-anchor="end"
              class="fill-current"
              font-size="8"
              opacity="0.75"
            >
              {chart.targetLabel ?? ""} {fmt(chart.target as number)}
            </text>
          </g>
        )}

        {/* bars */}
        {pts.map((p, i) => {
          const x = padX + i * slot + gap / 2;
          const y = yOf(p.value);
          const h = padTop + plotH - y;
          const isLast = i === lastIdx;
          const usdVal = isCurrency
            ? formatUsdValue(p.value, lang, usdRate)
            : null;
          const tooltipText = isCurrency
            ? `${p.year}: ${fmt(p.value)} (~${usdVal})${
              p.note ? ` (${p.note})` : ""
            }`
            : `${p.year}: ${fmt(p.value)}${p.note ? ` (${p.note})` : ""}`;
          return (
            <g key={p.year}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(0, h)}
                rx="1.5"
                fill="currentColor"
                opacity={isLast ? 1 : p.note ? 0.6 : 0.38}
              >
                <title>{tooltipText}</title>
              </rect>
              {isLast && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  text-anchor="middle"
                  class="fill-current"
                  font-size="9"
                  font-weight="700"
                >
                  {fmt(p.value)}
                </text>
              )}
              <text
                x={x + barW / 2}
                y={H - 4}
                text-anchor="middle"
                class="fill-base-content"
                font-size="7.5"
                opacity="0.55"
              >
                {`'${String(p.year).slice(-2)}`}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Provenance — quote the exact source table we pulled the numbers from. */}
      <p class="mt-1 text-[10px] text-base-content/45">
        {t(lang, "Source", "ഉറവിടം")}: {chart.source}
      </p>
    </figure>
  );
}

function pick(lang: Lang, en: string, ml?: string): string {
  return lang === "ml" && ml ? ml : en;
}
