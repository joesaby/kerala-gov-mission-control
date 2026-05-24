import type { Department, GovernmentOrder } from "../data/types.ts";

interface Props {
  orders: GovernmentOrder[];
  depts: Department[];
  lang: "en" | "ml";
  hideDepartment?: boolean;
}

const ORDER_TYPE_LABEL: Record<
  string,
  { en: string; ml: string; class: string }
> = {
  P: { en: "Policy Order", ml: "നയപരമായ ഉത്തരവ്", class: "badge-primary" },
  Ms: { en: "Memo Order", ml: "മെമ്മോറാണ്ടം ഉത്തരവ്", class: "badge-secondary" },
  Rt: { en: "Routine Order", ml: "സാധാരണ ഉത്തരവ്", class: "badge-accent" },
  SRO: {
    en: "SRO",
    ml: "എസ്.ആർ.ഒ.",
    class: "badge-warning text-warning-content",
  },
  Circular: { en: "Circular", ml: "സർക്കുലർ", class: "badge-info" },
  Bill: { en: "Legislative Bill", ml: "നിയമസഭാ ബിൽ", class: "badge-error" },
};

const DEPT_BADGE_CLASS: Record<string, string> = {
  "high": "badge-ghost border-success/40 text-success text-[10px]",
  "medium": "badge-ghost border-warning/40 text-warning text-[10px]",
  "low": "badge-ghost border-error/40 text-error text-[10px]",
};

export function GovernmentOrderList(
  { orders, depts, lang, hideDepartment = false }: Props,
) {
  const deptMap = new Map(depts.map((d) => [d.id, d]));

  if (orders.length === 0) {
    return (
      <div class="text-center py-10 px-4 rounded-xl border border-dashed border-base-300 bg-base-100/50">
        <p class="text-sm text-base-content/50">
          {lang === "ml"
            ? "ഈ വിഭാഗത്തിൽ ഉത്തരവുകളോ തീരുമാനങ്ങളോ നിലവിലില്ല."
            : "No government orders or decisions on record for this category."}
        </p>
      </div>
    );
  }

  return (
    <ul class="flex flex-col gap-4">
      {orders.map((o) => {
        const typeInfo = ORDER_TYPE_LABEL[o.type] ?? {
          en: o.type,
          ml: o.type,
          class: "badge-ghost",
        };
        const dept = o.deptId ? deptMap.get(o.deptId) : null;
        const deptName = dept
          ? (lang === "ml" && dept.nameMl ? dept.nameMl : dept.name)
          : null;

        const displaySubject = lang === "ml" && o.subjectMl
          ? o.subjectMl
          : o.subject;

        return (
          <li
            key={o.id}
            class="card bg-base-100 border border-base-300 hover:border-primary/50 hover:shadow-md transition duration-300"
          >
            <div class="card-body p-4 sm:p-5 gap-3">
              <header class="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div class="flex items-center gap-2">
                  {/* Issue Date */}
                  <time class="font-semibold text-base-content/70 tabular-nums">
                    {new Date(o.date).toLocaleDateString(
                      lang === "ml" ? "ml-IN" : "en-IN",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "Asia/Kolkata",
                      },
                    )}
                  </time>
                  <span class="text-base-content/30">•</span>
                  {/* Order Type Badge */}
                  <span
                    class={`badge ${typeInfo.class} badge-xs font-semibold px-2 py-1 text-[10px]`}
                  >
                    {lang === "ml" ? typeInfo.ml : typeInfo.en}
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  {/* Document Number */}
                  <span class="font-medium text-base-content/60 bg-base-200 px-2 py-0.5 rounded text-[11px] tabular-nums">
                    {o.goNumber}
                  </span>
                </div>
              </header>

              {/* Subject */}
              <div class="flex-1">
                <h3
                  class={`text-sm sm:text-base font-semibold leading-relaxed text-base-content ${
                    lang === "ml" ? "ml" : ""
                  }`}
                >
                  {displaySubject}
                </h3>
              </div>

              <footer class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-base-200">
                {/* Department Info */}
                <div class="flex items-center gap-2">
                  {!hideDepartment && dept && (
                    <a
                      href={`/gov/departments/${dept.slug}`}
                      class="badge badge-sm badge-outline hover:badge-primary transition text-xs font-medium"
                    >
                      {deptName}
                    </a>
                  )}
                  {!hideDepartment && !dept && (
                    <span class="badge badge-sm badge-ghost text-xs italic text-base-content/50">
                      {lang === "ml" ? "വകുപ്പ് ലഭ്യമല്ല" : "Department untagged"}
                    </span>
                  )}
                  {/* Confidence Badge */}
                  {dept && (
                    <span
                      class={`badge badge-xs font-semibold py-1 px-1.5 uppercase ${
                        DEPT_BADGE_CLASS[o.deptConfidence]
                      }`}
                      title={o.deptConfidence === "high"
                        ? "Automatically tagged with high confidence via GO suffix code."
                        : "Tagged with medium confidence via subject keyword matching."}
                    >
                      {lang === "ml" ? "വിശ്വാസ്യത: " : "Tag: "}
                      {o.deptConfidence}
                    </span>
                  )}
                </div>

                {/* Source Verification & Mandatory Tooltip */}
                <div class="flex items-center gap-2">
                  {/* Clickable PDF download button */}
                  <a
                    href={o.meta.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-xs btn-primary gap-1"
                  >
                    <span>{lang === "ml" ? "രേഖ കാണുക ↗" : "View PDF ↗"}</span>
                  </a>

                  {/* Mandatory Tooltip Box */}
                  <div class="dropdown dropdown-end dropdown-hover">
                    <div
                      tabIndex={0}
                      role="button"
                      class="btn btn-ghost btn-circle btn-xs text-base-content/50 hover:text-base-content"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        class="w-4 h-4 stroke-current"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        >
                        </path>
                      </svg>
                    </div>
                    <ul
                      tabIndex={0}
                      class="dropdown-content menu p-3 shadow bg-base-300 border border-base-200 text-base-content rounded-box w-72 text-xs gap-1.5 z-[50]"
                    >
                      <li class="font-bold text-base-content/90 border-b border-base-content/10 pb-1 mb-1">
                        {lang === "ml" ? "ഉറവിട സ്ഥിരീകരണം" : "Source Citations"}
                      </li>
                      <li>
                        <span class="flex flex-col items-start gap-0.5 p-0">
                          <span class="text-base-content/50 uppercase font-semibold text-[10px]">
                            {lang === "ml" ? "പോർട്ടൽ" : "Portal"}
                          </span>
                          <span class="text-base-content font-medium">
                            {o.meta.source}
                          </span>
                        </span>
                      </li>
                      <li>
                        <span class="flex flex-col items-start gap-0.5 p-0">
                          <span class="text-base-content/50 uppercase font-semibold text-[10px]">
                            {lang === "ml" ? "പി.ഡി.എഫ് ലിങ്ക്" : "Direct Link"}
                          </span>
                          <a
                            href={o.meta.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="link link-primary break-all p-0 font-medium text-[11px]"
                          >
                            {o.meta.sourceUrl}
                          </a>
                        </span>
                      </li>
                      <li>
                        <span class="flex flex-col items-start gap-0.5 p-0">
                          <span class="text-base-content/50 uppercase font-semibold text-[10px]">
                            {lang === "ml" ? "അവസാനം അപ്‌ലോഡ് ചെയ്തത്" : "Retrieved"}
                          </span>
                          <span class="font-mono text-base-content/85 text-[10px] tabular-nums">
                            {new Date(o.meta.retrievedAt).toLocaleString(
                              lang === "ml" ? "ml-IN" : "en-IN",
                              {
                                timeZone: "Asia/Kolkata",
                              },
                            )} IST
                          </span>
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </footer>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
