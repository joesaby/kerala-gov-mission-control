import { t } from "../data/lang.ts";
import type { Lang } from "../data/lang.ts";

const LINKS = [
  { href: "/gov", en: "Overview", ml: "അവലോകനം", exact: true as const },
  { href: "/gov/orders", en: "Orders", ml: "ഉത്തരവുകൾ" },
  { href: "/gov/decisions", en: "Decisions", ml: "തീരുമാനങ്ങൾ" },
  { href: "/gov/appointments", en: "Appointments", ml: "നിയമനങ്ങൾ" },
  { href: "/gov/people", en: "People", ml: "വ്യക്തികൾ" },
];

function isActive(
  path: string | undefined,
  href: string,
  exact?: boolean,
): boolean {
  if (!path) return false;
  if (exact) return path === href;
  return path === href || path.startsWith(href + "/");
}

/** Secondary nav for the /gov section — sibling routes, not hash tabs. */
export function GovSubnav({ lang, path }: { lang: Lang; path?: string }) {
  return (
    <nav
      class="flex flex-wrap gap-2 mb-8"
      aria-label={t(lang, "Government sections", "സർക്കാർ വിഭാഗങ്ങൾ")}
    >
      {LINKS.map((item) => {
        const active = isActive(path, item.href, "exact" in item && item.exact);
        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            class={`btn btn-sm ${
              active ? "btn-primary" : "btn-outline border-base-300"
            }`}
          >
            {lang === "ml" ? item.ml : item.en}
          </a>
        );
      })}
    </nav>
  );
}
