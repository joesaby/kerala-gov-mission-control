import type { Lang } from "../data/lang.ts";
import { ConfidenceBadge } from "./ConfidenceBadge.tsx";

export interface ConnectionItem {
  id: string;
  label: string;
  href?: string;
  badge?: { en: string; ml: string };
  confidence?: string;
  meta?: string;
}

export interface ConnectionGroup {
  id: string;
  label: string;
  labelMl: string;
  href?: string;
  items: ConnectionItem[];
}

/** Grouped link lists — one section per relationship type. */
export function ConnectionGroups(
  { groups, lang }: { groups: ConnectionGroup[]; lang: Lang },
) {
  const visible = groups.filter((g) => g.items.length > 0);
  if (visible.length === 0) return null;

  return (
    <div class="flex flex-col gap-5">
      {visible.map((group) => (
        <div key={group.id}>
          <h3 class="text-[11px] font-semibold uppercase tracking-wider text-base-content/55 mb-2">
            {group.href
              ? (
                <a href={group.href} class="link link-hover">
                  {lang === "ml" ? group.labelMl : group.label}
                </a>
              )
              : (lang === "ml" ? group.labelMl : group.label)}
          </h3>
          <ul class="flex flex-col gap-2">
            {group.items.map((item) => (
              <li
                key={item.id}
                class="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm"
              >
                {item.badge && (
                  <span class="badge badge-sm badge-outline shrink-0">
                    {lang === "ml" ? item.badge.ml : item.badge.en}
                  </span>
                )}
                {item.href
                  ? (
                    <a href={item.href} class="link link-primary">
                      {item.label}
                    </a>
                  )
                  : <span class="text-base-content/80">{item.label}</span>}
                <ConfidenceBadge confidence={item.confidence} lang={lang} />
                {item.meta && (
                  <span class="text-xs text-base-content/50 tabular-nums">
                    {item.meta}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
