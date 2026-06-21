import type { ComponentChildren } from "preact";
import type { Lang } from "../data/lang.ts";
import { t } from "../data/lang.ts";
import type { Budget } from "../data/types.ts";

/**
 * Section shell for /economy — a responsive left nav listing the fiscal status,
 * the white paper, and every budget (newest first). Server-rendered, no island:
 * a sticky <aside> on lg+, and a pure-CSS <details> disclosure on mobile.
 */

interface NavItem {
  href: string;
  label: string;
  labelMl: string;
  sub?: string;
}

function budgetNavLabel(b: Budget, lang: Lang): { label: string; sub: string } {
  const month = new Date(b.presentedOn).toLocaleDateString(
    lang === "ml" ? "ml-IN" : "en-IN",
    { month: "short", year: "numeric", timeZone: "Asia/Kolkata" },
  );
  const variant = b.variant === "revised"
    ? t(lang, "revised", "പുതുക്കിയത്")
    : t(lang, "original", "ആദ്യത്തേത്");
  return { label: month, sub: `${b.government} · ${variant}` };
}

function NavLink(
  { item, path }: { item: NavItem; path: string },
) {
  const active = path === item.href;
  return (
    <a
      href={item.href}
      aria-current={active ? "page" : undefined}
      class={`block rounded-field px-3 py-2 text-sm leading-tight transition-colors ${
        active
          ? "bg-primary/10 text-primary font-semibold"
          : "hover:bg-base-200 text-base-content/80"
      }`}
    >
      <span class="block">{item.label}</span>
      {item.sub && (
        <span class="block text-[11px] font-normal text-base-content/50">
          {item.sub}
        </span>
      )}
    </a>
  );
}

export function EconomyShell(
  { lang, path, budgets, children }: {
    lang: Lang;
    path: string;
    budgets: Budget[];
    children: ComponentChildren;
  },
) {
  const top: NavItem[] = [
    {
      href: "/economy",
      label: t(lang, "Fiscal status", "ധനസ്ഥിതി"),
      labelMl: "ധനസ്ഥിതി",
      sub: t(lang, "the numbers now", "ഇപ്പോഴത്തെ കണക്കുകൾ"),
    },
    {
      href: "/economy/white-paper",
      label: t(lang, "White Paper", "ധവളപത്രം"),
      labelMl: "ധവളപത്രം",
      sub: t(lang, "the diagnosis", "രോഗനിർണയം"),
    },
  ];
  const budgetItems: NavItem[] = budgets.map((b) => {
    const { label, sub } = budgetNavLabel(b, lang);
    return {
      href: `/economy/budget/${b.id}`,
      label,
      labelMl: label,
      sub,
    };
  });

  const nav = (
    <nav class="space-y-1">
      {top.map((it) => <NavLink key={it.href} item={it} path={path} />)}
      {budgetItems.length > 0 && (
        <div class="pt-2">
          <p class="px-3 pb-1 eyebrow">{t(lang, "Budgets", "ബജറ്റുകൾ")}</p>
          {budgetItems.map((it) => (
            <NavLink key={it.href} item={it} path={path} />
          ))}
        </div>
      )}
    </nav>
  );

  return (
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Mobile: collapsible disclosure */}
      <details class="lg:hidden surface-card overflow-hidden">
        <summary class="cursor-pointer select-none px-4 py-3 font-semibold flex items-center gap-2">
          <span aria-hidden="true">☰</span>
          {t(lang, "Economy section", "സമ്പദ്‌വ്യവസ്ഥ വിഭാഗം")}
        </summary>
        <div class="px-2 pb-2">{nav}</div>
      </details>

      {/* Desktop: sticky sidebar */}
      <aside class="hidden lg:block w-56 shrink-0">
        <div class="sticky top-20">
          <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-base-content/40">
            {t(lang, "Economy", "സമ്പദ്‌വ്യവസ്ഥ")}
          </p>
          {nav}
        </div>
      </aside>

      <div class="min-w-0 flex-1">{children}</div>
    </div>
  );
}
