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

## Deploying to Deno Deploy

Two options:

### A. Deno Deploy git integration (simplest)

1. In the Deno Deploy dashboard, create a project called
   `kerala-mission-control` and link this GitHub repo.
2. Set:
   - **Entrypoint**: `main.ts`
   - **Install step**: _(empty)_
   - **Build step**: `deno task build`
   - **Root directory**: _(empty)_
3. Push to the configured production branch and Deno Deploy builds and serves
   automatically. The URL will be `https://kerala-mission-control.deno.dev`.

### B. GitHub Actions (already wired up)

`.github/workflows/deploy.yml` is included. To enable it:

1. In your Deno Deploy project settings, link it to this GitHub repo under
   **GitHub Actions** mode (not git integration mode).
2. Push. The workflow runs `deno task build` and uploads via `deployctl`.

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
