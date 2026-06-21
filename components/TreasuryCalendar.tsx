import type { Lang } from "../data/lang.ts";
import { t } from "../data/lang.ts";
import type { TreasuryYear } from "../data/types.ts";

/**
 * Waffle calendar of one year's treasury liquidity — server-rendered, no island.
 *
 * Each square is one day of the year, coloured by the deepest RBI-support tier
 * the treasury reached that day: within-means (green), Ways & Means Advances
 * (amber), or Overdraft (red). The day-by-day sequence is NOT published, so the
 * squares are grouped by bucket and read as a part-to-whole (a waffle), never as
 * a timeline — the footnote says so explicitly. This zooms the year-by-year WMA
 * histogram into a single visceral picture: how much of the year ran on
 * borrowed cash.
 */

const TOTAL = 365;

export function TreasuryCalendar(
  { ty, lang }: { ty: TreasuryYear; lang: Lang },
) {
  const od = Math.max(0, Math.round(ty.overdraftDays));
  const wma = Math.max(0, Math.round(ty.wmaDays));
  const normal = ty.normalDays ?? Math.max(0, TOTAL - od - wma);
  const supported = od + wma;

  // Worst tier first, so severity reads left-to-right across the waffle.
  const cells: Array<"od" | "wma" | "normal"> = [
    ...Array(od).fill("od" as const),
    ...Array(wma).fill("wma" as const),
    ...Array(normal).fill("normal" as const),
  ];
  const FILL: Record<"od" | "wma" | "normal", string> = {
    od: "bg-error",
    wma: "bg-warning",
    normal: "bg-success",
  };

  const legend = [
    {
      cls: "bg-error",
      n: od,
      en: "Overdraft",
      ml: "ഓവർഡ്രാഫ്റ്റ്",
    },
    {
      cls: "bg-warning",
      n: wma,
      en: "Ways & Means Advances",
      ml: "വേയ്സ് & മീൻസ് അഡ്വാൻസ്",
    },
    {
      cls: "bg-success",
      n: normal,
      en: "Within means",
      ml: "സ്വന്തം പണത്തിൽ",
    },
  ];

  const ariaLabel = t(
    lang,
    `In ${ty.year}, the treasury was on RBI support ${supported} of 365 days: ${wma} on Ways & Means Advances and ${od} in Overdraft.`,
    `${ty.year}-ൽ 365-ൽ ${supported} ദിവസവും ഖജനാവ് ആർബിഐ പിന്തുണയിലായിരുന്നു.`,
  );

  return (
    <div class="surface-card p-5">
      <p class="eyebrow mb-1">
        {t(lang, "The treasury's year", "ഖജനാവിന്റെ വർഷം")}
      </p>
      <p class={`font-semibold leading-snug ${lang === "ml" ? "ml" : ""}`}>
        {t(
          lang,
          `In ${ty.year}, the treasury ran on borrowed cash for `,
          `${ty.year}-ൽ ഖജനാവ് കടമെടുത്ത പണത്തിൽ പ്രവർത്തിച്ചത് `,
        )}
        <span class="text-error">
          {t(
            lang,
            `${supported} of 365 days`,
            `365-ൽ ${supported} ദിവസം`,
          )}
        </span>
        {lang === "ml" ? " ആണ്." : "."}
      </p>

      <div
        class="mt-4 grid gap-[2.5px]"
        style="grid-template-columns: repeat(21, minmax(0, 1fr));"
        role="img"
        aria-label={ariaLabel}
      >
        {cells.map((c, i) => (
          <span
            key={i}
            class={`aspect-square rounded-[1.5px] ${FILL[c]} opacity-90`}
          >
          </span>
        ))}
      </div>

      <div class="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-base-content/75">
        {legend.map((l) => (
          <span key={l.en} class="flex items-center gap-1.5">
            <span class={`status-dot ${l.cls}`}></span>
            <span class={lang === "ml" ? "ml" : ""}>{t(lang, l.en, l.ml)}</span>
            <span class="font-semibold tabular-nums">
              · {l.n} {t(lang, "days", "ദിവസം")}
            </span>
          </span>
        ))}
      </div>

      {ty.normDays !== undefined && (
        <p class="mt-2 text-xs text-base-content/60">
          {t(
            lang,
            `For comparison, a normal year sees about ${ty.normDays} such days.`,
            `സാധാരണ വർഷത്തിൽ ഇത്തരം ${ty.normDays} ദിവസമേ ഉണ്ടാകാറുള്ളൂ.`,
          )}
        </p>
      )}

      <p class="mt-3 text-[10px] leading-snug text-base-content/45">
        {t(
          lang,
          `Each square is one day in ${ty.year}; squares show the year's totals, not the calendar order — the day-by-day sequence is not published.`,
          `ഓരോ ചതുരവും ${ty.year}-ലെ ഒരു ദിവസമാണ്; ചതുരങ്ങൾ വർഷത്തെ ആകെത്തുകയാണ് കാണിക്കുന്നത്, തീയതിക്രമമല്ല — ദിവസംതോറുമുള്ള ക്രമം പ്രസിദ്ധീകരിച്ചിട്ടില്ല.`,
        )}
      </p>
      <p class="mt-1 text-[10px] text-base-content/45">
        {t(lang, "Source", "ഉറവിടം")}: {ty.sourceUrl
          ? (
            <a
              href={ty.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="link"
            >
              {ty.source}
            </a>
          )
          : ty.source}
      </p>
    </div>
  );
}
