# Kerala Mission Control

A public accountability dashboard prototype for the Government of Kerala — built
on Deno Fresh 2 + Tailwind + daisyUI. It ships the **Kerala Today** landing
screen (12 headline KPIs across fiscal, health, education, livelihood, safety,
trust, environment and service delivery, each with definition, source, owner,
update frequency, last refresh timestamp, trend, target, and comparators), a
**Government** section (cabinet, departments, ministers), and a **Promise
Tracker** that maps the UDF 2026 manifesto to the Government Orders that back it
— with those orders ingested automatically each day (see below).

> ⚠️ Independent prototype, not an official GoK product. KPI values are
> illustrative mock data shaped exactly like the production schema.

## For governments and organisations considering adoption

This project is open-source under the [MIT License](LICENSE) and is designed to
be fully self-hostable and forkable. Governments, municipal bodies, and public
accountability organizations can adapt it to build their own citizen-facing
performance dashboards.

Key attributes of this architecture include:

- **No data leaks**: The dashboard only serves public-facing data. No private,
  restricted, or non-public data is collected, stored, or exposed.
- **Auditable & traceable**: Every single figure, KPI, and data point is fully
  auditable. The AI pipeline that maps Government Orders to commitments is
  designed to be inspectable, with visible fallback behaviors.
- **Defensible standards**: To prevent propaganda and maintain citizen trust,
  every single figure displayed on the dashboard must carry:
  - A clear citizen-readable definition in both English and Malayalam.
  - A named, official publishing source (with a link to the primary source when
    available).
  - An accountable official designation as the owner of the metric.
  - A defined update frequency.
  - A clear, public target or external benchmark (comparator).

## How contributions are governed

Proposals, bug reports, and contributions are welcome. To maintain the
dashboard's credibility and strict standards:

- **Maintainer-curated**: All contributions go through manual maintainer review
  and must pass automated and human-guided checks. Nothing is automatically
  merged.
- **Data integrity & security**: Data accuracy and pipeline safety are strictly
  enforced. Please review our [Contributing Guidelines](CONTRIBUTING.md) and
  [Security Policy](SECURITY.md) before submitting code or data updates.

## What's in here

```
routes/            file-based pages and API endpoints
  _app.tsx         HTML shell
  _middleware.ts   reads lang preference cookie
  _404.tsx         not-built-yet page for tier-2 stubs
  index.tsx        Kerala Today landing
  data.tsx         Data sources & transparency overview
  economy/         Fiscal Health scorecard & status report
  gov/             government section
    index.tsx      government overview
    cabinet.tsx    cabinet section redirect
    manifesto.tsx  Promise Tracker (manifesto → backing GOs)
    ingest-status.tsx   daily ingest pipeline health
    departments/[slug].tsx, ministers/[slug].tsx
    orders/        Government Orders directory & detail views
  admin/           HTTP Basic Auth-gated admin control panel
  api/             raw JSON API endpoints (kpis, ministers, departments)
islands/           client-side interactive components (Preact)
  LangToggle.tsx   EN ↔ മല toggle
components/        server-only Preact components
data/              typed fixtures + i18n helpers (seeded into Deno KV)
  types.ts         KPI / governance / GovernmentOrder schema
  kpis.ts          headline KPI mock data
  departments.ts   department records
  ministers.ts     minister records
  governments.ts   government / cabinet records
  persons.ts       person records (stable identity across tenures)
  parties.ts       political party records
  speakers.ts      speaker records
  sources.ts       source citation records
  status-papers.ts Fiscal health status paper records
  government-orders.ts  verified GO baseline (cron adds the rest to KV)
  manifesto-goals.ts    UDF 2026 manifesto commitments
  db.ts            Deno KV layer + seeding
lib/               shared non-route modules
  gemini.ts        Gemini API client (reads PDFs natively)
  groq.ts          GROQ API client fallback for GO extraction
  ingest.ts        GO ingest pipeline (scrape → Gemini/GROQ → KV)
  cron.ts          daily Deno.cron registration
static/            static assets served from /
```

## Local development

Requires Deno ≥ 2.

```bash
deno task dev      # http://localhost:8000
deno task check    # fmt + lint + type check
deno task build    # production build into _fresh/
deno task start    # serve the production build
```

On first run Deno will fetch Fresh from JSR and Preact/Tailwind/daisyUI from
npm. If you're behind a restrictive network, you may need to allow `jsr.io`,
`deno.land` and the npm registry.

## Malayalam transcript translation

For local translation of Malayalam transcripts using NLLB-200 (requires `uv`),
run:

```bash
deno task translate data/transcripts/<id>.ml.txt
```

This uses the Python translation helper in `scripts/translate.py`. Run tests via
`deno task translate:test`.

## Government Orders ingest (Gemini + daily cron)

Government Orders (GOs) that back manifesto promises are ingested automatically,
not hand-curated. The pipeline (`lib/ingest.ts`) is runtime-safe — pure
`fetch` + Deno KV, no subprocess or filesystem — so it runs unchanged inside
Deno Deploy:

1. **Scrape** GO listings from `document.kerala.gov.in`.
2. **Extract + map** — each PDF's bytes go straight to **Gemini**
   (`gemini-flash-latest`), which reads the PDF natively and returns the order's
   number/type/date/subject (EN + ML) **and** the manifesto goal it backs.
   **Fallback:** If Gemini fails or quota is exhausted, and `GROQ_API_KEY` is
   set, the pipeline falls back to **GROQ** (`lib/groq.ts` using
   `qwen/qwen3-32b` or similar) after extracting readable text from the PDF
   bytes in memory.
3. **Persist** to Deno KV under a durable mirror that survives reseeds, so fresh
   data appears on the site with no redeploy.

`lib/cron.ts` registers a `Deno.cron` that runs this daily at 02:30 IST. Public,
read-only pipeline health (last run time, counts, errors) is shown at
`/gov/ingest-status`.

**Requires `GEMINI_API_KEY`** — set it in the Deno Deploy project env (for the
cron) and in a local `.env` (for the CLI). Use `gemini-flash-latest`;
`gemini-2.0-flash` has a zero free-tier quota on some keys. Override with
`GEMINI_MODEL`.

**Optional `GROQ_API_KEY`** — fallback credential for extraction if Gemini
fails. Set `GROQ_MODEL` to override the default `qwen/qwen3-32b`.

### Admin area

A hidden, unlinked, `noindex` admin area shows full ingest status, run history,
captured logs, and a **Force ingest now** action. It is protected by HTTP Basic
Auth via the **`ADMIN_PASSWORD`** env var (set it in Deno Deploy + local
`.env`). If `ADMIN_PASSWORD` is unset, the admin area returns 503 (never open).
The force-ingest action shares the same auth and a KV lock that prevents it
overlapping the daily cron.

Manual run / backfill (writes to local KV):

```bash
deno task ingest-gos                       # all sources, since cabinet formed
deno task ingest-gos --limit 5 --dry-run   # preview without writing
deno task ingest-gos --source orders,circulars --since 2026-05-18
```

## Deploying to Deno Deploy

Deploys are handled by the **Deno Deploy GitHub App** (Git Integration). The app
watches the repo, auto-detects Fresh, runs `deno task build`, and serves
`_fresh/server.js`. No deploy step in CI.

The live URL is set on the project in the
[Deno Deploy dashboard](https://dash.deno.com/). Set `GEMINI_API_KEY` in the
project's environment variables so the daily ingest cron can run.

`.github/workflows/ci.yml` is for verification only — it runs `deno fmt`,
`deno lint`, `deno check`, and `deno task build` on every PR and push to `main`.
It does not deploy.

## KPI taxonomy

Every KPI carries the metadata required to be defensible in public:

| Field                    | Why it matters                                              |
| ------------------------ | ----------------------------------------------------------- |
| `definition` (EN + ML)   | A citizen and a journalist must read the same definition.   |
| `source`                 | If we can't name the source, we can't publish the number.   |
| `owner`                  | The official accountable for the number, not the dashboard. |
| `updateFrequency`        | Sets reader expectations and audit cadence.                 |
| `lastRefreshed`          | If it's stale, the dot turns gray — no hiding.              |
| `target` + `comparators` | A number with no target is propaganda.                      |
| `direction`              | Determines whether ▲ is good or bad for this metric.        |

Status is computed (in the production version) from distance-to-target and trend
direction; here it's hand-set on the fixtures.

## Roadmap (next dashboards)

Tier 1 — citizen-facing, mandatory:

- [x] Kerala Today
- [x] Promise Tracker (manifesto → backing Government Orders)
- [ ] Where My Money Goes (budget → scheme → district sankey, tender hub)
- [ ] My Panchayat (geo-located LSG view)
- [ ] Service Clock (citizen service SLA delivery)

Tier 2 — department & analyst:

- [ ] Department Scorecards
- [ ] District Performance
- [ ] Tender & Procurement Hub (OCDS-compliant)
- [ ] Fiscal Health Monitor

Tier 3 — operational:

- [ ] Crisis Dashboard
- [ ] Grievance & RTI Pulse
- [ ] HR & Capacity
