import { page } from "fresh";
import { define } from "../utils.ts";
import { t } from "../data/lang.ts";
import { listMinisters } from "../data/db.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";

interface PortraitGroup {
  credit: string;
  items: { name: string; file: string; pageUrl: string }[];
}

interface Data {
  groups: PortraitGroup[];
  withPhoto: number;
  withoutPhoto: number;
}

/** Derive the Wikimedia Commons file-description page from a thumb URL. */
function commonsFile(thumbUrl: string): { file: string; pageUrl: string } {
  const parts = thumbUrl.split("/");
  const i = parts.indexOf("thumb");
  const file = i >= 0 ? parts[i + 3] : parts[parts.length - 1];
  const decoded = decodeURIComponent(file);
  return {
    file: decoded,
    pageUrl: `https://commons.wikimedia.org/wiki/File:${file}`,
  };
}

export const handler = define.handlers<Data>({
  async GET() {
    const ministers = await listMinisters();
    const withPhotoList = ministers.filter((m) => m.photoUrl);

    // Group by licence/credit, de-duplicating by file (a person can recur
    // across governments with the same portrait).
    const byCredit = new Map<string, Map<string, { name: string }>>();
    for (const m of withPhotoList) {
      const credit = m.photoCredit ?? "Wikimedia Commons";
      const { file } = commonsFile(m.photoUrl!);
      const bucket = byCredit.get(credit) ?? new Map();
      if (!bucket.has(file)) bucket.set(file, { name: m.name });
      byCredit.set(credit, bucket);
    }

    const groups: PortraitGroup[] = [...byCredit.entries()]
      .map(([credit, files]) => ({
        credit,
        items: [...files.entries()]
          .map(([file, { name }]) => ({
            name,
            file,
            pageUrl: `https://commons.wikimedia.org/wiki/File:${
              file.replaceAll(" ", "_")
            }`,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => b.items.length - a.items.length);

    const uniqueFiles = new Set(
      withPhotoList.map((m) => commonsFile(m.photoUrl!).file),
    );

    return page({
      groups,
      withPhoto: uniqueFiles.size,
      withoutPhoto: ministers.length - withPhotoList.length,
    });
  },
});

const APIS = [
  { href: "/api/kpis", label: "KPIs" },
  { href: "/api/departments", label: "Departments" },
  { href: "/api/ministers", label: "Ministers" },
];

export default define.page<typeof handler>(function DataPage({ data, state }) {
  const lang = state.lang;
  const { groups, withPhoto, withoutPhoto } = data;

  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Hero */}
        <section class="hero-band rounded-box border border-base-300 p-6 md:p-8 mb-8">
          <p class="eyebrow">{t(lang, "Transparency", "സുതാര്യത")}</p>
          <h1
            class={`font-display text-3xl md:text-4xl font-bold mt-1 ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {t(lang, "Data & sources", "ഡാറ്റയും ഉറവിടങ്ങളും")}
          </h1>
          <p
            class={`text-base-content/70 mt-2 max-w-2xl leading-relaxed ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {t(
              lang,
              "Every number, document and portrait on this dashboard is traceable to a public source. Here's where each comes from.",
              "ഈ ഡാഷ്ബോർഡിലെ ഓരോ കണക്കും രേഖയും ചിത്രവും ഒരു പൊതു ഉറവിടത്തിലേക്ക് കണ്ടെത്താനാകും. അവ എവിടെ നിന്നെന്ന് ഇവിടെ.",
            )}
          </p>
        </section>

        {/* Where the numbers come from */}
        <section class="mb-10">
          <h2 class="font-display text-xl font-semibold mb-3">
            {t(lang, "Where the numbers come from", "കണക്കുകൾ എവിടെ നിന്ന്")}
          </h2>
          <ul class="space-y-2 text-sm text-base-content/80 leading-relaxed list-disc pl-5">
            <li>
              {t(
                lang,
                "KPIs — each headline indicator cites its own source, owner and last-refresh date on the card itself.",
                "സൂചകങ്ങൾ — ഓരോ പ്രധാന സൂചകവും അതിന്റെ ഉറവിടവും ഉത്തരവാദിയും കാർഡിൽ തന്നെ കാണിക്കുന്നു.",
              )}
            </li>
            <li>
              {t(
                lang,
                "Government orders & cabinet decisions — auto-ingested daily from document.kerala.gov.in; each links to its source PDF.",
                "സർക്കാർ ഉത്തരവുകൾ — document.kerala.gov.in-ൽ നിന്ന് ദിവസവും ശേഖരിക്കുന്നു; ഓരോന്നും അതിന്റെ പി.ഡി.എഫിലേക്ക് ലിങ്ക് ചെയ്യുന്നു.",
              )}{" "}
              <a
                href="/gov/ingest-status"
                class="link link-hover text-primary"
              >
                {t(lang, "pipeline status", "പൈപ്പ്‌ലൈൻ നില")}
              </a>
            </li>
            <li>
              {t(
                lang,
                "Governance records (ministers, departments, governments) — Wikipedia and official press releases, cited per record.",
                "ഭരണ വിവരങ്ങൾ (മന്ത്രിമാർ, വകുപ്പുകൾ) — വിക്കിപീഡിയയും ഔദ്യോഗിക വാർത്താക്കുറിപ്പുകളും.",
              )}
            </li>
          </ul>
        </section>

        {/* APIs */}
        <section class="mb-10">
          <h2 class="font-display text-xl font-semibold mb-3">
            {t(lang, "Open JSON API", "ഓപ്പൺ JSON API")}
          </h2>
          <p class="text-sm text-base-content/70 mb-3">
            {t(
              lang,
              "The underlying data is served as plain JSON — free to read and reuse.",
              "അടിസ്ഥാന ഡാറ്റ പ്ലെയിൻ JSON ആയി ലഭ്യമാണ് — സ്വതന്ത്രമായി ഉപയോഗിക്കാം.",
            )}
          </p>
          <div class="flex flex-wrap gap-2">
            {APIS.map((a) => (
              <a
                href={a.href}
                class="surface-link px-3 py-2 font-mono text-sm hover:text-primary"
              >
                {a.href}
              </a>
            ))}
          </div>
        </section>

        {/* Images & portraits */}
        <section>
          <h2 class="font-display text-xl font-semibold mb-1">
            {t(lang, "Images & portraits", "ചിത്രങ്ങളും ഛായാചിത്രങ്ങളും")}
          </h2>
          <p class="text-sm text-base-content/70 mb-4 leading-relaxed">
            {t(
              lang,
              `Minister portraits are sourced from Wikimedia Commons under the licences below — ${withPhoto} portraits in all. The pookalam emblem and favicon are original artwork for this project. Where no free portrait exists (${withoutPhoto} ministers), a coloured initials badge is shown instead.`,
              `മന്ത്രിമാരുടെ ഛായാചിത്രങ്ങൾ വിക്കിമീഡിയ കോമൺസിൽ നിന്ന് താഴെയുള്ള ലൈസൻസുകൾ പ്രകാരം — ആകെ ${withPhoto} ചിത്രങ്ങൾ. പൂക്കളം ചിഹ്നവും ഫാവിക്കണും ഈ പ്രോജക്ടിന്റെ സ്വന്തം രൂപകൽപ്പനയാണ്. സ്വതന്ത്ര ചിത്രം ഇല്ലാത്തിടത്ത് (${withoutPhoto} മന്ത്രിമാർ) പേരിന്റെ ആദ്യാക്ഷരങ്ങൾ കാണിക്കുന്നു.`,
            )}
          </p>

          <div class="flex flex-col gap-4">
            {groups.map((g) => (
              <div class="surface-card p-5">
                <div class="flex items-baseline justify-between gap-2 mb-3">
                  <h3 class="font-semibold">{g.credit}</h3>
                  <span class="text-xs text-base-content/50 tabular-nums">
                    {g.items.length} {t(lang, "portraits", "ചിത്രങ്ങൾ")}
                  </span>
                </div>
                <ul class="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  {g.items.map((it) => (
                    <li class="flex items-baseline justify-between gap-3">
                      <span class="text-base-content/80 truncate">
                        {it.name}
                      </span>
                      <a
                        href={it.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="link link-hover text-primary shrink-0 text-xs"
                      >
                        {t(lang, "file ↗", "ഫയൽ ↗")}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p class="mt-4 text-xs text-base-content/50 leading-relaxed">
            {t(
              lang,
              "Attribution is provided as required by each licence. If you hold rights to an image and want it changed or removed, please get in touch.",
              "ഓരോ ലൈസൻസും ആവശ്യപ്പെടുന്ന ക്രെഡിറ്റ് നൽകിയിട്ടുണ്ട്. ഒരു ചിത്രത്തിന്റെ അവകാശം നിങ്ങൾക്കുണ്ടെങ്കിൽ മാറ്റാനോ നീക്കാനോ ബന്ധപ്പെടുക.",
            )}
          </p>
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
});
