import {
  type Box,
  type EgoGroup,
  layoutEgoNetwork,
} from "../lib/ego-layout.ts";
import type { Lang } from "../data/lang.ts";
import { t } from "../data/lang.ts";

/** KPI status tone → dot colour, matching StatusBadge. */
const TONE_DOT: Record<string, string> = {
  "on-track": "bg-success",
  "improving": "bg-info",
  "slipping": "bg-warning",
  "off-track": "bg-error",
};

function NodeBox(
  { box, variant }: { box: Box; variant: "center" | "group" | "leaf" },
) {
  const ring = variant === "center"
    ? "border-primary/40 bg-primary/5 font-semibold"
    : variant === "group"
    ? "border-secondary/40 bg-secondary/5 font-medium"
    : "border-base-300 bg-base-100";
  const dot = box.tone ? TONE_DOT[box.tone] ?? "bg-base-content/30" : null;

  return (
    <foreignObject x={box.x} y={box.y} width={box.w} height={box.h}>
      <div
        class={`h-full w-full rounded-lg border ${ring} px-2.5 flex items-center gap-1.5 text-xs leading-tight overflow-hidden`}
      >
        {dot && <span class={`w-2 h-2 rounded-full shrink-0 ${dot}`} />}
        {box.href
          ? (
            <a
              href={box.href}
              class="link link-hover truncate block w-full"
              title={box.label}
            >
              {box.label}
            </a>
          )
          : (
            <span class="truncate block w-full" title={box.label}>
              {box.label}
            </span>
          )}
      </div>
    </foreignObject>
  );
}

/**
 * Static SVG ego network: one center node linked to group nodes, each linked to
 * its leaf nodes (e.g. Minister → Departments → KPIs). Server-rendered, no client
 * JS; bilingual labels are passed in already language-selected by the caller.
 * Layout geometry comes from the unit-tested `layoutEgoNetwork`.
 */
export function EgoNetwork(
  { center, groups, lang, ariaLabel }: {
    center: { label: string; href?: string };
    groups: EgoGroup[];
    lang: Lang;
    ariaLabel?: string;
  },
) {
  const l = layoutEgoNetwork(center, groups);

  return (
    <div class="overflow-x-auto">
      <svg
        viewBox={`0 0 ${l.width} ${l.height}`}
        width={l.width}
        height={l.height}
        role="img"
        aria-label={ariaLabel ??
          t(lang, "Portfolio network map", "പോർട്ട്ഫോളിയോ ശൃംഖല")}
      >
        <g fill="none" stroke="currentColor" class="text-base-300">
          {l.edges.map((e, i) => {
            const dx = (e.x2 - e.x1) / 2;
            return (
              <path
                key={i}
                d={`M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${
                  e.x2 - dx
                } ${e.y2}, ${e.x2} ${e.y2}`}
                stroke-width={1.5}
              />
            );
          })}
        </g>
        <NodeBox box={l.center} variant="center" />
        {l.groups.map((g, i) => (
          <NodeBox key={`g${i}`} box={g} variant="group" />
        ))}
        {l.leaves.map((lf, i) => (
          <NodeBox key={`l${i}`} box={lf} variant="leaf" />
        ))}
      </svg>
    </div>
  );
}
