import { page } from "fresh";
import { define } from "../../../utils.ts";
import { t } from "../../../data/lang.ts";
import { listPersons } from "../../../data/db.ts";
import { Header } from "../../../components/Header.tsx";
import { Footer } from "../../../components/Footer.tsx";
import { GovSubnav } from "../../../components/GovSubnav.tsx";
import { MinisterAvatar } from "../../../components/MinisterAvatar.tsx";
import type { Person } from "../../../data/types.ts";

export const handler = define.handlers({
  async GET() {
    const persons = await listPersons();
    return page({ persons });
  },
});

export default define.page<typeof handler>(function PeopleIndexPage(
  { data, state },
) {
  const lang = state.lang;
  const persons = [...data.persons].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <>
      <Header lang={lang} path={state.path} />
      <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <p class="text-xs">
          <a href="/gov" class="link link-hover text-base-content/60">
            ← {t(lang, "Government", "സർക്കാർ")}
          </a>
        </p>
        <h1
          class={`font-display text-3xl md:text-4xl font-bold mt-2 ${
            lang === "ml" ? "ml" : ""
          }`}
        >
          {t(lang, "People", "വ്യക്തികൾ")}
        </h1>
        <p class="text-base-content/70 mt-2 max-w-2xl">
          {t(
            lang,
            "Known office-holders on record — ministers, speakers, and matched appointees. Each profile merges every dated tenure we have.",
            "രേഖപ്പെടുത്തിയ ഉദ്യോഗസ്ഥർ — മന്ത്രിമാർ, സ്പീക്കർമാർ, ബന്ധിപ്പിച്ച നിയമനങ്ങൾ. ഓരോ പ്രൊഫൈലും എല്ലാ പദവികളും ഒന്നിച്ച്.",
          )}
        </p>

        <GovSubnav lang={lang} path={state.path} />

        <ul class="grid gap-3 sm:grid-cols-2">
          {persons.map((p: Person) => (
            <li key={p.id}>
              <a
                href={`/gov/people/${p.slug}`}
                class="surface-link flex items-center gap-3 p-4 rounded-box border border-base-300"
              >
                <MinisterAvatar
                  minister={{ name: p.name, photoUrl: p.photoUrl }}
                  size={48}
                  class="shrink-0"
                />
                <div class="min-w-0">
                  <div
                    class={`font-semibold truncate ${
                      lang === "ml" ? "ml" : ""
                    }`}
                  >
                    {lang === "ml" && p.nameMl ? p.nameMl : p.name}
                  </div>
                  {lang === "ml" && p.nameMl && (
                    <div class="text-xs text-base-content/50 truncate">
                      {p.name}
                    </div>
                  )}
                </div>
              </a>
            </li>
          ))}
        </ul>
      </main>
      <Footer lang={lang} />
    </>
  );
});
