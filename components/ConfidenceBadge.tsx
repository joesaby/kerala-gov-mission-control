import type { Lang } from "../data/lang.ts";

const MANIFESTO_CONFIDENCE: Record<
  string,
  { en: string; ml: string; cls: string }
> = {
  direct: {
    en: "Direct action",
    ml: "നേരിട്ടുള്ള നടപടി",
    cls: "badge-success/15 text-success border-success/25",
  },
  supporting: {
    en: "Supporting action",
    ml: "പിന്തുണയ്ക്കുന്ന നടപടി",
    cls: "badge-warning/15 text-warning border-warning/25",
  },
  weak: {
    en: "Indirect link",
    ml: "പരോക്ഷ ബന്ധം",
    cls: "badge-ghost text-base-content/50",
  },
};

/** Machine-tag confidence for manifesto or department links. */
export function ConfidenceBadge(
  { confidence, lang }: { confidence?: string; lang: Lang },
) {
  if (!confidence) return null;
  const info = MANIFESTO_CONFIDENCE[confidence] ??
    { en: confidence, ml: confidence, cls: "badge-ghost" };
  return (
    <span class={`badge badge-xs badge-outline ${info.cls}`}>
      {lang === "ml" ? info.ml : info.en}
    </span>
  );
}
