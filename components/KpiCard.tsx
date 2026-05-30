import type { CivicDomain, Department, Kpi } from "../data/types.ts";
import type { Lang } from "../data/lang.ts";
import { t } from "../data/lang.ts";
import { StatusBadge } from "./StatusBadge.tsx";
import { TrendArrow } from "./TrendArrow.tsx";

const DOMAIN_META: Record<
  CivicDomain,
  { en: string; ml: string; dot: string }
> = {
  fiscal: { en: "Fiscal", ml: "ധനകാര്യം", dot: "bg-accent" },
  health: { en: "Health", ml: "ആരോഗ്യം", dot: "bg-success" },
  education: { en: "Education", ml: "വിദ്യാഭ്യാസം", dot: "bg-info" },
  livelihood: { en: "Livelihood", ml: "ഉപജീവനം", dot: "bg-secondary" },
  safety: { en: "Safety", ml: "സുരക്ഷ", dot: "bg-error" },
  transport: { en: "Transport", ml: "ഗതാഗതം", dot: "bg-info" },
  environment: { en: "Environment", ml: "പരിസ്ഥിതി", dot: "bg-success" },
  sustainability: { en: "Sustainability", ml: "സുസ്ഥിരത", dot: "bg-success" },
  trust: { en: "Trust", ml: "വിശ്വാസ്യത", dot: "bg-primary" },
  delivery: { en: "Delivery", ml: "സേവനം", dot: "bg-primary" },
  other: { en: "Other", ml: "മറ്റുള്ളവ", dot: "bg-neutral" },
};

function formatNumber(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) >= 100) {
    return n.toLocaleString("en-IN");
  }
  return n.toFixed(1);
}

function formatRefreshed(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

interface KpiCardProps {
  kpi: Kpi;
  lang: Lang;
  /** Owning department, if known. Renders dept chip and link. */
  dept?: Department | null;
}

export function KpiCard({ kpi, lang, dept }: KpiCardProps) {
  const title = lang === "ml" ? kpi.titleMl : kpi.title;
  const definition = lang === "ml" && kpi.meta.definitionMl
    ? kpi.meta.definitionMl
    : kpi.meta.definition;
  const deptName = dept
    ? (lang === "ml" ? dept.nameMl ?? dept.name : dept.name)
    : null;
  const domain = DOMAIN_META[kpi.domain];

  // Surface one headline comparator inline; the rest go behind "Compare".
  const [headline, ...moreComparators] = kpi.comparators;

  return (
    <article class="kpi-tile">
      <div class="card-body p-5 gap-3">
        <header class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p
              class={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-base-content/55 ${
                lang === "ml" ? "ml" : ""
              }`}
            >
              <span class={`status-dot ${domain.dot}`} aria-hidden="true" />
              {lang === "ml" ? domain.ml : domain.en}
            </p>
            <h3
              class={`text-base font-semibold leading-tight mt-1 ${
                lang === "ml" ? "ml" : ""
              }`}
            >
              {title}
            </h3>
          </div>
          <StatusBadge status={kpi.status} lang={lang} />
        </header>

        <div class="flex items-baseline gap-2 flex-wrap">
          <span class="metric-value">{formatNumber(kpi.value)}</span>
          <span class="text-sm text-base-content/60 font-medium">
            {kpi.unit}
          </span>
        </div>

        <TrendArrow
          trend={kpi.trend}
          delta={kpi.trendDelta}
          unit={kpi.unit}
          direction={kpi.direction}
          window={kpi.trendWindow}
        />

        {/* Goal + headline comparison, in plain language. */}
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-base-content/70">
          {kpi.target !== undefined && (
            <span>
              {t(lang, "Goal", "ലക്ഷ്യം")}:{" "}
              <span class="font-semibold tabular-nums text-base-content">
                {formatNumber(kpi.target)} {kpi.unit}
              </span>
            </span>
          )}
          {headline && (
            <span>
              {headline.label}:{" "}
              <span class="font-semibold tabular-nums text-base-content">
                {formatNumber(headline.value)} {kpi.unit}
              </span>
            </span>
          )}
        </div>

        {/* Progressive disclosure 1 — remaining comparisons. */}
        {moreComparators.length > 0 && (
          <details class="text-xs group">
            <summary class="cursor-pointer text-base-content/60 hover:text-primary list-none flex items-center gap-1 select-none">
              <span class="group-open:rotate-90 transition-transform inline-block">
                ›
              </span>
              {t(lang, "Compare", "താരതമ്യം")}
            </summary>
            <ul class="mt-2 space-y-0.5 pl-3 border-l-2 border-base-300 text-base-content/70">
              {moreComparators.map((c) => (
                <li class="flex justify-between gap-3">
                  <span>{c.label}</span>
                  <span class="tabular-nums font-medium text-base-content/80">
                    {formatNumber(c.value)} {kpi.unit}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Progressive disclosure 2 — definition, source, provenance. */}
        <details class="text-xs group">
          <summary class="cursor-pointer text-base-content/60 hover:text-primary list-none flex items-center gap-1 select-none">
            <span class="group-open:rotate-90 transition-transform inline-block">
              ›
            </span>
            {t(lang, "About this metric", "ഈ സൂചകത്തെക്കുറിച്ച്")}
          </summary>
          <div class="mt-2 space-y-1.5 pl-3 border-l-2 border-base-300 text-base-content/70">
            <p class={lang === "ml" ? "ml" : ""}>{definition}</p>
            <dl class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
              <dt class="text-base-content/50">
                {t(lang, "Source", "ഉറവിടം")}
              </dt>
              <dd>{kpi.meta.source}</dd>
              <dt class="text-base-content/50">
                {t(lang, "Owner", "ഉത്തരവാദി")}
              </dt>
              <dd>
                {dept
                  ? (
                    <a
                      href={`/gov/departments/${dept.slug}`}
                      class="link link-hover"
                    >
                      {deptName}
                    </a>
                  )
                  : kpi.meta.owner}
              </dd>
              <dt class="text-base-content/50">
                {t(lang, "Updated", "പുതുക്കൽ")}
              </dt>
              <dd class="capitalize">{kpi.meta.updateFrequency}</dd>
              <dt class="text-base-content/50">
                {t(lang, "Last refresh", "അവസാന പുതുക്കൽ")}
              </dt>
              <dd class="tabular-nums">
                {formatRefreshed(kpi.meta.lastRefreshed)} IST
              </dd>
            </dl>
            <a
              href={`/kpi/${kpi.id}`}
              class="link link-primary text-xs inline-block mt-1"
            >
              {t(lang, "Open KPI page →", "KPI പേജ് തുറക്കുക →")}
            </a>
          </div>
        </details>
      </div>
    </article>
  );
}
