import type { Lang } from "../data/lang.ts";
import type { PublicSpeech } from "../data/types.ts";

interface Props {
  speeches: PublicSpeech[];
  lang: Lang;
}

/**
 * Renders a person's public speeches — YouTube embed, bilingual title/meta,
 * optional Malayalam description, a collapsible timestamped transcript, and a
 * source link. Server-rendered. Lives on the Person hub (`/gov/people/[slug]`);
 * the caller owns the section heading and the empty-state guard.
 */
export function SpeechList({ speeches, lang }: Props) {
  return (
    <ul class="flex flex-col gap-6">
      {speeches.map((s) => (
        <li key={s.id} class="surface-card overflow-hidden">
          {/* YouTube embed */}
          {s.videoId && (
            <div class="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${s.videoId}`}
                title={s.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                class="w-full h-full"
                loading="lazy"
              />
            </div>
          )}
          <div class="p-4">
            {/* Title + meta */}
            <div class="flex flex-wrap items-start justify-between gap-2 mb-1">
              <h3
                class={`font-semibold text-base leading-snug ${
                  lang === "ml" && (s.titleMl ?? s.title) ? "ml" : ""
                }`}
              >
                {lang === "ml" && s.titleMl ? s.titleMl : s.title}
              </h3>
              <span class="badge badge-sm badge-ghost shrink-0 capitalize">
                {s.type.replace("-", " ")}
              </span>
            </div>
            <p class="text-xs text-base-content/60 mb-3">
              {s.channelName && <span>{s.channelName} ·</span>}
              <span class="tabular-nums">{s.date}</span>
            </p>

            {/* Malayalam description */}
            {s.descriptionMl && (
              <p class="text-sm text-base-content/80 ml mb-3 leading-relaxed">
                {s.descriptionMl}
              </p>
            )}

            {/* Transcript */}
            {s.transcript && s.transcript.length > 0 && (
              <details class="mt-2">
                <summary class="cursor-pointer text-xs font-medium text-base-content/60 hover:text-base-content transition select-none">
                  {lang === "ml" ? "ട്രാൻസ്ക്രിപ്റ്റ് കാണുക" : "Show transcript"}
                </summary>
                <ol class="mt-3 flex flex-col gap-2">
                  {s.transcript.map((seg) => {
                    const mins = Math.floor(seg.timeSecs / 60);
                    const secs = seg.timeSecs % 60;
                    const ts = `${mins}:${String(secs).padStart(2, "0")}`;
                    return (
                      <li key={seg.timeSecs} class="flex gap-3 text-sm">
                        {s.videoUrl
                          ? (
                            <a
                              href={`${s.videoUrl}&t=${seg.timeSecs}`}
                              class="tabular-nums text-xs text-primary link link-hover shrink-0 pt-0.5"
                              rel="external"
                              target="_blank"
                            >
                              {ts}
                            </a>
                          )
                          : (
                            <span class="tabular-nums text-xs text-base-content/40 shrink-0 pt-0.5">
                              {ts}
                            </span>
                          )}
                        <span class="ml leading-relaxed">{seg.text}</span>
                      </li>
                    );
                  })}
                </ol>
              </details>
            )}

            {/* Source */}
            {(s.source || s.sourceUrl) && (
              <p class="mt-3 text-xs text-base-content/50">
                {lang === "ml" ? "ഉറവിടം: " : "Source: "}
                {s.sourceUrl
                  ? (
                    <a
                      href={s.sourceUrl}
                      class="link link-hover"
                      rel="external"
                      target="_blank"
                    >
                      {s.source ?? s.sourceUrl}
                    </a>
                  )
                  : s.source}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
