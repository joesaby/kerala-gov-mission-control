import type { Lang } from "../data/lang.ts";
import LangToggle from "../islands/LangToggle.tsx";
import { PookalamMark } from "./PookalamMark.tsx";

const NAV = [
  { href: "/", en: "Kerala Today", ml: "ഇന്നത്തെ കേരളം" },
  { href: "/gov", en: "Government", ml: "സർക്കാർ" },
  {
    href: "/gov/orders",
    en: "Orders & Decisions",
    ml: "ഉത്തരവുകൾ & തീരുമാനങ്ങൾ",
  },
  { href: "/gov/manifesto", en: "Promises", ml: "വാഗ്ദാനങ്ങൾ" },
];

/** The active nav item is the one whose href is the longest prefix of path. */
function activeHref(path: string | undefined): string {
  if (!path) return "";
  let best = "";
  for (const { href } of NAV) {
    const match = href === "/"
      ? path === "/"
      : path === href || path.startsWith(href + "/");
    if (match && href.length > best.length) best = href;
  }
  return best;
}

export function Header({ lang, path }: { lang: Lang; path?: string }) {
  const active = activeHref(path);
  return (
    <header class="sticky top-0 z-30 border-b border-base-300 bg-base-100/90 backdrop-blur supports-[backdrop-filter]:bg-base-100/75">
      {/* kasavu gold hairline */}
      <div class="h-0.5 w-full bg-accent/80" aria-hidden="true" />
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <a href="/" class="flex items-center gap-3 group min-w-0">
          <PookalamMark size={38} class="shrink-0 drop-shadow-sm" />
          <span class="flex flex-col leading-tight min-w-0">
            <span
              class={`text-[15px] font-display font-bold truncate ${
                lang === "ml" ? "ml" : ""
              }`}
            >
              {lang === "ml" ? "കേരള മിഷൻ കൺട്രോൾ" : "Kerala Mission Control"}
            </span>
            <span class="text-[11px] text-base-content/60 truncate">
              {lang === "ml"
                ? "പൊതു ഉത്തരവാദിത്വ ഡാഷ്ബോർഡ്"
                : "A public accountability dashboard · prototype"}
            </span>
          </span>
        </a>

        <nav class="hidden md:flex items-center gap-1 text-sm">
          {NAV.map((item) => {
            const isActive = item.href === active;
            return (
              <a
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                class={`px-3 py-1.5 rounded-field transition ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                }`}
              >
                {lang === "ml" ? item.ml : item.en}
              </a>
            );
          })}
        </nav>

        <div class="flex items-center gap-2">
          <LangToggle current={lang} />

          {/* Mobile menu — CSS-only <details>, no client JS. */}
          <details class="dropdown dropdown-end md:hidden">
            <summary
              class="btn btn-sm btn-ghost btn-square"
              aria-label={lang === "ml" ? "മെനു" : "Menu"}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </summary>
            <ul class="dropdown-content menu mt-2 w-52 rounded-box bg-base-100 border border-base-300 shadow-lg z-40 p-2">
              {NAV.map((item) => {
                const isActive = item.href === active;
                return (
                  <li>
                    <a
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      class={isActive
                        ? "active font-semibold text-primary"
                        : ""}
                    >
                      {lang === "ml" ? item.ml : item.en}
                    </a>
                  </li>
                );
              })}
            </ul>
          </details>
        </div>
      </div>
    </header>
  );
}
