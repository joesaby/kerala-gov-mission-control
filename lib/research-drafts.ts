import type { Lang } from "../data/lang.ts";
import { FALLBACK_USD_INR } from "../data/lang.ts";
import type { Department, Kpi } from "../data/types.ts";

/**
 * Markdown draft generators for the Research Hub (/research).
 *
 * Pure functions — no DOM, no Date.now(), no state — so they are unit-testable
 * with `deno test` and reusable server-side. The ResearchExplorer island owns
 * the UI state and calls generateResearchDraft with the user's selection.
 *
 * Language policy (docs/specs/bilingual-localization.md Rule 2.3, documented
 * exception): the "blog" and "factsheet" tones follow the active language; the
 * "briefing" tone is intentionally English-only — its audience is researchers,
 * journalists, and policy analysts working in English.
 */

export type DraftTone = "blog" | "briefing" | "factsheet";

export interface DraftOptions {
  /** The KPIs the user selected for the write-up. */
  kpis: Kpi[];
  departments: Department[];
  lang: Lang;
  tone: DraftTone;
  /** Pre-formatted, locale-correct date label for the byline. */
  todayStr: string;
  usdRate?: number;
}

function isCroreUnit(unit: string): boolean {
  return unit.includes("crore") || unit.includes("കോടി");
}

function usdApprox(croreVal: number, usdRate: number): string {
  return ` (approx. $${((croreVal * 10) / usdRate).toFixed(1)}M)`;
}

export function generateResearchDraft(opts: DraftOptions): string {
  const {
    kpis: selected,
    departments,
    lang,
    tone,
    todayStr,
    usdRate = FALLBACK_USD_INR,
  } = opts;
  const deptMap = new Map(departments.map((d) => [d.id, d]));

  let content = "";

  if (tone === "blog") {
    // ── Narrative blog post ──
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

      const usdText = isCroreUnit(k.unit) ? usdApprox(k.value, usdRate) : "";

      content += `### ${titleText} (${k.domain.toUpperCase()})\n`;
      content += `- **${
        lang === "ml" ? "നിലവിലെ മൂല്യം" : "Current Value"
      }:** ${k.value}${k.unit}${usdText}\n`;
      if (k.target !== undefined) {
        const targetUsd = isCroreUnit(k.unit)
          ? usdApprox(k.target, usdRate)
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

    content += `## ${lang === "ml" ? "ഉപസംഹാരം" : "Takeaways & Conclusion"}\n\n`;
    content += lang === "ml"
      ? `തിരഞ്ഞെടുത്ത വിവരങ്ങൾ സൂചിപ്പിക്കുന്നത് കേരളത്തിന്റെ നയങ്ങൾ തുടർച്ചയായ നിരീക്ഷണത്തിനും വിലയിരുത്തലുകൾക്കും വിധേയമാക്കേണ്ടതുണ്ടെന്നാണ്. ഈ വിശകലനം പൊതു ജനങ്ങളിലേക്കും നയരൂപകർത്താക്കളിലേക്കും എത്തിക്കുന്നത് കൂടുതൽ സുതാര്യതക്ക് വഴിതെളിക്കും.\n\n`
      : `The indicators selected highlight the diverse trajectories within Kerala's development model. While progress in social sectors remains notable, critical fiscal constraints demand ongoing systemic reforms to sustain these developmental gains. Public visibility of these trends ensures that governance remains transparent and responsive.\n\n`;
    content += `*${
      lang === "ml"
        ? "ഡാറ്റ ഉറവിടം: കേരള മിഷൻ കൺട്രോൾ."
        : "Data Source: Kerala Mission Control Public Accountability Dashboard."
    }*`;
  } else if (tone === "briefing") {
    // ── Policy briefing — intentionally English-only (see module docs) ──
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
    content += `| Indicator | Current Value | Target | Status | Department |\n`;
    content += `|-----------|---------------|--------|--------|------------|\n`;

    for (const k of selected) {
      const targetVal = k.target !== undefined ? `${k.target}${k.unit}` : "-";
      const dept = k.ownerDeptId ? deptMap.get(k.ownerDeptId) : null;
      const deptName = dept ? dept.name : (k.ownerDeptId || "-");
      content +=
        `| ${k.title} | ${k.value}${k.unit} | ${targetVal} | ${k.status.toUpperCase()} | ${deptName} |\n`;
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
    content += `*Report compiled from Kerala Mission Control public data.*`;
  } else {
    // ── Fact sheet ──
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
        k.ownerDeptId ? deptMap.get(k.ownerDeptId)?.name || k.ownerDeptId : "-"
      }\n`;
      content += `- **${
        lang === "ml" ? "ഉറവിടം" : "Verified Source"
      }:** ${k.meta.source}\n`;
      content += `- **${lang === "ml" ? "വിവരണം" : "Detailed Definition"}:** ${
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

  return content;
}
