import { useMemo, useState } from "preact/hooks";
import type { Lang } from "../data/lang.ts";
import { t } from "../data/lang.ts";
import type { Department, Kpi } from "../data/types.ts";

interface Props {
  kpis: Kpi[];
  departments: Department[];
  lang: Lang;
}

type Tab = "explorer" | "writer";
type Tone = "blog" | "briefing" | "factsheet";

export default function ResearchExplorer({ kpis, departments, lang }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("explorer");
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(
    kpis[0]?.id || null,
  );
  const [checkedKpiIds, setCheckedKpiIds] = useState<Record<string, boolean>>({
    [kpis[0]?.id]: true,
  });
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tone, setTone] = useState<Tone>("blog");
  const [generatedDraft, setGeneratedDraft] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Map department IDs to names for quick lookup
  const deptMap = useMemo(() => {
    return new Map(departments.map((d) => [d.id, d]));
  }, [departments]);

  // Unique domains present in current KPIs
  const domains = useMemo(() => {
    const set = new Set<string>();
    for (const k of kpis) {
      if (k.domain) set.add(k.domain);
    }
    return ["all", ...Array.from(set)];
  }, [kpis]);

  // Unique statuses present in current KPIs
  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const k of kpis) {
      if (k.status) set.add(k.status);
    }
    return ["all", ...Array.from(set)];
  }, [kpis]);

  // Selected KPI details
  const selectedKpi = useMemo(() => {
    return kpis.find((k) => k.id === selectedKpiId) || null;
  }, [kpis, selectedKpiId]);

  // Filtered KPIs for display
  const filteredKpis = useMemo(() => {
    return kpis.filter((k) => {
      const matchSearch =
        k.title.toLowerCase().includes(search.toLowerCase()) ||
        (k.titleMl && k.titleMl.includes(search)) ||
        k.meta.definition.toLowerCase().includes(search.toLowerCase()) ||
        (k.meta.definitionMl && k.meta.definitionMl.includes(search));

      const matchDomain = domainFilter === "all" || k.domain === domainFilter;
      const matchStatus = statusFilter === "all" || k.status === statusFilter;

      return matchSearch && matchDomain && matchStatus;
    });
  }, [kpis, search, domainFilter, statusFilter]);

  // Helper: toggle checked KPI for report drafting
  const toggleCheckedKpi = (id: string) => {
    setCheckedKpiIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Helper: select all / deselect all
  const selectAllFiltered = () => {
    const next: Record<string, boolean> = {};
    for (const k of filteredKpis) {
      next[k.id] = true;
    }
    setCheckedKpiIds(next);
  };

  const clearAllChecked = () => {
    setCheckedKpiIds({});
  };

  // CSV Exporter for single KPI
  const downloadKpiCsv = (kpi: Kpi) => {
    if (!kpi.timeSeries || kpi.timeSeries.length === 0) return;
    const headers = "Year,Value,Type,Notes\n";
    const rows = kpi.timeSeries
      .map(
        (p) =>
          `"${p.year}","${p.value}","${p.kind}","${
            (p.note || "").replace(/"/g, '""')
          }"`,
      )
      .join("\n");
    const blob = new Blob([headers + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${kpi.id}_timeseries.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Exporter for selected KPIs
  const copyKpiJson = (kpi: Kpi) => {
    const jsonStr = JSON.stringify(kpi, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Live exchange rate fallback
  const usdRate = 83.5;

  // Insight & Report Generator Logic
  const handleGenerateReport = () => {
    const selected = kpis.filter((k) => checkedKpiIds[k.id]);
    if (selected.length === 0) {
      setGeneratedDraft(
        t(
          lang,
          "Please select at least one KPI from the explorer tab first.",
          "റിപ്പോർട്ട് തയ്യാറാക്കാൻ ദയവായി കുറഞ്ഞത് ഒരു സൂചകമെങ്കിലും തിരഞ്ഞെടുക്കുക.",
        ),
      );
      return;
    }

    const todayStr = new Date().toLocaleDateString(
      lang === "ml" ? "ml-IN" : "en-IN",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    );

    let content = "";

    if (tone === "blog") {
      // ── Narratived blog post ──
      const domainsText = Array.from(new Set(selected.map((k) => k.domain)))
        .join(", ");
      const title = lang === "ml"
        ? `കേരള വികസന വിശകലനം: ${domainsText} സൂചകങ്ങളുടെ നിലവിലെ സ്ഥിതി`
        : `ANALYSIS: A Close Look at Kerala's Progress in ${domainsText}`;

      content += `# ${title}\n\n`;
      content += lang === "ml"
        ? `*പ്രസിദ്ധീകരിച്ച തീയതി: ${todayStr} · കേരള മിഷൻ കൺട്രോൾ ഡാറ്റ ഹബ്ബ്*\n\n`
        : `*Published on: ${todayStr} · Kerala Mission Control Data Hub*\n\n`;

      content += lang === "ml"
        ? `കേരളത്തിന്റെ പുരോഗതി മനസ്സിലാക്കാൻ ലഭ്യമായ ഔദ്യോഗിക വിവരങ്ങൾ അപഗ്രഥിച്ചുകൊണ്ടുള്ള റിപ്പോർട്ട്. ഈ വിശകലനത്തിൽ നാം സംസ്ഥാനം കൈവരിച്ച വിവിധ സൂചകങ്ങളുടെയും അവ നേരിടുന്ന പ്രധാന വെല്ലുവിളികളുടെയും ചിത്രമാണ് പരിശോധിക്കുന്നത്.\n\n`
        : `Data-driven reporting is essential for public accountability. Based on the latest updates from the Government of Kerala, we analyze key performance metrics to understand where the state stands relative to its long-term targets.\n\n`;

      content += `## ${
        lang === "ml" ? "സൂചകങ്ങളുടെ വിശദാംശങ്ങൾ" : "Key Indicator Breakdown"
      }\n\n`;

      for (const k of selected) {
        const titleText = lang === "ml" && k.titleMl ? k.titleMl : k.title;
        const statusText = lang === "ml"
          ? {
            "on-track": "ലക്ഷ്യത്തിലേക്ക് നീങ്ങുന്നു (On Track)",
            "improving": "മെച്ചപ്പെടുന്നു (Improving)",
            "slipping": "പിന്നോട്ട് പോകുന്നു (Slipping)",
            "off-track": "ലക്ഷ്യത്തിന് വെളിയിൽ (Off Track)",
          }[k.status]
          : k.status.toUpperCase();

        const dept = k.ownerDeptId ? deptMap.get(k.ownerDeptId) : null;
        const deptName = dept
          ? (lang === "ml" && dept.nameMl ? dept.nameMl : dept.name)
          : (k.ownerDeptId || "");

        const usdText = k.unit.includes("crore") || k.unit.includes("cr")
          ? ` (approx. $${((k.value * 10) / usdRate).toFixed(1)}M)`
          : "";

        content += `### ${titleText} (${k.domain.toUpperCase()})\n`;
        content += `- **${
          lang === "ml" ? "നിലവിലെ മൂല്യം" : "Current Value"
        }:** ${k.value}${k.unit}${usdText}\n`;
        if (k.target !== undefined) {
          const targetUsd = k.unit.includes("crore") || k.unit.includes("cr")
            ? ` (approx. $${((k.target * 10) / usdRate).toFixed(1)}M)`
            : "";
          content += `- **${
            lang === "ml" ? "ലക്ഷ്യം" : "Target"
          }:** ${k.target}${k.unit}${targetUsd}\n`;
        }
        content += `- **${
          lang === "ml" ? "നിലവിലെ അവസ്ഥ" : "Status"
        }:** ${statusText} (${
          k.trendDelta > 0 ? "+" : ""
        }${k.trendDelta} ${k.trendWindow})\n`;
        content += `- **${
          lang === "ml" ? "വകുപ്പ്" : "Accountable Department"
        }:** ${deptName}\n`;
        content += `- **${lang === "ml" ? "നിർവചനം" : "Definition"}:** ${
          lang === "ml" && k.meta.definitionMl
            ? k.meta.definitionMl
            : k.meta.definition
        }\n\n`;

        if (k.comparators && k.comparators.length > 0) {
          content += `#### ${
            lang === "ml" ? "തുലനാത്മക താരതമ്യം" : "Comparative Benchmarks"
          }\n`;
          for (const c of k.comparators) {
            content += `- **${c.label}:** ${c.value}${k.unit}\n`;
          }
          content += `\n`;
        }

        if (k.timeSeries && k.timeSeries.length > 0) {
          content += `#### ${
            lang === "ml" ? "ചരിത്രവും ലക്ഷ്യരേഖയും" : "Historical Trajectory"
          }\n`;
          content += `| ${lang === "ml" ? "വർഷം" : "Year"} | ${
            lang === "ml" ? "മൂല്യം" : "Value"
          } | ${lang === "ml" ? "ഇനം" : "Type"} |\n`;
          content += `|------|-------|------|\n`;
          for (const p of k.timeSeries) {
            content +=
              `| ${p.year} | ${p.value}${k.unit} | ${p.kind.toUpperCase()} |\n`;
          }
          content += `\n`;
        }
      }

      content += `## ${
        lang === "ml" ? "ഉപസംഹാരം" : "Takeaways & Conclusion"
      }\n\n`;
      content += lang === "ml"
        ? `തിരഞ്ഞെടുത്ത വിവരങ്ങൾ സൂചിപ്പിക്കുന്നത് കേരളത്തിന്റെ നയങ്ങൾ തുടർച്ചയായ നിരീക്ഷണത്തിനും വിലയിരുത്തലുകൾക്കും വിധേയമാക്കേണ്ടതുണ്ടെന്നാണ്. ഈ വിശകലനം പൊതു ജനങ്ങളിലേക്കും നയരൂപകർത്താക്കളിലേക്കും എത്തിക്കുന്നത് കൂടുതൽ സുതാര്യതക്ക് വഴിതെളിക്കും.\n\n`
        : `The indicators selected highlight the diverse trajectories within Kerala's development model. While progress in social sectors remains notable, critical fiscal constraints demand ongoing systemic reforms to sustain these developmental gains. public visibility of these trends ensures that governance remains transparent and responsive.\n\n`;
      content += `*${
        lang === "ml"
          ? "ഡാറ്റ ഉറവിടം: കേരള മിഷൻ കൺട്രോൾ."
          : "Data Source: Kerala Mission Control Public Accountability Dashboard."
      }*`;
    } else if (tone === "briefing") {
      // ── Policy Briefing ──
      content +=
        `# BRIEFING NOTE: Kerala Governance & Performance Indicators\n\n`;
      content += `**Date:** ${todayStr}\n`;
      content +=
        `**Prepared for:** Researchers, Journalists, and Policy Analysts\n`;
      content += `**Subject:** Executive Summary of Selected KMC Metrics\n\n`;
      content += `---\n\n`;
      content += `### 1. Executive Summary\n`;
      content +=
        `This briefing note provides a structured summary of ${selected.length} key governance metrics. `;
      content +=
        `These performance indicators are tracked systematically to ensure democratic accountability and target visibility.\n\n`;

      content += `### 2. Tabulated Core Data\n\n`;
      content +=
        `| Indicator | Current Value | Target | Status | Department |\n`;
      content +=
        `|-----------|---------------|--------|--------|------------|\n`;

      for (const k of selected) {
        const titleText = k.title;
        const targetVal = k.target !== undefined ? `${k.target}${k.unit}` : "-";
        const dept = k.ownerDeptId ? deptMap.get(k.ownerDeptId) : null;
        const deptName = dept ? dept.name : (k.ownerDeptId || "-");
        content +=
          `| ${titleText} | ${k.value}${k.unit} | ${targetVal} | ${k.status.toUpperCase()} | ${deptName} |\n`;
      }
      content += `\n\n`;

      content += `### 3. Detailed Technical Analysis\n\n`;
      for (const k of selected) {
        const dept = k.ownerDeptId ? deptMap.get(k.ownerDeptId) : null;
        const deptName = dept ? dept.name : (k.ownerDeptId || "-");
        content += `#### ${k.title} (${k.id})\n`;
        content +=
          `- **Accountability Authority:** ${k.meta.owner} (${deptName})\n`;
        content += `- **Reported Source:** ${k.meta.source}\n`;
        if (k.meta.sourceUrl) {
          content +=
            `- **Public Link:** [Primary Source Document](${k.meta.sourceUrl})\n`;
        }
        content += `- **Measurement Definition:** ${k.meta.definition}\n`;
        content += `- **Comparative Analysis:**\n`;
        for (const c of k.comparators) {
          content += `  - *${c.label}:* ${c.value}${k.unit} (${
            (k.value - c.value) > 0 ? "+" : ""
          }${(k.value - c.value).toFixed(2)} vs current)\n`;
        }
        if (k.timeSeries && k.timeSeries.length > 0) {
          const actuals = k.timeSeries.filter((p) => p.kind === "actual");
          const targets = k.timeSeries.filter((p) => p.kind === "target");
          content += `- **Trajectory Profile:** Started from baseline ${
            actuals[0]?.value || k.value
          }${k.unit} (${actuals[0]?.year || "2026"}) aiming toward target ${
            targets[targets.length - 1]?.value || k.target
          }${k.unit} by ${targets[targets.length - 1]?.year || "2030"}.\n`;
        }
        content += `\n`;
      }

      content += `### 4. Operational Inferences & Policy Impact\n`;
      content +=
        `- **Slipping / Off-Track Metrics:** Requires immediate administrative scrutiny, resource allocation, or process redesign.\n`;
      content +=
        `- **Improving / On-Track Metrics:** Best practices should be documented, codified, and scaled across departments.\n\n`;
      content += `---\n`;
      content += `*Report compiled from the seeds of Kerala Mission Control.*`;
    } else {
      // ── Fact Sheet ──
      content += `# FACT SHEET: Public Data Snapshot (Kerala)\n`;
      content += `*Generated on: ${todayStr}*\n\n`;
      content +=
        `Here are the key metrics and verified figures for the selected sectors:\n\n`;

      for (const k of selected) {
        const titleText = lang === "ml" && k.titleMl ? k.titleMl : k.title;
        content += `## 📊 ${titleText.toUpperCase()}\n`;
        content += `- **${
          lang === "ml" ? "മൂല്യം" : "Current Statistics"
        }:** ${k.value}${k.unit}\n`;
        if (k.target !== undefined) {
          content += `- **${
            lang === "ml" ? "ലക്ഷ്യം" : "Target Reference"
          }:** ${k.target}${k.unit}\n`;
        }
        content += `- **${lang === "ml" ? "വകുപ്പ്" : "Responsible Entity"}:** ${
          k.ownerDeptId
            ? deptMap.get(k.ownerDeptId)?.name || k.ownerDeptId
            : "-"
        }\n`;
        content += `- **${
          lang === "ml" ? "ഉറവിടം" : "Verified Source"
        }:** ${k.meta.source}\n`;
        content += `- **${
          lang === "ml" ? "വിവരണം" : "Detailed Definition"
        }:** ${
          lang === "ml" && k.meta.definitionMl
            ? k.meta.definitionMl
            : k.meta.definition
        }\n`;

        if (k.comparators && k.comparators.length > 0) {
          content += `- **${lang === "ml" ? "താരതമ്യങ്ങൾ" : "Comparators"}:**\n`;
          for (const c of k.comparators) {
            content += `  - ${c.label}: ${c.value}${k.unit}\n`;
          }
        }
        content += `\n`;
      }
    }

    setGeneratedDraft(content);
    setActiveTab("writer");
  };

  // Download drafted report as Markdown file
  const downloadDraftMd = () => {
    if (!generatedDraft) return;
    const blob = new Blob([generatedDraft], {
      type: "text/markdown;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `KM_Research_Draft_${tone}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy draft to clipboard
  const copyDraftToClipboard = () => {
    if (!generatedDraft) return;
    navigator.clipboard.writeText(generatedDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="space-y-6">
      {/* Tab Nav */}
      <div class="tabs tabs-boxed bg-base-200 w-fit p-1 rounded-box flex gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("explorer")}
          class={`tab rounded-md px-4 py-2 text-sm font-semibold transition ${
            activeTab === "explorer"
              ? "bg-primary text-primary-content shadow-sm"
              : "text-base-content/75 hover:bg-base-300"
          }`}
        >
          🔍 {t(lang, "Data Explorer", "ഡാറ്റ എക്സ്പ്ലോറർ")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("writer")}
          class={`tab rounded-md px-4 py-2 text-sm font-semibold transition ${
            activeTab === "writer"
              ? "bg-primary text-primary-content shadow-sm"
              : "text-base-content/75 hover:bg-base-300"
          }`}
        >
          📝 {t(lang, "Drafting Assistant", "ഡ്രാഫ്റ്റിങ് അസിസ്റ്റന്റ്")}
        </button>
      </div>

      {activeTab === "explorer" && (
        <div class="grid lg:grid-cols-[1fr_20rem] gap-6 items-start">
          {/* Left Panel: Table & Filters */}
          <div class="surface-card p-5 space-y-4">
            <h3 class="font-display text-lg font-bold">
              {t(lang, "Available Datasets", "ലഭ്യമായ ഡാറ്റാസെറ്റുകൾ")}
            </h3>

            {/* Filter Bar */}
            <div class="grid sm:grid-cols-3 gap-3">
              {/* Search */}
              <label class="flex flex-col gap-1">
                <span class="text-xs text-base-content/60">
                  {t(lang, "Search", "തിരയുക")}
                </span>
                <input
                  type="text"
                  placeholder={t(
                    lang,
                    "Search title, definition...",
                    "തിരയുക...",
                  )}
                  value={search}
                  onInput={(e) =>
                    setSearch((e.target as HTMLInputElement).value)}
                  class="input input-sm input-bordered w-full"
                />
              </label>

              {/* Domain filter */}
              <label class="flex flex-col gap-1">
                <span class="text-xs text-base-content/60">
                  {t(lang, "Domain", "മേഖല")}
                </span>
                <select
                  value={domainFilter}
                  onChange={(e) =>
                    setDomainFilter((e.target as HTMLSelectElement).value)}
                  class="select select-sm select-bordered w-full"
                >
                  {domains.map((dom) => (
                    <option key={dom} value={dom}>
                      {dom === "all"
                        ? t(lang, "All Domains", "എല്ലാ മേഖലകളും")
                        : dom.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              {/* Status filter */}
              <label class="flex flex-col gap-1">
                <span class="text-xs text-base-content/60">
                  {t(lang, "Status", "അവസ്ഥ")}
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter((e.target as HTMLSelectElement).value)}
                  class="select select-sm select-bordered w-full"
                >
                  {statuses.map((stat) => (
                    <option key={stat} value={stat}>
                      {stat === "all"
                        ? t(lang, "All Statuses", "എല്ലാ അവസ്ഥകളും")
                        : stat.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Actions for checks */}
            <div class="flex flex-wrap items-center justify-between gap-3 bg-base-100 p-3 rounded-field border border-base-300">
              <div class="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  class="btn btn-xs btn-outline"
                >
                  {t(lang, "Select All", "എല്ലാം തിരഞ്ഞെടുക്കുക")}
                </button>
                <button
                  type="button"
                  onClick={clearAllChecked}
                  class="btn btn-xs btn-ghost text-base-content/60"
                >
                  {t(lang, "Clear Checks", "ചിഹ്നം മാറ്റുക")}
                </button>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-xs text-base-content/60 font-semibold tabular-nums">
                  {Object.values(checkedKpiIds).filter(Boolean).length}{" "}
                  {t(lang, "selected", "തിരഞ്ഞെടുത്തു")}
                </span>
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  class="btn btn-xs btn-primary"
                >
                  {t(lang, "Generate Insights", "റിപ്പോർട്ട് തയ്യാറാക്കുക")} →
                </button>
              </div>
            </div>

            {/* Table */}
            <div class="overflow-x-auto">
              <table class="table table-sm w-full border-collapse">
                <thead>
                  <tr class="border-b border-base-300 text-left">
                    <th class="w-10"></th>
                    <th>{t(lang, "Indicator", "സൂചകം")}</th>
                    <th>{t(lang, "Domain", "മേഖല")}</th>
                    <th class="text-right">{t(lang, "Value", "മൂല്യം")}</th>
                    <th>{t(lang, "Status", "അവസ്ഥ")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKpis.map((k) => {
                    const isChecked = !!checkedKpiIds[k.id];
                    const isSelected = k.id === selectedKpiId;
                    const titleText = lang === "ml" && k.titleMl
                      ? k.titleMl
                      : k.title;
                    const statusClass = {
                      "on-track": "badge-success",
                      "improving": "badge-info",
                      "slipping": "badge-warning",
                      "off-track": "badge-error",
                    }[k.status];

                    return (
                      <tr
                        key={k.id}
                        onClick={() => setSelectedKpiId(k.id)}
                        class={`border-b border-base-200 hover:bg-base-200/50 cursor-pointer transition ${
                          isSelected ? "bg-primary/5 font-semibold" : ""
                        }`}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheckedKpi(k.id)}
                            class="checkbox checkbox-xs"
                            aria-label={t(
                              lang,
                              `Select ${k.title}`,
                              `തിരഞ്ഞെടുക്കുക ${k.title}`,
                            )}
                          />
                        </td>
                        <td>
                          <div class="font-semibold text-sm leading-snug">
                            {titleText}
                          </div>
                          <div class="text-[10px] text-base-content/50 font-mono">
                            {k.id}
                          </div>
                        </td>
                        <td class="text-xs uppercase opacity-80">{k.domain}</td>
                        <td class="text-right font-semibold tabular-nums text-sm">
                          {k.value}
                          <span class="text-xs opacity-70 ml-0.5">
                            {k.unit}
                          </span>
                        </td>
                        <td>
                          <span class={`badge badge-sm ${statusClass} text-xs`}>
                            {k.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredKpis.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        class="text-center py-6 text-base-content/50"
                      >
                        {t(
                          lang,
                          "No indicators match the search or filter criteria.",
                          "സൂചകങ്ങൾ ഒന്നും കണ്ടെത്താനായില്ല.",
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Panel: Selected KPI details */}
          <div class="space-y-4">
            {selectedKpi
              ? (
                <div class="surface-card p-5 space-y-4 sticky top-20">
                  <div class="border-b border-base-300 pb-3">
                    <p class="eyebrow mb-1">
                      {selectedKpi.domain.toUpperCase()} ·{" "}
                      {selectedKpi.ownerDeptId
                        ? deptMap.get(selectedKpi.ownerDeptId)?.name ||
                          selectedKpi.ownerDeptId
                        : ""}
                    </p>
                    <h4 class="font-display text-lg font-bold">
                      {lang === "ml" && selectedKpi.titleMl
                        ? selectedKpi.titleMl
                        : selectedKpi.title}
                    </h4>
                    <p class="text-[10px] font-mono text-base-content/55">
                      {selectedKpi.id}
                    </p>
                  </div>

                  <div class="text-xs leading-relaxed text-base-content/85">
                    <p class="font-semibold">
                      {t(lang, "Definition", "നിർവചനം")}:
                    </p>
                    <p class="text-base-content/75 mt-0.5">
                      {lang === "ml" && selectedKpi.meta.definitionMl
                        ? selectedKpi.meta.definitionMl
                        : selectedKpi.meta.definition}
                    </p>
                  </div>

                  <dl class="grid grid-cols-2 gap-3 text-xs border-y border-base-200 py-3">
                    <div>
                      <dt class="text-base-content/55">
                        {t(lang, "Current Value", "നിലവിലെ മൂല്യം")}
                      </dt>
                      <dd class="font-bold text-sm tabular-nums">
                        {selectedKpi.value}
                        {selectedKpi.unit}
                      </dd>
                    </div>
                    {selectedKpi.target !== undefined && (
                      <div>
                        <dt class="text-base-content/55">
                          {t(lang, "Target (2030)", "ലക്ഷ്യം (2030)")}
                        </dt>
                        <dd class="font-bold text-sm tabular-nums">
                          {selectedKpi.target}
                          {selectedKpi.unit}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt class="text-base-content/55">
                        {t(lang, "Direction", "ദിശ")}
                      </dt>
                      <dd class="font-semibold capitalize">
                        {selectedKpi.direction === "lower-better"
                          ? t(lang, "Lower is better", "കുറയുന്നത് നല്ലത്")
                          : t(
                            lang,
                            "Higher is better",
                            "കൂടുന്നത് നല്ലത്",
                          )}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-base-content/55">
                        {t(lang, "Update Frequency", "ആവൃത്തി")}
                      </dt>
                      <dd class="font-semibold capitalize">
                        {selectedKpi.meta.updateFrequency}
                      </dd>
                    </div>
                  </dl>

                  {/* Comparators */}
                  {selectedKpi.comparators &&
                    selectedKpi.comparators.length > 0 && (
                    <div class="space-y-2">
                      <p class="text-xs font-semibold text-base-content/70">
                        {t(lang, "Comparators & Benchmarks", "താരതമ്യങ്ങൾ")}
                      </p>
                      <ul class="space-y-1.5">
                        {selectedKpi.comparators.map((c, idx) => (
                          <li
                            key={idx}
                            class="flex justify-between items-center text-xs bg-base-100 p-2 rounded-field border border-base-200"
                          >
                            <span class="text-base-content/70">{c.label}</span>
                            <span class="font-semibold tabular-nums">
                              {c.value}
                              {selectedKpi.unit}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Time series */}
                  {selectedKpi.timeSeries &&
                    selectedKpi.timeSeries.length > 0 && (
                    <div class="space-y-2">
                      <p class="text-xs font-semibold text-base-content/70">
                        {t(lang, "Historical Projections", "ലക്ഷ്യരേഖ")}
                      </p>
                      <div class="max-h-36 overflow-y-auto rounded-box border border-base-200 text-xs">
                        <table class="table table-xs w-full">
                          <thead>
                            <tr class="bg-base-200 text-left">
                              <th>{t(lang, "Year", "വർഷം")}</th>
                              <th class="text-right">
                                {t(lang, "Value", "മൂല്യം")}
                              </th>
                              <th>{t(lang, "Type", "ഇനം")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedKpi.timeSeries.map((p, idx) => (
                              <tr key={idx} class="border-b border-base-200">
                                <td class="font-mono">{p.year}</td>
                                <td class="text-right font-bold tabular-nums">
                                  {p.value}
                                  {selectedKpi.unit}
                                </td>
                                <td class="uppercase text-[10px] opacity-75">
                                  {p.kind}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Exporter Actions */}
                  <div class="flex gap-2 border-t border-base-200 pt-3">
                    <button
                      type="button"
                      onClick={() => downloadKpiCsv(selectedKpi)}
                      disabled={!selectedKpi.timeSeries}
                      class="btn btn-sm btn-outline flex-1 text-xs"
                    >
                      📥 CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => copyKpiJson(selectedKpi)}
                      class="btn btn-sm btn-outline flex-1 text-xs"
                    >
                      {copied ? "✅ Copied" : "📋 JSON"}
                    </button>
                  </div>
                </div>
              )
              : (
                <div class="surface-card p-5 text-center text-base-content/55 text-sm">
                  {t(
                    lang,
                    "Select an indicator from the table to view detailed metrics and export datasets.",
                    "സൂചകങ്ങളുടെ വിശദാംശങ്ങൾ കാണാൻ ലിസ്റ്റിൽ നിന്ന് ഒരെണ്ണം തിരഞ്ഞെടുക്കുക.",
                  )}
                </div>
              )}
          </div>
        </div>
      )}

      {activeTab === "writer" && (
        <div class="grid lg:grid-cols-[16rem_1fr] gap-6 items-start">
          {/* Controls: Tone & Select KPI Checklist */}
          <div class="surface-card p-5 space-y-4">
            <h3 class="font-display text-base font-bold">
              {t(lang, "Drafting Options", "ഡ്രാഫ്റ്റിങ് ഓപ്ഷനുകൾ")}
            </h3>

            {/* Tone Selector */}
            <label class="flex flex-col gap-1">
              <span class="text-xs text-base-content/60">
                {t(lang, "Report Format", "ഫോർമാറ്റ്")}
              </span>
              <select
                value={tone}
                onChange={(e) =>
                  setTone((e.target as HTMLSelectElement).value as Tone)}
                class="select select-sm select-bordered w-full"
              >
                <option value="blog">
                  📰 {t(lang, "Blog Post (Narrative)", "ബ്ലോഗ് പോസ്റ്റ്")}
                </option>
                <option value="briefing">
                  🏢 {t(lang, "Policy Briefing (Formal)", "നയരേഖ")}
                </option>
                <option value="factsheet">
                  📄 {t(lang, "Fact Sheet", "വിവരപത്രിക")}
                </option>
              </select>
            </label>

            {/* Selected KPIs checklist */}
            <div class="space-y-2">
              <span class="text-xs text-base-content/60 font-semibold block">
                {t(
                  lang,
                  "Include Selected Indicators",
                  "ഉൾപ്പെടുത്തേണ്ട സൂചകങ്ങൾ",
                )}
              </span>
              <div class="max-h-60 overflow-y-auto space-y-1.5 border border-base-200 p-2 rounded-box bg-base-100">
                {kpis.map((k) => {
                  const isChecked = !!checkedKpiIds[k.id];
                  return (
                    <label
                      key={k.id}
                      class="flex items-start gap-2 text-xs hover:bg-base-200 p-1.5 rounded-field cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCheckedKpi(k.id)}
                        class="checkbox checkbox-xs mt-0.5 shrink-0"
                      />
                      <span class="leading-tight">
                        {lang === "ml" && k.titleMl ? k.titleMl : k.title}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateReport}
              class="btn btn-sm btn-primary w-full"
            >
              🔄 {t(lang, "Regenerate Draft", "ഡ്രാഫ്റ്റ് പുതുക്കുക")}
            </button>
          </div>

          {/* Draft Preview Panel */}
          <div class="surface-card p-5 space-y-4">
            <div class="flex items-center justify-between border-b border-base-300 pb-3">
              <div>
                <h3 class="font-display text-lg font-bold">
                  {t(lang, "Generated Draft", "ലഭ്യമായ ഡ്രാഫ്റ്റ്")}
                </h3>
                <p class="text-xs text-base-content/60">
                  {t(
                    lang,
                    "Copy-paste this Markdown text directly into your blog, report, or CMS.",
                    "ഈ ഡ്രാഫ്റ്റ് നിങ്ങളുടെ ബ്ലോഗിലോ റിപ്പോർട്ടിലോ പകർത്താം.",
                  )}
                </p>
              </div>

              <div class="flex gap-2">
                <button
                  type="button"
                  onClick={copyDraftToClipboard}
                  disabled={!generatedDraft}
                  class="btn btn-sm btn-outline text-xs"
                >
                  {copied
                    ? t(lang, "Copied!", "പകർത്തി!")
                    : t(lang, "Copy MD", "കോപ്പി ചെയ്യുക")}
                </button>
                <button
                  type="button"
                  onClick={downloadDraftMd}
                  disabled={!generatedDraft}
                  class="btn btn-sm btn-primary text-xs"
                >
                  📥 {t(lang, "Download .md", "ഡൗൺലോഡ്")}
                </button>
              </div>
            </div>

            {generatedDraft
              ? (
                <div class="relative">
                  <textarea
                    readOnly
                    value={generatedDraft}
                    class="w-full h-[32rem] font-mono text-xs p-4 bg-base-100 border border-base-300 rounded-box focus:outline-none resize-none leading-relaxed text-base-content/90"
                  />
                </div>
              )
              : (
                <div class="h-96 flex flex-col items-center justify-center border border-dashed border-base-300 rounded-box text-base-content/55 text-sm p-6 space-y-3">
                  <span class="text-3xl">📝</span>
                  <p>
                    {t(
                      lang,
                      "No draft generated yet. Click 'Generate Draft' after checking indicators.",
                      "ഡ്രാഫ്റ്റ് തയ്യാറാക്കിയിട്ടില്ല. സൂചകങ്ങൾ തിരഞ്ഞെടുത്ത ശേഷം തയ്യാറാക്കുക ക്ലിക്ക് ചെയ്യുക.",
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateReport}
                    class="btn btn-sm btn-primary"
                  >
                    {t(
                      lang,
                      "Generate Report Now",
                      "ഇപ്പോൾ തന്നെ ഡ്രാഫ്റ്റ് തയ്യാറാക്കുക",
                    )}
                  </button>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
