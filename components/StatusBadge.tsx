import type { KpiStatus } from "../data/types.ts";
import type { Lang } from "../data/lang.ts";

const LABEL: Record<KpiStatus, { en: string; ml: string }> = {
  "on-track": { en: "On track", ml: "ലക്ഷ്യത്തിലാണ്" },
  "improving": { en: "Improving", ml: "മെച്ചപ്പെടുന്നു" },
  "slipping": { en: "Slipping", ml: "പിന്നോട്ട്" },
  "off-track": { en: "Off track", ml: "ലക്ഷ്യം തെറ്റി" },
};

const TONE: Record<KpiStatus, string> = {
  "on-track": "badge-success",
  "improving": "badge-info",
  "slipping": "badge-warning",
  "off-track": "badge-error",
};

const GLYPH: Record<KpiStatus, string> = {
  "on-track": "✓",
  "improving": "▲",
  "slipping": "▼",
  "off-track": "!",
};

export function StatusBadge(
  { status, lang = "en" }: { status: KpiStatus; lang?: Lang },
) {
  return (
    <span
      class={`badge ${
        TONE[status]
      } badge-sm gap-1.5 font-semibold rounded-full ${
        lang === "ml" ? "ml" : ""
      }`}
    >
      <span aria-hidden="true" class="text-[0.85em] leading-none font-bold">
        {GLYPH[status]}
      </span>
      {lang === "ml" ? LABEL[status].ml : LABEL[status].en}
    </span>
  );
}
