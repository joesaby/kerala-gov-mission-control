import { useMemo, useState } from "preact/hooks";
import type { Appointment, AppointmentBranch } from "../data/types.ts";

/** Minimal department shape the browser needs (kept serializable). */
export interface DeptLite {
  id: string;
  name: string;
  nameMl?: string;
  slug: string;
}

interface Props {
  appointments: Appointment[];
  depts: DeptLite[];
  lang: "en" | "ml";
}

const BRANCH_LABEL: Record<
  AppointmentBranch,
  { en: string; ml: string; class: string }
> = {
  executive: { en: "Executive", ml: "എക്സിക്യൂട്ടീവ്", class: "badge-primary" },
  bureaucratic: {
    en: "Bureaucratic",
    ml: "ഉദ്യോഗസ്ഥതലം",
    class: "badge-secondary",
  },
  judiciary: { en: "Judiciary", ml: "നീതിന്യായം", class: "badge-accent" },
  board: { en: "Boards & bodies", ml: "ബോർഡുകൾ", class: "badge-info" },
};

const ACTION_LABEL: Record<string, { en: string; ml: string }> = {
  "appointment": { en: "Appointment", ml: "നിയമനം" },
  "transfer": { en: "Transfer", ml: "സ്ഥലംമാറ്റം" },
  "promotion": { en: "Promotion", ml: "സ്ഥാനക്കയറ്റം" },
  "additional-charge": { en: "Add'l charge", ml: "അധിക ചുമതല" },
  "extension": { en: "Extension", ml: "നീട്ടൽ" },
  "deputation": { en: "Deputation", ml: "ഡെപ്യൂട്ടേഷൻ" },
  "reinstatement": { en: "Reinstatement", ml: "പുനഃസ്ഥാപനം" },
  "relieved": { en: "Relieved", ml: "ഒഴിവാക്കൽ" },
};

const BRANCH_ORDER: AppointmentBranch[] = [
  "executive",
  "bureaucratic",
  "judiciary",
  "board",
];

function t(lang: "en" | "ml", en: string, ml: string): string {
  return lang === "ml" ? ml : en;
}

export default function AppointmentsBrowser(
  { appointments, depts, lang }: Props,
) {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");
  const [branch, setBranch] = useState("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const deptMap = useMemo(() => new Map(depts.map((d) => [d.id, d])), [depts]);

  const deptOptions = useMemo(() => {
    const ids = new Set(appointments.map((a) => a.deptId).filter(Boolean));
    return depts
      .filter((d) => ids.has(d.id))
      .sort((a, b) =>
        (lang === "ml" && a.nameMl ? a.nameMl : a.name).localeCompare(
          lang === "ml" && b.nameMl ? b.nameMl : b.name,
        )
      );
  }, [appointments, depts, lang]);

  const branchOptions = useMemo(() => {
    const present = new Set(appointments.map((a) => a.branch));
    return BRANCH_ORDER.filter((b) => present.has(b));
  }, [appointments]);

  const deptName = (a: Appointment) => {
    const d = a.deptId ? deptMap.get(a.deptId) : undefined;
    if (!d) return null;
    return lang === "ml" && d.nameMl ? d.nameMl : d.name;
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (dept !== "all" && a.deptId !== dept) return false;
      if (branch !== "all" && a.branch !== branch) return false;
      if (!q) return true;
      const hay = [
        a.appointeeName,
        a.appointeeNameMl ?? "",
        a.office,
        a.officeMl ?? "",
        a.court ?? "",
        deptName(a) ?? "",
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [appointments, dept, branch, q]);

  // Group by branch (in fixed order), each group's rows newest-first.
  const groups = useMemo(() => {
    const map = new Map<AppointmentBranch, Appointment[]>();
    for (const a of filtered) {
      (map.get(a.branch) ?? map.set(a.branch, []).get(a.branch)!).push(a);
    }
    return BRANCH_ORDER
      .filter((b) => map.has(b))
      .map((b) =>
        [
          b,
          map.get(b)!.sort((x, y) => y.termStart.localeCompare(x.termStart)),
        ] as const
      );
  }, [filtered]);

  const searchActive = q !== "" || dept !== "all" || branch !== "all";
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
              "Search name, office, court, department…",
              "പേര്, പദവി, കോടതി, വകുപ്പ്…",
            )}
            class="input input-sm input-bordered w-full pl-9"
          />
        </label>

        <select
          value={branch}
          onChange={(e) => setBranch((e.target as HTMLSelectElement).value)}
          class="select select-sm select-bordered"
        >
          <option value="all">{t(lang, "All branches", "എല്ലാ വിഭാഗം")}</option>
          {branchOptions.map((b) => (
            <option key={b} value={b}>
              {lang === "ml" ? BRANCH_LABEL[b].ml : BRANCH_LABEL[b].en}
            </option>
          ))}
        </select>

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
        </select>

        <span class="text-xs text-base-content/50 tabular-nums whitespace-nowrap">
          {filtered.length}
          {filtered.length !== appointments.length
            ? ` / ${appointments.length}`
            : ""} {t(lang, "appointments", "നിയമനങ്ങൾ")}
        </span>
      </div>

      {filtered.length === 0
        ? (
          <div class="text-center py-10 text-sm text-base-content/50 rounded-box border border-dashed border-base-300">
            {t(
              lang,
              "No appointments match your filters.",
              "ഫിൽട്ടറുകൾക്ക് ചേരുന്ന നിയമനങ്ങളില്ല.",
            )}
          </div>
        )
        : (
          <div class="flex flex-col gap-2">
            {groups.map(([b, rows], idx) => {
              const isOpen = open(b, idx);
              return (
                <section
                  key={b}
                  class="rounded-box border border-base-300 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggle(b)}
                    class="w-full flex items-center justify-between px-4 py-2 bg-base-200/60 hover:bg-base-200 transition text-left"
                  >
                    <span class="font-display font-semibold text-sm flex items-center gap-2">
                      <span class="inline-block w-4 text-base-content/40">
                        {isOpen ? "▾" : "▸"}
                      </span>
                      <span class={`badge badge-xs ${BRANCH_LABEL[b].class}`}>
                        {lang === "ml"
                          ? BRANCH_LABEL[b].ml
                          : BRANCH_LABEL[b].en}
                      </span>
                    </span>
                    <span class="text-xs text-base-content/40 tabular-nums">
                      {rows.length}
                    </span>
                  </button>

                  {isOpen && (
                    <ul class="divide-y divide-base-200">
                      {rows.map((a) => (
                        <AppointmentRow
                          key={a.id}
                          a={a}
                          deptName={deptName(a)}
                          deptSlug={a.deptId
                            ? deptMap.get(a.deptId)?.slug
                            : undefined}
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

function fmtDay(iso: string, lang: "en" | "ml"): string {
  return new Date(iso).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function AppointmentRow(
  { a, deptName, deptSlug, lang }: {
    a: Appointment;
    deptName: string | null;
    deptSlug?: string;
    lang: "en" | "ml";
  },
) {
  const name = lang === "ml" && a.appointeeNameMl
    ? a.appointeeNameMl
    : a.appointeeName;
  const office = lang === "ml" && a.officeMl ? a.officeMl : a.office;
  const court = lang === "ml" && a.courtMl ? a.courtMl : a.court;
  const action = ACTION_LABEL[a.action] ?? { en: a.action, ml: a.action };

  return (
    <li class="flex items-center gap-3 px-3 sm:px-4 py-2 hover:bg-base-200/40 transition text-sm">
      <time class="shrink-0 w-24 text-xs text-base-content/60 tabular-nums hidden sm:block">
        {fmtDay(a.termStart, lang)}
      </time>
      <span class="shrink-0 badge badge-xs badge-ghost font-medium hidden md:inline-flex">
        {lang === "ml" ? action.ml : action.en}
      </span>
      <a
        href={`/gov/appointments/${a.id}`}
        class={`flex-1 min-w-0 truncate font-medium hover:text-primary transition ${
          lang === "ml" ? "ml" : ""
        }`}
        title={`${name} — ${office}`}
      >
        <span class="font-semibold">{name}</span>
        <span class="text-base-content/60">{` — ${office}`}</span>
        {court && <span class="text-base-content/50">{` · ${court}`}</span>}
        {a.personId && (
          <span
            class="ml-1 text-primary"
            title={t(
              lang,
              "Matched to a known person",
              "അറിയപ്പെടുന്ന വ്യക്തിയുമായി ബന്ധിപ്പിച്ചു",
            )}
          >
            ★
          </span>
        )}
        {a.termEnd && (
          <span class="ml-1 text-[11px] text-base-content/40">
            {t(lang, "(ended)", "(അവസാനിച്ചു)")}
          </span>
        )}
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
        href={a.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="shrink-0 text-primary hover:text-primary-focus"
        title={t(lang, "View source GO (PDF)", "ഉറവിട ഉത്തരവ് (PDF)")}
      >
        ↗
      </a>
    </li>
  );
}
