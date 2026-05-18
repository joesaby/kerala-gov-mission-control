# Kerala Mission Control

A public accountability dashboard prototype for the Government of Kerala — built
on Deno Fresh 2 + Tailwind + daisyUI. This first cut ships the **Kerala Today**
landing screen: 12 headline KPIs across fiscal, health, education, livelihood,
safety, trust, environment and service delivery, each with definition, source,
owner, update frequency, last refresh timestamp, trend, target, and comparators.

> ⚠️ Independent prototype, not an official GoK product. KPI values are
> illustrative mock data shaped exactly like the production schema.

## What's in here

```
routes/            file-based pages and API endpoints
  _app.tsx         HTML shell
  _middleware.ts   reads lang preference cookie
  _404.tsx         not-built-yet page for tier-2 stubs
  index.tsx        Kerala Today landing
  api/kpis.ts      raw KPI JSON (machine-readable)
islands/           client-side interactive components (Preact)
  LangToggle.tsx   EN ↔ മല toggle
components/        server-only Preact components
data/              typed KPI fixtures + i18n helpers
  types.ts         KPI / metadata schema
  kpis.ts          headline KPI mock data
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

## Translate a Malayalam transcript to English

After you have a `data/transcripts/<id>.ml.txt` file (produced by the upcoming
`deno task transcript` pipeline on a separate branch), translate it to English
locally with NLLB-200:

```bash
deno task translate data/transcripts/<id>.ml.txt
```

Produces `data/transcripts/<id>.en.txt` alongside the source file. The first run
downloads the NLLB-200 distilled-600M model (~2.4 GB) from Hugging Face and
caches it under `~/.cache/huggingface`. Subsequent runs reuse the cache.

**One-time setup:**

```bash
brew install uv          # or: curl -LsSf https://astral.sh/uv/install.sh | sh
```

`uv` manages a Python ≥3.10 interpreter, an isolated virtual environment, and
the Python dependencies declared inline in `scripts/translate.py`. You do not
need to manage Python or pip yourself.

**Flags:**

- `--out <dir>` writes the output elsewhere (default: same directory as input).
- `--force` overwrites an existing `.en.txt` or ignores a stale `.partial`.

**Resume:** The script writes a `.partial` file as it goes. If you Ctrl+C or the
process dies, re-run the same command and it picks up from the last completed
paragraph.

**Tests:** `deno task translate:test` runs the pytest suite for the pure helpers
(transcript parsing, chunking, header building, paragraph collapse).

## Deploying to Deno Deploy

Deploys are handled by the **Deno Deploy GitHub App** (Git Integration). The app
watches the repo, auto-detects Fresh, runs `deno task build`, and serves
`_fresh/server.js`. No deploy step in CI.

The live URL is set on the project in the
[Deno Deploy dashboard](https://dash.deno.com/).

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
- [ ] Where My Money Goes (budget → scheme → district sankey, tender hub)
- [ ] Promises Tracker (manifesto + budget commitments)
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
