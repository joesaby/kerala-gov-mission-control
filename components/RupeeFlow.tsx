import type { Lang } from "../data/lang.ts";
import { t } from "../data/lang.ts";
import type { FiscalSeverity, RupeeSegment } from "../data/types.ts";

/**
 * "Where every ₹100 of revenue goes" — a part-to-whole bar, server-rendered.
 *
 * Committed segments (salary / pension / interest) are grouped to the left and a
 * bracket caption sums them ("₹77 already spoken for"), so the reader feels how
 * little discretion remains before a single new scheme is funded. Each segment
 * carries a `<title>` with its exact source for hover provenance.
 */

const FILL: Record<FiscalSeverity, string> = {
  critical: "bg-error",
  warning: "bg-warning",
  ok: "bg-success",
};
const DOT: Record<FiscalSeverity, string> = {
  critical: "bg-error",
  warning: "bg-warning",
  ok: "bg-success",
};

function pick(lang: Lang, en: string, ml?: string): string {
  return lang === "ml" && ml ? ml : en;
}

/**
 * Largest-remainder (Hamilton) rounding: round each value to a whole rupee so
 * the displayed chips still sum to the rounded total (e.g. exactly ₹100), and
 * committed sub-totals stay self-consistent. Naive per-chip Math.round drifts
 * (33.6+22.5+20.9+23.0 → 34+23+21+23 = 101); this gives 34+22+21+23 = 100.
 */
function hamiltonRound(values: number[]): number[] {
  const targetTotal = Math.round(values.reduce((a, b) => a + b, 0));
  const floors = values.map((v) => Math.floor(v));
  let remainder = targetTotal - floors.reduce((a, b) => a + b, 0);
  const order = values
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    out[order[k].i] += 1;
  }
  return out;
}

export function RupeeFlow(
  { segments, lang }: { segments: RupeeSegment[]; lang: Lang },
) {
  const total = segments.reduce((s, x) => s + x.paise, 0) || 100;
  const rounded = hamiltonRound(segments.map((s) => s.paise));
  const committed = segments.reduce(
    (sum, s, i) => sum + (s.committed ? rounded[i] : 0),
    0,
  );

  return (
    <div class="surface-card p-5">
      <p class="eyebrow mb-1">
        {t(
          lang,
          "Where each ₹100 of revenue goes",
          "ഓരോ ₹100 വരുമാനവും എങ്ങോട്ട്",
        )}
      </p>
      <p class="mb-3 text-sm text-base-content/70">
        {t(
          lang,
          `₹${committed} of every ₹100 is already spoken for — salaries, pensions and interest — before a single new road or scheme.`,
          `ഓരോ ₹100-ലും ₹${committed} മുൻകൂട്ടി നീക്കിവെച്ചതാണ് — ശമ്പളം, പെൻഷൻ, പലിശ — ഒരു പുതിയ റോഡോ പദ്ധതിയോ വരുന്നതിന് മുമ്പേ.`,
        )}
      </p>

      <div class="flex h-9 w-full overflow-hidden rounded-field text-[11px] font-semibold text-white">
        {segments.map((s, i) => (
          <div
            key={s.key}
            class={`${
              FILL[s.severity]
            } flex items-center justify-center min-w-0`}
            style={`width:${(s.paise / total) * 100}%`}
          >
            <title>
              {`${pick(lang, s.label, s.labelMl)} — ₹${rounded[i]}${
                s.source ? ` (${s.source})` : ""
              }`}
            </title>
            ₹{rounded[i]}
          </div>
        ))}
      </div>

      <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-base-content/70">
        {segments.map((s, i) => (
          <span key={s.key} class="flex items-center gap-1.5">
            <span class={`status-dot ${DOT[s.severity]}`}></span>
            <span class={lang === "ml" ? "ml" : ""}>
              {pick(lang, s.label, s.labelMl)}
            </span>
            <span class="font-semibold tabular-nums">
              · ₹{rounded[i]}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
