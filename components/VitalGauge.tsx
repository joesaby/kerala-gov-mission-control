import type { Lang } from "../data/lang.ts";
import { t } from "../data/lang.ts";
import type { FiscalSeverity, FiscalVital } from "../data/types.ts";

/**
 * A single fiscal vital rendered as a daisyUI radial-progress gauge, colour-
 * coded by clinical severity. When `latest` is filled (a newer budget landed),
 * it shows the baseline → latest delta — the baseline-as-scorecard pattern.
 * Shared by the fiscal-status landing and the white-paper page.
 */

const SEV: Record<FiscalSeverity, { ring: string; text: string }> = {
  critical: { ring: "text-error", text: "text-error" },
  warning: { ring: "text-warning", text: "text-warning" },
  ok: { ring: "text-success", text: "text-success" },
};

function pick(lang: Lang, en: string, ml?: string): string {
  return lang === "ml" && ml ? ml : en;
}

/** Baseline → latest delta, or null while we're still at the baseline. */
function delta(
  v: FiscalVital,
  lang: Lang,
): { txt: string; cls: string } | null {
  if (v.latest === undefined) return null;
  const diff = Math.round((v.latest - v.baseline) * 10) / 10;
  if (diff === 0) {
    return {
      txt: t(lang, "no change", "മാറ്റമില്ല"),
      cls: "text-base-content/60",
    };
  }
  const improved = v.direction === "lower-better" ? diff < 0 : diff > 0;
  const arrow = diff > 0 ? "▲" : "▼";
  return {
    txt: `${arrow} ${Math.abs(diff)} pp`,
    cls: improved ? "text-success" : "text-error",
  };
}

export function VitalGauge({ v, lang }: { v: FiscalVital; lang: Lang }) {
  const sev = SEV[v.status];
  const d = delta(v, lang);
  // radial-progress expects 0–100; clamp so tiny/large values still render.
  const gauge = Math.max(0, Math.min(100, v.baseline));
  return (
    <div class="surface-card kasavu-top p-5 flex flex-col items-center text-center">
      <div
        class={`radial-progress ${sev.ring}`}
        style={`--value:${gauge}; --size:6.5rem; --thickness:0.55rem;`}
        role="progressbar"
        aria-valuenow={v.baseline}
        aria-label={pick(lang, v.label, v.labelMl)}
      >
        <span class={`metric-value !text-2xl ${sev.text}`}>
          {v.baselineDisplay}
        </span>
      </div>
      <p
        class={`mt-3 font-semibold leading-tight ${lang === "ml" ? "ml" : ""}`}
      >
        {pick(lang, v.label, v.labelMl)}
      </p>
      <p class={`text-xs text-base-content/60 ${lang === "ml" ? "ml" : ""}`}>
        {pick(lang, v.unit, v.unitMl)} · {v.period}
      </p>
      {d
        ? (
          <p class={`mt-1 text-xs font-semibold tabular-nums ${d.cls}`}>
            {d.txt} → {v.latestDisplay}{" "}
            <span class="text-base-content/50 font-normal">
              ({v.latestPeriod})
            </span>
          </p>
        )
        : (
          <span class="mt-1 badge badge-ghost badge-xs">
            {t(lang, "baseline", "അടിസ്ഥാനം")}
          </span>
        )}
      {v.note && (
        <p class="mt-2 text-[11px] leading-snug text-base-content/55">
          {v.note}
        </p>
      )}
    </div>
  );
}
