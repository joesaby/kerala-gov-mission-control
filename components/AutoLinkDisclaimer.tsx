import type { Lang } from "../data/lang.ts";
import { t } from "../data/lang.ts";

/** Shared footer for machine-detected graph links. */
export function AutoLinkDisclaimer({ lang }: { lang: Lang }) {
  return (
    <p class="text-xs text-base-content/50 italic">
      {t(
        lang,
        "Links are machine-detected during ingest from source PDFs. They may be incomplete — verify against the official document before relying on any connection.",
        "ബന്ധങ്ങൾ ഉറവിട പി.ഡി.എഫുകളിൽ നിന്ന് ഇൻജസ്റ്റ് സമയത്ത് യന്ത്രസഹായത്താൽ കണ്ടെത്തിയതാണ്. അവ പൂർണ്ണമായിരിക്കില്ല — ആശ്രയിക്കും മുമ്പ് ഔദ്യോഗിക രേഖയുമായി ഒത്തുനോക്കുക.",
      )}
    </p>
  );
}
