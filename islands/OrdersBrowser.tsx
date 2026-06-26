import { useMemo, useState } from "preact/hooks";
import type { GovernmentOrder } from "../data/types.ts";

/** Minimal department shape the browser needs (kept serializable). */
export interface DeptLite {
  id: string;
  name: string;
  nameMl?: string;
  slug: string;
}

interface Props {
  orders: GovernmentOrder[];
  depts: DeptLite[];
  lang: "en" | "ml";
  /** Hide the type dropdown — for mono-type lanes (e.g. Cabinet decisions). */
  hideTypeFilter?: boolean;
  /** Hide the department dropdown — for single-department pages. */
  hideDeptFilter?: boolean;
  /** Hide the per-row department link — redundant on a single-department page. */
  hideDeptColumn?: boolean;
  /** Noun used in the result count (defaults to "orders"). */
  unit?: { en: string; ml: string };
}

const TYPE_LABEL: Record<string, { en: string; ml: string; class: string }> = {
  P: { en: "Policy", ml: "നയം", class: "badge-primary" },
  Ms: { en: "Memo", ml: "മെമ്മോ", class: "badge-secondary" },
  Rt: { en: "Routine", ml: "സാധാരണ", class: "badge-accent" },
  SRO: { en: "SRO", ml: "എസ്.ആർ.ഒ.", class: "badge-warning" },
  Circular: { en: "Circular", ml: "സർക്കുലർ", class: "badge-info" },
  Bill: { en: "Bill", ml: "ബിൽ", class: "badge-error" },
  Cabinet: { en: "Cabinet", ml: "മന്ത്രിസഭ", class: "badge-neutral" },
};

function t(lang: "en" | "ml", en: string, ml: string): string {
  return lang === "ml" ? ml : en;
}

export default function OrdersBrowser(
  {
    orders,
    depts,
    lang,
    hideTypeFilter = false,
    hideDeptFilter = false,
    hideDeptColumn = false,
    unit = { en: "orders", ml: "ഉത്തരവുകൾ" },
  }: Props,
) {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");
  const [type, setType] = useState("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const deptMap = useMemo(
    () => new Map(depts.map((d) => [d.id, d])),
    [depts],
  );

  // Department + type options actually present in the data.
  const deptOptions = useMemo(() => {
    const ids = new Set(orders.map((o) => o.deptId).filter(Boolean));
    return depts
      .filter((d) => ids.has(d.id))
      .sort((a, b) =>
        (lang === "ml" && a.nameMl ? a.nameMl : a.name).localeCompare(
          lang === "ml" && b.nameMl ? b.nameMl : b.name,
        )
      );
  }, [orders, depts, lang]);

  const typeOptions = useMemo(() => {
    const present = new Set(orders.map((o) => o.type));
    return Object.keys(TYPE_LABEL).filter((k) => present.has(k as never));
  }, [orders]);

  const deptName = (o: GovernmentOrder) => {
    const d = o.deptId ? deptMap.get(o.deptId) : undefined;
    if (!d) return null;
    return lang === "ml" && d.nameMl ? d.nameMl : d.name;
  };

  // Filter.
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (dept !== "all" && o.deptId !== dept) return false;
      if (dept === "untagged" && o.deptId) return false;
      if (type !== "all" && o.type !== type) return false;
      if (!q) return true;
      const hay = [
        o.goNumber,
        o.subject,
        o.subjectMl ?? "",
        deptName(o) ?? "",
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [orders, dept, type, q]);

  // Group by month (newest first; orders already arrive newest-first).
  const groups = useMemo(() => {
    const map = new Map<string, GovernmentOrder[]>();
    for (const o of filtered) {
      const key = o.date.slice(0, 7); // YYYY-MM
      (map.get(key) ?? map.set(key, []).get(key)!).push(o);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const monthLabel = (key: string) =>
    new Date(`${key}-01T00:00:00+05:30`).toLocaleDateString(
      lang === "ml" ? "ml-IN" : "en-IN",
      { month: "long", year: "numeric", timeZone: "Asia/Kolkata" },
    );

  // First group is open by default; others closed. Toggling a header flips its
  // membership in the set. An active search/filter forces every group open.
  const searchActive = q !== "" || dept !== "all" || type !== "all";
  const open = (key: string, idx: number) => {
    if (searchActive) return true;
    const toggled = collapsed.has(key);
    return idx === 0 ? !toggled : toggled;
  };

  const toggle = (key: string) => {
    const next = new Set(collapsed);
    next.has(key) ? next.delete(key) : next.add(key);
    setCollapsed(next);
  };

  return (
    <div>
      {/* Controls */}
      <div class="flex flex-wrap items-center gap-2 mb-4 sticky top-0 z-10 bg-base-100/95 backdrop-blur py-2 -mx-1 px-1 rounded-lg">
        <label class="relative flex-1 min-w-[12rem]">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40">
            🔍
          </span>
          <input
            type="search"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder={t(
              lang,
              "Search subject, GO number, department…",
              "വിഷയം, ഉത്തരവ് നമ്പർ, വകുപ്പ്…",
            )}
            class="input input-sm input-bordered w-full pl-9"
          />
        </label>

        {!hideDeptFilter && (
          <select
            value={dept}
            onChange={(e) => setDept((e.target as HTMLSelectElement).value)}
            class="select select-sm select-bordered max-w-[12rem]"
          >
            <option value="all">
              {t(lang, "All departments", "എല്ലാ വകുപ്പുകൾ")}
            </option>
            {deptOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {lang === "ml" && d.nameMl ? d.nameMl : d.name}
              </option>
            ))}
            <option value="untagged">
              {t(lang, "Untagged", "ടാഗ് ഇല്ലാത്തവ")}
            </option>
          </select>
        )}

        {!hideTypeFilter && (
          <select
            value={type}
            onChange={(e) => setType((e.target as HTMLSelectElement).value)}
            class="select select-sm select-bordered"
          >
            <option value="all">{t(lang, "All types", "എല്ലാ തരം")}</option>
            {typeOptions.map((k) => (
              <option key={k} value={k}>
                {lang === "ml" ? TYPE_LABEL[k].ml : TYPE_LABEL[k].en}
              </option>
            ))}
          </select>
        )}

        <span class="text-xs text-base-content/50 tabular-nums whitespace-nowrap">
          {filtered.length}
          {filtered.length !== orders.length ? ` / ${orders.length}` : ""}{" "}
          {lang === "ml" ? unit.ml : unit.en}
        </span>
      </div>

      {filtered.length === 0
        ? (
          <div class="text-center py-10 text-sm text-base-content/50 rounded-box border border-dashed border-base-300">
            {t(
              lang,
              "No orders match your filters.",
              "ഫിൽട്ടറുകൾക്ക് ചേരുന്ന ഉത്തരവുകളില്ല.",
            )}
          </div>
        )
        : (
          <div class="flex flex-col gap-2">
            {groups.map(([key, rows], idx) => {
              const isOpen = open(key, idx);
              return (
                <section
                  key={key}
                  class="rounded-box border border-base-300 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    class="w-full flex items-center justify-between px-4 py-2 bg-base-200/60 hover:bg-base-200 transition text-left"
                  >
                    <span class="font-display font-semibold text-sm">
                      <span class="inline-block w-4 text-base-content/40">
                        {isOpen ? "▾" : "▸"}
                      </span>
                      {monthLabel(key)}
                    </span>
                    <span class="text-xs text-base-content/40 tabular-nums">
                      {rows.length}
                    </span>
                  </button>

                  {isOpen && (
                    <ul class="divide-y divide-base-200">
                      {rows.map((o) => (
                        <OrderRow
                          key={o.id}
                          o={o}
                          deptName={hideDeptColumn ? null : deptName(o)}
                          deptSlug={hideDeptColumn || !o.deptId
                            ? undefined
                            : deptMap.get(o.deptId)?.slug}
                          lang={lang}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
    </div>
  );
}

function OrderRow(
  { o, deptName, deptSlug, lang }: {
    o: GovernmentOrder;
    deptName: string | null;
    deptSlug?: string;
    lang: "en" | "ml";
  },
) {
  const ti = TYPE_LABEL[o.type] ??
    { en: o.type, ml: o.type, class: "badge-ghost" };
  const subject = lang === "ml" && o.subjectMl ? o.subjectMl : o.subject;
  const day = new Date(o.date).toLocaleDateString(
    lang === "ml" ? "ml-IN" : "en-IN",
    { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" },
  );
  return (
    <li class="flex items-center gap-3 px-3 sm:px-4 py-2 hover:bg-base-200/40 transition text-sm">
      <time class="shrink-0 w-14 text-xs text-base-content/60 tabular-nums">
        {day}
      </time>
      <span
        class={`shrink-0 badge badge-xs ${ti.class} font-medium hidden sm:inline-flex`}
      >
        {lang === "ml" ? ti.ml : ti.en}
      </span>
      <span class="shrink-0 hidden md:inline text-[11px] text-base-content/50 tabular-nums w-40 truncate">
        {o.goNumber}
      </span>
      {o.deptConfidence === "low" && (
        <span
          class="shrink-0 text-warning text-xs leading-none"
          title={t(
            lang,
            "Low-confidence department tag — verify against the source order.",
            "വകുപ്പ് ടാഗ് വിശ്വാസ്യത കുറവ് — ഉറവിട ഉത്തരവുമായി ഒത്തുനോക്കുക.",
          )}
        >
          ⚠
        </span>
      )}
      <a
        href={`/gov/orders/${o.id}`}
        class={`flex-1 min-w-0 truncate font-medium hover:text-primary transition ${
          lang === "ml" ? "ml" : ""
        }`}
        title={subject}
      >
        {subject}
      </a>
      {deptName && deptSlug && (
        <a
          href={`/gov/departments/${deptSlug}`}
          class="shrink-0 hidden lg:inline text-xs text-base-content/50 hover:text-primary truncate max-w-[10rem]"
        >
          {deptName}
        </a>
      )}
      <a
        href={o.meta.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="shrink-0 text-primary hover:text-primary-focus"
        title={t(lang, "View PDF", "രേഖ കാണുക")}
      >
        ↗
      </a>
    </li>
  );
}
