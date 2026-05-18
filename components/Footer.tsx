import type { Lang } from "../data/lang.ts";

export function Footer({ lang }: { lang: Lang }) {
  const buildTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <footer class="border-t border-base-300 bg-base-100 mt-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-xs text-base-content/60 space-y-3">
        <p class={lang === "ml" ? "ml" : ""}>
          {lang === "ml"
            ? "ഇത് ഒരു സ്വതന്ത്ര പ്രോട്ടോടൈപ്പാണ് — കേരള സർക്കാർ ഔദ്യോഗിക ഉൽപ്പന്നമല്ല. കാണിച്ചിരിക്കുന്ന കണക്കുകൾ പ്രദർശനത്തിനായുള്ളവയാണ്."
            : "This is an independent prototype — not an official Government of Kerala product. Values shown are illustrative for demonstration."}
        </p>
        <div class="flex flex-wrap gap-x-5 gap-y-2">
          <a class="link link-hover" href="/about">About</a>
          <a class="link link-hover" href="/methodology">Methodology</a>
          <a class="link link-hover" href="/data">Raw data &amp; API</a>
          <a class="link link-hover" href="/changelog">Changelog</a>
          <span class="ml-auto tabular-nums">Built {buildTime} IST</span>
        </div>
      </div>
    </footer>
  );
}
