import type { Lang } from "../data/lang.ts";
import LangToggle from "../islands/LangToggle.tsx";

export function Header({ lang }: { lang: Lang }) {
  return (
    <header class="border-b border-base-300 bg-base-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <a href="/" class="flex items-center gap-3 group min-w-0">
          <span
            class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-content font-bold"
            aria-hidden="true"
          >
            K
          </span>
          <span class="flex flex-col leading-tight min-w-0">
            <span class="text-sm font-semibold truncate">
              {lang === "ml" ? "കേരള മിഷൻ കൺട്രോൾ" : "Kerala Mission Control"}
            </span>
            <span class="text-[11px] text-base-content/60 truncate">
              {lang === "ml"
                ? "ഉത്തരവാദിത്വത്തിന്റെ പൊതു ഡാഷ്ബോർഡ്"
                : "A public accountability dashboard · prototype"}
            </span>
          </span>
        </a>

        <nav class="hidden md:flex items-center gap-1 text-sm">
          {[
            { href: "/", en: "Kerala Today", ml: "ഇന്നത്തെ കേരളം" },
            { href: "/gov", en: "Government", ml: "സർക്കാർ" },
            { href: "/gov/cabinet", en: "Cabinet", ml: "മന്ത്രിസഭ" },
            { href: "/gov/manifesto", en: "Promises", ml: "വാഗ്ദാനങ്ങൾ" },
          ].map((item) => (
            <a
              href={item.href}
              class={`px-3 py-1.5 rounded-md hover:bg-base-200 ${
                item.href === "/" ? "font-medium" : "text-base-content/70"
              }`}
            >
              {lang === "ml" ? item.ml : item.en}
            </a>
          ))}
        </nav>

        <LangToggle current={lang} />
      </div>
    </header>
  );
}
