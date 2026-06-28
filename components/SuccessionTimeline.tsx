import type { Lang } from "../data/lang.ts";
import { t } from "../data/lang.ts";

export interface SuccessionHolder {
  id: string;
  label: string;
  href: string;
  termStart: string;
  current: boolean;
}

export interface SuccessionOffice {
  id: string;
  office: string;
  holders: SuccessionHolder[];
}

export interface SuccessionBlock {
  id: string;
  deptLabel: string;
  deptHref?: string;
  offices: SuccessionOffice[];
}

/** Vertical office succession — replaces ego-network maps for appointments. */
export function SuccessionTimeline(
  { blocks, lang }: { blocks: SuccessionBlock[]; lang: Lang },
) {
  if (blocks.length === 0) return null;

  return (
    <div class="flex flex-col gap-6">
      {blocks.map((block) => (
        <section
          key={block.id}
          class="rounded-box border border-base-300 p-4"
        >
          <h3 class="font-semibold text-sm mb-3">
            {block.deptHref
              ? (
                <a href={block.deptHref} class="link link-hover">
                  {block.deptLabel}
                </a>
              )
              : block.deptLabel}
          </h3>
          <div class="flex flex-col gap-4">
            {block.offices.map((office) => (
              <div key={office.id}>
                <p class="text-xs uppercase tracking-wider text-base-content/55 mb-2">
                  {office.office}
                </p>
                <ol class="relative border-s border-base-300 ms-2 flex flex-col gap-3">
                  {office.holders.map((h) => (
                    <li key={h.id} class="ms-4">
                      <span
                        class={`absolute -start-1.5 mt-1 w-2.5 h-2.5 rounded-full border-2 border-base-100 ${
                          h.current ? "bg-success" : "bg-base-content/30"
                        }`}
                        aria-hidden="true"
                      />
                      <a
                        href={h.href}
                        class="link link-hover text-sm font-medium"
                      >
                        {h.label}
                      </a>
                      <span class="text-xs text-base-content/50 ms-2 tabular-nums">
                        {h.termStart.slice(0, 7)}
                        {h.current ? ` · ${t(lang, "current", "നിലവിൽ")}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
