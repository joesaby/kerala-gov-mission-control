import { useMemo, useState } from "preact/hooks";
import { MinisterAvatar } from "../components/MinisterAvatar.tsx";

/** Branch/role bucket a person is filed under in the directory. */
export type PersonCategory =
  | "cabinet"
  | "assembly"
  | "bureaucracy"
  | "judiciary"
  | "boards";

/**
 * Flat, serializable per-person summary built server-side and rendered by the
 * directory. Lean on purpose — it ships to the client as island props.
 */
export interface PersonSummary {
  slug: string;
  name: string;
  nameMl?: string;
  photoUrl?: string;
  /** Most significant role label (English / Malayalam). */
  roleEn: string;
  roleMl: string;
  /** Context line under the role — portfolio, office, constituency. */
  subEn?: string;
  subMl?: string;
  /** Denormalized party abbreviation, when known. */
  party?: string;
  category: PersonCategory;
  /** True when any tenure is still open (termEnd undefined). */
  isCurrent: boolean;
  /** Lower = more senior; orders rows within a group. */
  seniority: number;
}

interface Props {
  summaries: PersonSummary[];
  lang: "en" | "ml";
}

function t(lang: "en" | "ml", en: string, ml: string): string {
  return lang === "ml" ? ml : en;
}

const CATEGORY_ORDER: PersonCategory[] = [
  "cabinet",
  "assembly",
  "bureaucracy",
  "judiciary",
  "boards",
];

const CATEGORY: Record<
  PersonCategory,
  { en: string; ml: string; chip: string }
> = {
  cabinet: { en: "Cabinet", ml: "മന്ത്രിസഭ", chip: "badge-primary" },
  assembly: { en: "Assembly", ml: "നിയമസഭ", chip: "badge-accent" },
  bureaucracy: {
    en: "Bureaucracy",
    ml: "ഉദ്യോഗസ്ഥതലം",
    chip: "badge-secondary",
  },
  judiciary: { en: "Judiciary", ml: "നീതിന്യായം", chip: "badge-info" },
  boards: { en: "Boards & bodies", ml: "ബോർഡുകൾ", chip: "badge-ghost" },
};

/** Section heading shown for the non-serving group of a category. */
function sectionLabel(c: PersonCategory, lang: "en" | "ml"): string {
  const base = lang === "ml" ? CATEGORY[c].ml : CATEGORY[c].en;
  // Cabinet's serving members sit in "In office now", so flag the rest.
  if (c === "cabinet") return t(lang, `${base} — former`, `${base} — മുൻ`);
  return base;
}

export default function PeopleDirectory({ summaries, lang }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PersonCategory | "all">("all");
  const [inOfficeOnly, setInOfficeOnly] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const displayName = (p: PersonSummary) =>
    lang === "ml" && p.nameMl ? p.nameMl : p.name;

  // Stable secondary sort key: serving first, then seniority, then name.
  const ordered = useMemo(
    () =>
      [...summaries].sort((a, b) => {
        if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
        if (a.seniority !== b.seniority) return a.seniority - b.seniority;
        return displayName(a).localeCompare(displayName(b));
      }),
    [summaries, lang],
  );

  // Per-category counts for the facet chips (serving + former).
  const counts = useMemo(() => {
    const m = new Map<PersonCategory, number>();
    for (const p of summaries) m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return m;
  }, [summaries]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() =>
    ordered.filter((p) => {
      if (inOfficeOnly && !p.isCurrent) return false;
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      const hay = [
        p.name,
        p.nameMl ?? "",
        p.roleEn,
        p.roleMl,
        p.subEn ?? "",
        p.subMl ?? "",
        p.party ?? "",
      ].join(" ").toLowerCase();
      return hay.includes(q);
    }), [ordered, q, category, inOfficeOnly]);

  const searchActive = q !== "" || category !== "all" || inOfficeOnly;

  // Default view groups: "In office now" then each category's non-serving rest.
  const groups = useMemo(() => {
    const current = filtered.filter((p) => p.isCurrent);
    const sections = CATEGORY_ORDER
      .map((c) =>
        [c, filtered.filter((p) => !p.isCurrent && p.category === c)] as const
      )
      .filter(([, rows]) => rows.length > 0);
    return { current, sections };
  }, [filtered]);

  const isOpen = (key: string, idx: number) => {
    const toggled = collapsed.has(key);
    return idx === 0 ? !toggled : toggled;
  };
  const toggle = (key: string) => {
    const next = new Set(collapsed);
    next.has(key) ? next.delete(key) : next.add(key);
    setCollapsed(next);
  };

  const Row = ({ p }: { p: PersonSummary }) => {
    const role = lang === "ml" ? p.roleMl : p.roleEn;
    const sub = lang === "ml" ? p.subMl : p.subEn;
    const cat = CATEGORY[p.category];
    return (
      <a
        href={`/gov/people/${p.slug}`}
        class="surface-link flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-base-200/40 transition"
      >
        <MinisterAvatar
          minister={{ name: p.name, photoUrl: p.photoUrl }}
          size={44}
          class="shrink-0"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-2 flex-wrap">
            <span class={`font-semibold truncate ${lang === "ml" ? "ml" : ""}`}>
              {displayName(p)}
            </span>
            {p.isCurrent && (
              <span class="badge badge-xs badge-success badge-outline gap-1 shrink-0">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-success" />
                {t(lang, "In office", "പദവിയിൽ")}
              </span>
            )}
          </div>
          <div
            class={`text-xs text-base-content/60 truncate ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            <span class="font-medium">{role}</span>
            {sub && <span class="text-base-content/45">{` · ${sub}`}</span>}
          </div>
        </div>
        {p.party && (
          <span class="shrink-0 badge badge-sm badge-ghost font-medium hidden sm:inline-flex">
            {p.party}
          </span>
        )}
        <span class={`shrink-0 badge badge-xs ${cat.chip}`}>
          {lang === "ml" ? cat.ml : cat.en}
        </span>
      </a>
    );
  };

  return (
    <div>
      {/* Controls */}
      <div class="sticky top-0 z-10 bg-base-100/95 backdrop-blur -mx-1 px-1 py-2 rounded-lg">
        <div class="flex flex-wrap items-center gap-2">
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
                "Search name, role, party…",
                "പേര്, പദവി, പാർട്ടി…",
              )}
              class="input input-sm input-bordered w-full pl-9"
            />
          </label>

          <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={inOfficeOnly}
              onChange={(e) =>
                setInOfficeOnly((e.target as HTMLInputElement).checked)}
              class="checkbox checkbox-sm checkbox-success"
            />
            {t(lang, "In office now", "ഇപ്പോൾ പദവിയിൽ")}
          </label>

          <span class="text-xs text-base-content/50 tabular-nums whitespace-nowrap">
            {filtered.length}
            {filtered.length !== summaries.length
              ? ` / ${summaries.length}`
              : ""} {t(lang, "people", "വ്യക്തികൾ")}
          </span>
        </div>

        {/* Category facet chips */}
        <div class="flex flex-wrap gap-1.5 mt-2">
          <button
            type="button"
            onClick={() => setCategory("all")}
            class={`btn btn-xs ${
              category === "all" ? "btn-primary" : "btn-ghost border-base-300"
            }`}
          >
            {t(lang, "All", "എല്ലാം")}
            <span class="opacity-60 tabular-nums">{summaries.length}</span>
          </button>
          {CATEGORY_ORDER.filter((c) => counts.has(c)).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              class={`btn btn-xs ${
                category === c ? "btn-primary" : "btn-ghost border-base-300"
              }`}
            >
              {lang === "ml" ? CATEGORY[c].ml : CATEGORY[c].en}
              <span class="opacity-60 tabular-nums">{counts.get(c)}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0
        ? (
          <div class="text-center py-10 mt-4 text-sm text-base-content/50 rounded-box border border-dashed border-base-300">
            {t(
              lang,
              "No people match your filters.",
              "ഫിൽട്ടറുകൾക്ക് ചേരുന്ന വ്യക്തികളില്ല.",
            )}
          </div>
        )
        : searchActive
        ? (
          // Flat, ranked result list when any filter/search is active.
          <ul class="mt-3 rounded-box border border-base-300 divide-y divide-base-200 overflow-hidden">
            {filtered.map((p) => (
              <li key={p.slug}>
                <Row p={p} />
              </li>
            ))}
          </ul>
        )
        : (
          // Default: "In office now" first, then collapsible category sections.
          <div class="mt-3 flex flex-col gap-3">
            {groups.current.length > 0 && (
              <section class="rounded-box border border-base-300 overflow-hidden">
                <div class="flex items-center justify-between px-4 py-2 bg-success/10">
                  <span class="font-display font-semibold text-sm flex items-center gap-2">
                    <span class="inline-block w-2 h-2 rounded-full bg-success" />
                    {t(lang, "In office now", "ഇപ്പോൾ പദവിയിൽ")}
                  </span>
                  <span class="text-xs text-base-content/40 tabular-nums">
                    {groups.current.length}
                  </span>
                </div>
                <ul class="divide-y divide-base-200">
                  {groups.current.map((p) => (
                    <li key={p.slug}>
                      <Row p={p} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {groups.sections.map(([c, rows], idx) => {
              const open = isOpen(c, idx);
              return (
                <section
                  key={c}
                  class="rounded-box border border-base-300 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggle(c)}
                    class="w-full flex items-center justify-between px-4 py-2 bg-base-200/60 hover:bg-base-200 transition text-left"
                  >
                    <span class="font-display font-semibold text-sm flex items-center gap-2">
                      <span class="inline-block w-4 text-base-content/40">
                        {open ? "▾" : "▸"}
                      </span>
                      <span class={`badge badge-xs ${CATEGORY[c].chip}`}>
                        {sectionLabel(c, lang)}
                      </span>
                    </span>
                    <span class="text-xs text-base-content/40 tabular-nums">
                      {rows.length}
                    </span>
                  </button>
                  {open && (
                    <ul class="divide-y divide-base-200">
                      {rows.map((p) => (
                        <li key={p.slug}>
                          <Row p={p} />
                        </li>
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
