import { page } from "fresh";
import { define } from "../../utils.ts";
import { listDepartments, listMinisters } from "../../data/db.ts";
import { Header } from "../../components/Header.tsx";
import { Footer } from "../../components/Footer.tsx";
import type { Department, Minister } from "../../data/types.ts";

interface Data {
  ministers: Minister[];
  depts: Department[];
}

export const handler = define.handlers<Data>({
  async GET() {
    const [ministers, depts] = await Promise.all([
      listMinisters(),
      listDepartments(),
    ]);
    return page({ ministers, depts });
  },
});

const PARTY_LABEL: Record<string, string> = {
  "INC": "Congress",
  "IUML": "IUML",
  "KC": "Kerala Congress",
  "KC(M)": "KC (M)",
  "RJD": "RSP",
  "Other": "Other",
  "Independent": "Independent",
};

export default define.page<typeof handler>(function Government(
  { data, state },
) {
  const lang = state.lang;
  const { ministers, depts } = data;
  const deptById = new Map(depts.map((d) => [d.id, d]));

  const cm = ministers.find((m) => m.rank === "CM");
  const cabinet = ministers.filter((m) => m.rank !== "CM");

  return (
    <>
      <Header lang={lang} />
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <section class="mb-8">
          <p class="text-xs uppercase tracking-wider text-base-content/60 font-medium">
            {lang === "ml" ? "സർക്കാർ" : "Government"}
          </p>
          <h1
            class={`text-3xl md:text-4xl font-bold mt-1 ${
              lang === "ml" ? "ml" : ""
            }`}
          >
            {lang === "ml" ? "കേരള മന്ത്രിസഭ" : "Council of Ministers"}
          </h1>
          <p class="text-base-content/70 mt-2 max-w-2xl">
            {ministers.length} ministers across {depts.length}{" "}
            departments. Click any minister to see the portfolios they hold and
            the KPIs their departments are accountable for.
          </p>
        </section>

        {cm && <MinisterCard m={cm} highlight />}

        <h2 class="text-xl font-semibold mt-10 mb-4">Cabinet</h2>
        <ul class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {cabinet.map((m) => (
            <li>
              <MinisterCard m={m} />
            </li>
          ))}
        </ul>

        <h2 class="text-xl font-semibold mt-12 mb-4">All departments</h2>
        <ul class="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {depts.map((d) => {
            const m = d.ministerId
              ? ministers.find((x) => x.id === d.ministerId)
              : null;
            return (
              <li>
                <a
                  href={`/gov/departments/${d.slug}`}
                  class="block p-4 rounded-lg border border-base-300 bg-base-100 hover:border-primary hover:shadow-sm transition"
                >
                  <div class="font-medium">{d.name}</div>
                  <div class="text-xs text-base-content/60 mt-0.5">
                    {m
                      ? (
                        <>
                          Minister:{" "}
                          <span class="text-base-content/80">{m.name}</span>
                        </>
                      )
                      : <span class="italic">Minister assignment pending</span>}
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </main>
      <Footer lang={lang} />
    </>
  );

  function MinisterCard(
    { m, highlight }: { m: Minister; highlight?: boolean },
  ) {
    const portfolios = m.departmentIds
      .map((id) => deptById.get(id)?.name)
      .filter(Boolean);
    return (
      <a
        href={`/gov/ministers/${m.slug}`}
        class={`block p-4 rounded-lg border bg-base-100 hover:shadow-md transition ${
          highlight
            ? "border-primary shadow-sm"
            : "border-base-300 hover:border-primary"
        }`}
      >
        <div class="flex items-baseline justify-between gap-2">
          <h3 class="font-semibold">{m.name}</h3>
          {m.party && (
            <span class="badge badge-sm badge-ghost">
              {PARTY_LABEL[m.party] ?? m.party}
            </span>
          )}
        </div>
        <div class="text-xs text-base-content/60 mt-0.5">
          {m.rank === "CM" ? "Chief Minister · " : ""}
          {m.constituency}
        </div>
        <div class="text-sm mt-2 text-base-content/80">
          {portfolios.join(" · ")}
        </div>
      </a>
    );
  }
});
