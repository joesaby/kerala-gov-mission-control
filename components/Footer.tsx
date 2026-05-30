import type { Lang } from "../data/lang.ts";
import { t } from "../data/lang.ts";
import { PookalamMark } from "./PookalamMark.tsx";

export function Footer({ lang }: { lang: Lang }) {
  const buildTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const links = [
    { href: "/about", en: "About", ml: "കുറിച്ച്" },
    { href: "/methodology", en: "Methodology", ml: "രീതിശാസ്ത്രം" },
    { href: "/data", en: "Raw data & API", ml: "ഡാറ്റ & API" },
    { href: "/changelog", en: "Changelog", ml: "മാറ്റങ്ങൾ" },
  ];
  return (
    <footer class="border-t border-base-300 bg-base-100 mt-16">
      {/* kasavu gold hairline echoes the header */}
      <div class="h-0.5 w-full bg-accent/60" aria-hidden="true" />
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-sm text-base-content/70 space-y-4">
        <div class="flex items-start gap-3">
          <PookalamMark size={28} class="shrink-0 mt-0.5" />
          <p
            class={`max-w-2xl text-xs leading-relaxed ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {lang === "ml"
              ? "ഇത് ഒരു സ്വതന്ത്ര പ്രോട്ടോടൈപ്പാണ് — കേരള സർക്കാരിന്റെ ഔദ്യോഗിക ഉൽപ്പന്നമല്ല. കാണിച്ചിരിക്കുന്ന കണക്കുകൾ പ്രദർശനത്തിനായുള്ളവയാണ്."
              : "This is an independent prototype — not an official Government of Kerala product. Values shown are illustrative for demonstration."}
          </p>
        </div>
        <div class="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {links.map((l) => (
            <a class="link link-hover hover:text-primary" href={l.href}>
              {t(lang, l.en, l.ml)}
            </a>
          ))}
          <span class="ml-auto tabular-nums text-base-content/50">
            {t(lang, "Built", "നിർമ്മിച്ചത്")} {buildTime} IST
          </span>
        </div>
      </div>
    </footer>
  );
}
