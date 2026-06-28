import type { Lang } from "../data/lang.ts";
import { t } from "../data/lang.ts";
import type { TimelineEvent } from "../lib/kpi-timeline.ts";
import { ConfidenceBadge } from "./ConfidenceBadge.tsx";

const KIND_STYLE: Record<
  TimelineEvent["kind"],
  { chip: string; dot: string }
> = {
  data: {
    chip: "badge-neutral/10 text-base-content/70 border-base-300",
    dot: "bg-neutral",
  },
  "promise-action": {
    chip: "badge-accent/15 text-accent-content border-accent/25",
    dot: "bg-accent",
  },
  "dept-order": {
    chip: "badge-ghost text-base-content/50 border-base-300",
    dot: "bg-base-content/30",
  },
};

function fmtDate(iso: string, lang: Lang): string {
  if (/^\d{4}$/.test(iso)) return iso;
  return new Date(iso).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/** Vertical timeline for KPI policy + data events. */
export function EventTimeline(
  { events, lang }: { events: TimelineEvent[]; lang: Lang },
) {
  if (events.length === 0) {
    return (
      <p class="text-sm text-base-content/60">
        {t(
          lang,
          "No linked policy actions or history points yet.",
          "ബന്ധപ്പെട്ട നയ നടപടികളോ ചരിത്ര പോയിന്റുകളോ ഇതുവരെയില്ല.",
        )}
      </p>
    );
  }

  return (
    <ol class="relative border-s border-base-300 ms-3 flex flex-col gap-4">
      {events.map((ev) => {
        const style = KIND_STYLE[ev.kind];
        return (
          <li key={ev.id} class="ms-4">
            <span
              class={`absolute -start-1.5 mt-1.5 w-3 h-3 rounded-full border-2 border-base-100 ${style.dot}`}
              aria-hidden="true"
            />
            <div class="flex flex-wrap items-center gap-2 mb-0.5">
              <time
                class="text-xs tabular-nums text-base-content/50"
                dateTime={ev.date}
              >
                {fmtDate(ev.date, lang)}
              </time>
              <span class={`badge badge-xs badge-outline ${style.chip}`}>
                {lang === "ml" ? ev.kindLabelMl : ev.kindLabel}
              </span>
              <ConfidenceBadge confidence={ev.confidence} lang={lang} />
            </div>
            {ev.href
              ? (
                <a href={ev.href} class="link link-hover font-medium text-sm">
                  {ev.title}
                </a>
              )
              : <p class="font-medium text-sm">{ev.title}</p>}
            {ev.valueLabel && (
              <p class="text-sm tabular-nums text-base-content/70 mt-0.5">
                {ev.valueLabel}
              </p>
            )}
            {ev.goalHint && (
              <p class="text-xs text-base-content/50 mt-0.5">
                {t(lang, "Promise", "വാഗ്ദാനം")}:{" "}
                {lang === "ml" && ev.goalHintMl ? ev.goalHintMl : ev.goalHint}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
