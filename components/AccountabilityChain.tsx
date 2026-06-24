import type { Lang } from "../data/lang.ts";
import { t } from "../data/lang.ts";

/** One hop in the accountability chain. `href` makes it a link when present. */
export interface ChainLink {
  /** Short type label shown above the value, e.g. "Department". */
  kind: string;
  kindMl: string;
  /** Display value (already language-selected by the caller). */
  label: string;
  href?: string;
}

/**
 * Renders the spec §C "Accountability Chain": a horizontal, bilingual breadcrumb
 * tracing a number back through the people and documents accountable for it,
 * e.g. Source → Finance Dept → Minister → KPI. Built from the knowledge-graph
 * lineage, so it stays in step with the underlying records rather than being
 * hand-written per page. Wraps cleanly on narrow screens.
 */
export function AccountabilityChain(
  { links, lang }: { links: ChainLink[]; lang: Lang },
) {
  return (
    <nav
      aria-label={t(lang, "Accountability chain", "ഉത്തരവാദിത്ത ശൃംഖല")}
      class="flex flex-wrap items-stretch gap-y-2 text-xs"
    >
      {links.map((link, i) => (
        <div key={i} class="flex items-stretch">
          <div class="flex flex-col justify-center rounded-lg border border-base-300 bg-base-100 px-3 py-1.5">
            <span class="text-[10px] uppercase tracking-wider text-base-content/50">
              {lang === "ml" ? link.kindMl : link.kind}
            </span>
            {link.href
              ? (
                <a href={link.href} class="link link-hover font-semibold">
                  {link.label}
                </a>
              )
              : <span class="font-semibold">{link.label}</span>}
          </div>
          {i < links.length - 1 && (
            <span
              aria-hidden="true"
              class="self-center px-1.5 text-base-content/40"
            >
              →
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
