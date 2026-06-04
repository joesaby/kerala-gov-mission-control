# AGENTS.md — Kerala Mission Control

> Read this first. It tells you what the project is, how it's structured, what
> the non-negotiable rules are, and where the runnable skills live.

---

## What this project is

Kerala Mission Control is a **public accountability dashboard** for the
Government of Kerala, built on **Deno Fresh 2 + Preact + Tailwind + daisyUI**.
Every number on the dashboard must be traceable to a named source, carry a
target, and be understandable in both English and Malayalam. It is _not_ an
internal tool — it is read by journalists, citizens, and elected officials.

> ⚠️ Independent prototype, not an official GoK product. KPI values are
> illustrative mock data shaped exactly like the production schema.

---

## Tech stack at a glance

| Layer         | Technology                                         |
| ------------- | -------------------------------------------------- |
| Runtime       | Deno ≥ 2                                           |
| Framework     | Fresh 2 (`jsr:@fresh/core`)                        |
| UI components | Preact (server) + Preact Signals (islands)         |
| Styling       | Tailwind CSS 4 + daisyUI 5                         |
| Data          | Typed TypeScript fixtures in `data/`               |
| Deploy        | Deno Deploy (Git Integration, auto-builds on push) |

---

## Repository layout

```
routes/               File-based pages and API endpoints (Fresh convention)
  _app.tsx            HTML shell
  _middleware.ts      Reads lang preference cookie (EN / ML)
  _404.tsx            Stub page for unbuilt tier-2 routes
  index.tsx           Kerala Today landing (headline KPIs)
  data.tsx            Data sources & transparency overview
  economy/            Fiscal Health scorecard & status report
  gov/                Government section
    index.tsx         Government composition page
    cabinet.tsx       cabinet section redirect
    manifesto.tsx     Promise Tracker (manifesto → backing GOs)
    ingest-status.tsx daily ingest pipeline health
    departments/      Department detail routes
    ministers/        Minister detail routes
    orders/           Government Orders directory & detail views
  admin/              HTTP Basic Auth-gated admin control panel
  api/
    kpis.ts           Raw KPI JSON endpoint
    ministers.ts      Raw ministers JSON endpoint
    departments.ts    Raw departments JSON endpoint

islands/              Client-side interactive Preact components (hydrated)
  LangToggle.tsx      EN ↔ മല language toggle

components/           Server-only Preact components (never hydrated)
  KpiCard.tsx         Dashboard KPI card (value, trend, status, tooltip)
  TrendArrow.tsx      ▲/▼ arrow driven by direction + trend
  StatusBadge.tsx     on-track / slipping / off-track / improving badge
  Header.tsx          Site header with language toggle
  Footer.tsx          Site footer
  MinisterAvatar.tsx  Minister photo + name + role

data/                 Typed fixtures — source of truth for all content
  types.ts            KPI, Department, Minister, Government type definitions
  kpis.ts             Headline KPI mock data (HEADLINE_KPIS array)
  departments.ts      Department records
  ministers.ts        Minister records
  governments.ts      Government / cabinet records
  persons.ts          Person records (stable identity across tenures)
  parties.ts          Political party records
  speakers.ts         Speaker records
  sources.ts          Source citation records
  status-papers.ts    Fiscal health status paper records
  db.ts               In-memory seeded DB + query helpers (SEED_VERSION here)
  lang.ts             Language helpers (EN/ML cookie name, default)
  government-orders.ts  Government Orders, Circulars, and Bills
  manifesto-goals.ts  UDF 2026 manifesto commitments

lib/                  Shared non-route modules
  gemini.ts           Gemini API client (reads PDFs natively)
  groq.ts             GROQ API client fallback for GO extraction
  ingest.ts           GO ingest pipeline (scrape → Gemini/GROQ → KV)
  cron.ts             daily Deno.cron registration

scripts/
  seed.ts             Re-seeds the in-memory DB (run via `deno task seed`)
  translate.py        Malayalam translation helper (uv run)

static/               Static assets served from /
.claude/
  skills/             Runnable skill scripts for common tasks (see below)
  agents/             Agent configuration
  hooks/              Hook scripts
```

---

## Development commands

```bash
deno task dev          # Start dev server on http://localhost:8000 (hot reload)
deno task check        # fmt --check + lint + type check (must pass before commit)
deno task build        # Production build into _fresh/
deno task start        # Serve the production build
deno task seed         # Re-seed the in-memory DB
deno task translate    # Run Malayalam translation helper
```

**CI gate:** `.github/workflows/ci.yml` runs `deno task check` +
`deno task
build` on every PR and push to `main`. Both must pass. Deploys are
handled automatically by Deno Deploy — there is no manual deploy step.

---

## Non-negotiable rules

These apply to **every** change, no exceptions.

### 1. Defensibility — every number must be traceable

From the README: _"A number with no target is propaganda."_

All data added to the dashboard must carry:

| Field               | Rule                                                                          |
| ------------------- | ----------------------------------------------------------------------------- |
| `meta.source`       | Name the actual agency / document — not "internal dashboard"                  |
| `meta.sourceUrl`    | Link to the public source when it exists                                      |
| `meta.owner`        | The accountable official's designation, not "Mission Control"                 |
| `meta.definition`   | Citizen-readable, one sentence                                                |
| `meta.definitionMl` | Same definition in Malayalam — bilingual parity is a product promise          |
| `target`            | If there's no target, the KPI does not ship                                   |
| `comparators[]`     | At least one external benchmark (peer state, national avg, statutory ceiling) |

### 2. Tooltip rule — mandatory for every new data point

**Every new piece of information added to the dashboard MUST display a tooltip
that surfaces its source data** — at minimum `meta.source`, and `meta.sourceUrl`
as a clickable link when available.

A number the citizen cannot trace back to a primary source is not a public
number. **No tooltip = no merge.**

### 3. Bilingual parity

Every user-visible string must exist in both English and Malayalam. The `*Ml`
fields (`titleMl`, `definitionMl`, `nameMl`, …) are typed as optional so the
type system won't catch gaps — you must check manually. Never machine-translate
Malayalam government terminology; wrong term = wrong meaning.

### 4. SEED_VERSION bump

Any change to `data/kpis.ts`, `data/departments.ts`, or `data/ministers.ts` that
adds or removes records **must** bump `SEED_VERSION` in `data/db.ts`. Without
this the in-memory DB will not re-seed and changes will not appear.

### 5. Check must pass

Run `deno task check` before every commit. fmt + lint + type check must all be
green. CI will reject the PR otherwise.

---

## Available skills

Skills are pre-written instruction sets for common tasks. Run them by invoking
the skill name in a supported AI coding tool.

| Skill             | Location                                  | Use when                                                                         |
| ----------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| `add-kpi`         | `.claude/skills/add-kpi/SKILL.md`         | Adding any headline or tier-2 KPI                                                |
| `bilingual-audit` | `.claude/skills/bilingual-audit/SKILL.md` | Checking EN/ML parity gaps before a PR                                           |
| `ingest-go`       | `.claude/skills/ingest-go/SKILL.md`       | Fetching, tagging, and storing a Kerala Government Order, Circular, SRO, or Bill |

---

## Key invariants to preserve

- `KpiCard.tsx` is server-only — never add `"use client"` or Preact Signals to
  it
- `LangToggle.tsx` is an island — it must remain in `islands/`, not
  `components/`
- `data/types.ts` is the single source of type truth — don't duplicate types
  elsewhere
- IDs are namespaced: KPIs as `<domain>.<slug>`, departments as `dept.<id>`,
  ministers as `min.<id>`
- `direction: "higher-better" | "lower-better"` drives `TrendArrow.tsx`
  semantics — get it right (Infant Mortality Rate is `lower-better`)
- `status` is hand-set in fixtures; production computes it from
  distance-to-target + direction — don't change the computation logic without
  updating the fixtures too

---

## Roadmap context

| Tier | Dashboard                | Status     |
| ---- | ------------------------ | ---------- |
| 1    | Kerala Today             | ✅ shipped |
| 1    | Where My Money Goes      | 🔲 next    |
| 1    | Promises Tracker         | 🔲 planned |
| 1    | My Panchayat             | 🔲 planned |
| 1    | Service Clock            | 🔲 planned |
| 2    | Department Scorecards    | 🔲 planned |
| 2    | District Performance     | 🔲 planned |
| 2    | Tender & Procurement Hub | 🔲 planned |
| 2    | Fiscal Health Monitor    | 🔲 planned |
| 3    | Crisis Dashboard         | 🔲 planned |
| 3    | Grievance & RTI Pulse    | 🔲 planned |
| 3    | HR & Capacity            | 🔲 planned |

New routes live under `routes/` following Fresh file-based routing conventions.
Stub out unbuilt pages with `routes/_404.tsx` redirects until ready.
