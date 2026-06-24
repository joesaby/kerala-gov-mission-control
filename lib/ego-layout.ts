/**
 * Deterministic layout for a small "ego network" — one center node, a column of
 * group nodes, and a column of leaf nodes grouped under them. Used to render a
 * minister → departments → KPIs portfolio map (spec §B) as static SVG.
 *
 * Pure geometry, no rendering and no framework imports, so it is unit-testable
 * without a browser. Coordinates are in SVG user units; the component scales the
 * whole thing to the container via viewBox. Every leaf gets its own row, so node
 * boxes can never overlap regardless of how many KPIs a minister owns.
 */

export interface EgoLeaf {
  id: string;
  label: string;
  href?: string;
  /** Free-form tag (e.g. KPI status) the renderer maps to a colour. */
  tone?: string;
}

export interface EgoGroup {
  id: string;
  label: string;
  href?: string;
  leaves: EgoLeaf[];
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  href?: string;
  tone?: string;
}

export interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface EgoLayout {
  width: number;
  height: number;
  center: Box;
  groups: Box[];
  leaves: Box[];
  edges: Edge[];
}

// Column geometry (x = left edge, w = width). Three left-to-right tiers.
const ROW = 56; // vertical slot per leaf
const PAD = 14; // top/bottom padding
const NODE_H = 40;
const CENTER_H = 48;
const CENTER_X = 12, CENTER_W = 150;
const GROUP_X = 232, GROUP_W = 150;
const LEAF_X = 452, LEAF_W = 180;
const WIDTH = LEAF_X + LEAF_W + 12; // 644

const cy = (b: { y: number; h: number }) => b.y + b.h / 2;

/**
 * Lay out the ego network. Group nodes are vertically centered on their leaves;
 * the center node is centered on the groups. Returns boxes (top-left anchored)
 * plus the edges connecting center→group and group→leaf at box mid-heights.
 */
export function layoutEgoNetwork(
  center: { label: string; href?: string },
  groups: EgoGroup[],
): EgoLayout {
  const leaves: Box[] = [];
  const groupBoxes: Box[] = [];
  let row = 0;

  for (const g of groups) {
    const firstRow = row;
    const groupLeaves: Box[] = [];
    for (const leaf of g.leaves) {
      const box: Box = {
        x: LEAF_X,
        y: PAD + row * ROW + (ROW - NODE_H) / 2,
        w: LEAF_W,
        h: NODE_H,
        label: leaf.label,
        href: leaf.href,
        tone: leaf.tone,
      };
      leaves.push(box);
      groupLeaves.push(box);
      row++;
    }
    // A leafless group still occupies one row so it stays visible.
    if (g.leaves.length === 0) row++;

    const span = groupLeaves.length > 0
      ? (cy(groupLeaves[0]) + cy(groupLeaves[groupLeaves.length - 1])) / 2
      : PAD + firstRow * ROW + ROW / 2;

    groupBoxes.push({
      x: GROUP_X,
      y: span - NODE_H / 2,
      w: GROUP_W,
      h: NODE_H,
      label: g.label,
      href: g.href,
    });
  }

  const height = PAD * 2 + Math.max(row, 1) * ROW;
  const centerCy = groupBoxes.length > 0
    ? groupBoxes.reduce((s, b) => s + cy(b), 0) / groupBoxes.length
    : height / 2;
  const centerBox: Box = {
    x: CENTER_X,
    y: centerCy - CENTER_H / 2,
    w: CENTER_W,
    h: CENTER_H,
    label: center.label,
    href: center.href,
  };

  const edges: Edge[] = [];
  let li = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    const gb = groupBoxes[gi];
    edges.push({
      x1: centerBox.x + centerBox.w,
      y1: cy(centerBox),
      x2: gb.x,
      y2: cy(gb),
    });
    for (let k = 0; k < groups[gi].leaves.length; k++) {
      const lb = leaves[li++];
      edges.push({
        x1: gb.x + gb.w,
        y1: cy(gb),
        x2: lb.x,
        y2: cy(lb),
      });
    }
  }

  return {
    width: WIDTH,
    height,
    center: centerBox,
    groups: groupBoxes,
    leaves,
    edges,
  };
}
