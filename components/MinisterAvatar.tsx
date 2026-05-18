import type { Minister } from "../data/types.ts";

interface Props {
  minister: Pick<Minister, "name" | "photoUrl">;
  /** Pixel size for the square. */
  size?: number;
  class?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Square portrait for a minister. Falls back to a daisyUI badge with the
 * minister's initials when no photoUrl is set, so the layout never breaks.
 */
export function MinisterAvatar(
  { minister, size = 56, class: cls = "" }: Props,
) {
  const dim = `${size}px`;
  if (minister.photoUrl) {
    return (
      <img
        src={minister.photoUrl}
        alt={`Portrait of ${minister.name}`}
        loading="lazy"
        width={size}
        height={size}
        class={`rounded-full object-cover ring-1 ring-base-300 bg-base-200 ${cls}`}
        style={{ width: dim, height: dim }}
      />
    );
  }
  return (
    <div
      class={`rounded-full bg-base-200 ring-1 ring-base-300 flex items-center justify-center text-base-content/60 font-semibold ${cls}`}
      style={{
        width: dim,
        height: dim,
        fontSize: `${Math.round(size / 2.6)}px`,
      }}
      aria-label={`Avatar for ${minister.name}`}
    >
      {initials(minister.name)}
    </div>
  );
}
