/**
 * Pookalam-inspired brand mark: a concentric ring of marigold petals around a
 * coral centre. Pure inline SVG — no image download, scales crisply, and gives
 * the dashboard a warm, unmistakably Kerala identity.
 */
export function PookalamMark(
  { size = 36, class: cls = "" }: { size?: number; class?: string },
) {
  const petals = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return { cx: Math.sin(a) * 19, cy: -Math.cos(a) * 19 };
  });
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      class={cls}
      role="img"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="var(--color-primary)" />
      <g transform="translate(32 32)">
        <g fill="var(--color-accent)">
          {petals.map((p) => (
            <circle cx={p.cx.toFixed(2)} cy={p.cy.toFixed(2)} r="4.5" />
          ))}
        </g>
        <circle r="10.5" fill="var(--color-secondary)" />
        <circle r="4.5" fill="var(--color-base-100)" />
      </g>
    </svg>
  );
}
