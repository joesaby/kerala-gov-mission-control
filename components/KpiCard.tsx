import type { CivicDomain, Department, Kpi } from "../data/types.ts";
import { StatusBadge } from "./StatusBadge.tsx";
import { TrendArrow } from "./TrendArrow.tsx";

const DOMAIN_LABEL: Record<CivicDomain, string> = {
  fiscal: "Fiscal",
  health: "Health",
  education: "Education",
  livelihood: "Livelihood",
  safety: "Safety",
  transport: "Transport",
  environment: "Environment",
  sustainability: "Sustainability",
  trust: "Trust",
  delivery: "Delivery",
  other: "Other",
};

function formatNumber(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) >= 100) {
    return n.toLocaleString("en-IN");
  }
  return n.toFixed(n < 10 ? 1 : 1);
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
  lang: "en" | "ml";
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

  return (
    <article class="kpi-tile">
      <div class="card-body p-5 gap-3">
        <header class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-[11px] uppercase tracking-wider text-base-content/60 font-medium">
              {DOMAIN_LABEL[kpi.domain]}
            </p>
            <h3
              class={`text-base font-semibold leading-tight mt-0.5 ${
                lang === "ml" ? "ml" : ""
              }`}
            >
              {title}
            </h3>
          </div>
          <StatusBadge status={kpi.status} />
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

        {kpi.target !== undefined && (
          <div class="text-xs text-base-content/70">
            Target:{" "}
            <span class="font-medium tabular-nums">
              {formatNumber(kpi.target)} {kpi.unit}
            </span>
          </div>
        )}

        <ul class="text-xs text-base-content/60 space-y-0.5 mt-1">
          {kpi.comparators.map((c) => (
            <li class="flex justify-between gap-3">
              <span>{c.label}</span>
              <span class="tabular-nums font-medium text-base-content/80">
                {formatNumber(c.value)} {kpi.unit}
              </span>
            </li>
          ))}
        </ul>

        <details class="text-xs mt-1 group">
          <summary class="cursor-pointer text-base-content/60 hover:text-base-content list-none flex items-center gap-1">
            <span class="group-open:rotate-90 transition-transform inline-block">
              ›
            </span>
            About this metric
          </summary>
          <div class="mt-2 space-y-1.5 pl-3 border-l-2 border-base-300 text-base-content/70">
            <p class={lang === "ml" ? "ml" : ""}>{definition}</p>
            <dl class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
              <dt class="text-base-content/50">Source</dt>
              <dd>{kpi.meta.source}</dd>
              <dt class="text-base-content/50">Owner</dt>
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
              <dt class="text-base-content/50">Updated</dt>
              <dd class="capitalize">{kpi.meta.updateFrequency}</dd>
              <dt class="text-base-content/50">Last refresh</dt>
              <dd class="tabular-nums">
                {formatRefreshed(kpi.meta.lastRefreshed)} IST
              </dd>
            </dl>
            <a
              href={`/kpi/${kpi.id}`}
              class="link link-primary text-xs inline-block mt-1"
            >
              Open KPI page →
            </a>
          </div>
        </details>
      </div>
    </article>
  );
}
