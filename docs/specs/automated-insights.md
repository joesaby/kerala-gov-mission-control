# Specification: Automated Insight Synthesis

> Status: Proposed — not yet implemented. This spec describes the design for a
> periodic LLM-driven reasoning layer that proposes narrative cross-entity
> hypotheses over the knowledge graph. It does NOT describe any currently
> running code. Implementation is gated on Phase 1 review approval.

---

## 1. Goal & Non-Goals

### 1.1 Goal

The dashboard already has a deterministic "automated learnings" layer: pure
counting and arithmetic over the knowledge graph — GO velocity anomalies per
department, coverage gaps, appointment churn rates. These are fully auditable
and human-replicable.

The insight synthesis layer sits **on top of that** as a second, distinct tier.
Its job is to propose **narrative, cross-entity hypotheses** that a human
counting by hand would be unlikely to spot: e.g., "appointment churn in Dept X
in weeks 1–3 precedes a GO surge from Dept Y in weeks 4–6 — possible coordinated
initiative", or "three departments with overlapping manifesto goals have
received no GOs in 90 days while a fourth has received 40". A reasoning model is
used because the signal is relational and temporal, not arithmetic: the value is
in the framing and the cross-entity connection, not in any single number.

### 1.2 Non-Goals

- **Does not compute KPI values.** The synthesis layer reads from the graph; it
  NEVER writes to any KPI record, `data/kpis.ts`, or any entity that is a source
  of truth. The only things it writes are `["hypothesis", id]` entries in KV — a
  derived projection.
- **Does not replace the deterministic layer.** Deterministic findings (velocity
  anomalies, coverage gaps) are always preferred when a count suffices. The LLM
  is called only for pattern-framing across entities the deterministic layer
  surfaces separately.
- **Does not auto-publish anything.** No hypothesis reaches a public page
  without a human approval step. See Section 6.
- **Does not create or modify Person / Minister / Department / Party records.**
  It is read-only with respect to all source-of-truth fixtures.
- **Does not replace government sources for KPI updates.** If a hypothesis
  suggests a KPI may be moving, the reviewer's job is to look up the official
  source — not to treat the hypothesis as evidence.

---

## 2. Epistemics & Guardrails

This is the most important section of the spec. The product's credibility rests
on it. Every design decision in later sections derives from these principles.

### 2.1 Human gate — mandatory, not optional

Every hypothesis is `reviewState: "pending"` until a human reviewer explicitly
sets it to `"approved"` or `"rejected"` via the admin queue (Section 6). A
pending or rejected hypothesis is **never visible on any public page**, under
any circumstances. There is no auto-approve path, no confidence threshold that
bypasses review, and no time-based promotion.

### 2.2 Provenance — every claim anchors to real IDs

A hypothesis is only stored if it includes at least one `evidenceRef` pointing
to a real, resolvable entity id in KV (`go.*`, `kpi.*`, `appt.*`, `dept.*`,
`person.*`). The synthesis prompt (Section 5) explicitly instructs the model to
refuse to generate a hypothesis if it cannot cite supporting entity ids. The
reviewer can click through every reference before approving.

### 2.3 Language — correlational, never causal

The stored `claimEn` / `claimMl` fields (and the UI rendering them) must use
hedged, correlational language only:

- Allowed: "co-moves with", "followed by", "preceded by", "worth investigating",
  "may indicate", "appears to track", "no GOs found in N days"
- Forbidden: "caused", "resulted in", "proves", "demonstrates", "confirms",
  "shows that"

The synthesis prompt enforces this vocabulary constraint. The reviewer should
reject any hypothesis whose claim language overstates certainty.

### 2.4 Minimum-evidence thresholds

A hypothesis must meet **all** of the following before the model may generate
it:

| Condition                                       | Minimum  |
| ----------------------------------------------- | -------- |
| Number of distinct entity ids in `evidenceRefs` | ≥ 2      |
| Time window covered by the evidence             | ≥ 7 days |
| Number of GOs or appointments cited             | ≥ 1      |

The prompt includes these as hard constraints. The model must self-report
whether it meets them; if it does not, it outputs `null` for that candidate.
Hypotheses that arrive in the JSON response with evidence counts below threshold
are discarded before storage by the runtime.

### 2.5 Avoiding spurious correlation

The synthesis prompt explicitly instructs the model:

- "Co-occurrence is not causation. Report only patterns where the structural
  relationship in the graph makes a link plausible — e.g., the same department
  appears as both `ISSUED_BY` source and `OWNED_BY` target."
- "Do not generate a hypothesis if the only evidence is temporal proximity with
  no shared entity."
- "State explicitly which graph edges connect your cited entities."

### 2.6 Reviewer reject / approve semantics

- `"approved"` — the reviewer believes the hypothesis is plausible, correctly
  hedged, and safe to surface publicly. The item appears on the public insights
  page (Phase 2 only) with its provenance links and the `machine-generated` /
  `human-reviewed` badge.
- `"rejected"` — the reviewer found the hypothesis spurious, misleading, or
  badly hedged. The item is retained in KV (for audit purposes, capped by
  `MAX_HYPOTHESIS_HISTORY`) but never surfaced publicly. `rejectionNote` records
  the reason.
- `"pending"` — no public surfacing, no action taken. All freshly generated
  hypotheses start here.

Reviewers can also re-open a `"rejected"` hypothesis to `"pending"` if the
underlying data has changed significantly (e.g., a repair pass added GOs that
strengthen the evidence).

---

## 3. Data Model

### 3.1 `Hypothesis` interface (proposed addition to `data/types.ts`)

```typescript
/**
 * A machine-generated, human-gated narrative hypothesis about cross-entity
 * patterns in the knowledge graph.
 *
 * This is a DERIVED PROJECTION — never a source of truth. The authoritative
 * data is always the entity records the `evidenceRefs` point to. A hypothesis
 * is rebuilt or discarded whenever the underlying graph changes significantly.
 *
 * IDs: "hyp.<YYYY-MM-DD>-<slug>", e.g. "hyp.2026-06-26-finance-churn-0".
 */
export interface Hypothesis {
  id: string;
  /** ISO timestamp the synthesis model generated this entry. */
  generatedAt: string;
  /**
   * Semantic kind of pattern the hypothesis describes.
   * - "go-velocity-shift"  — unusual GO rate change in one or more departments
   * - "appointment-churn"  — above-average appointment turnover in a dept/branch
   * - "cross-dept-signal"  — apparent co-movement between two or more departments
   * - "manifesto-coverage" — manifesto goal with sparse or accelerating GO backing
   * - "kpi-go-comovement"  — GO activity pattern that tracks alongside a KPI trend
   */
  kind:
    | "go-velocity-shift"
    | "appointment-churn"
    | "cross-dept-signal"
    | "manifesto-coverage"
    | "kpi-go-comovement";
  /**
   * The English narrative claim. Must use correlational language only (see
   * Section 2.3). Machine-generated; flagged as machine-draft.
   */
  claimEn: string;
  /**
   * Malayalam narrative claim. Machine-translated from claimEn by the synthesis
   * model. Must carry translationStatus: "machine-draft" until reviewed by a
   * Malayalam speaker.
   */
  claimMl?: string;
  /** Provenance of the *Ml string. Always "machine-draft" at generation time. */
  translationStatus?: TranslationStatus;
  /**
   * The entity ids and their human-readable URLs that the hypothesis is grounded
   * in. Every id must resolve to a real KV record at generation time.
   */
  evidenceRefs: EvidenceRef[];
  /**
   * Model-assigned confidence. 0.0 = highly speculative, 1.0 = very strong
   * pattern. The model is instructed to stay below 0.7 for cross-entity signals
   * with fewer than 5 supporting entities. This is advisory for the reviewer —
   * it does not gate public surfacing.
   */
  confidence: number;
  /**
   * Which synthesis model + fallback tier produced this hypothesis.
   * E.g. "gemini-2.5-pro" or "openrouter(anthropic/claude-3.5-sonnet)".
   */
  model: string;
  /** The window of graph deltas fed to the model for this hypothesis. */
  windowStart: string; // ISO date
  windowEnd: string; // ISO date
  /** Admin review state. Only "approved" items surface publicly. */
  reviewState: "pending" | "approved" | "rejected";
  /** ISO timestamp the reviewer acted. */
  reviewedAt?: string;
  /** Free-text note from the reviewer (required on rejection). */
  reviewerNote?: string;
}

/**
 * One piece of evidence anchoring a hypothesis to real KV records.
 * `id` must resolve; `url` is the dashboard route for that entity.
 */
export interface EvidenceRef {
  /** The entity id verbatim, e.g. "go.2026-fin-162", "dept.finance". */
  id: string;
  /** Entity kind for display grouping. */
  kind:
    | "go"
    | "kpi"
    | "appointment"
    | "department"
    | "person"
    | "manifesto_goal";
  /** Short English label for the evidence (e.g. "G.O.(P) No.162/2026/Fin"). */
  label: string;
  /** Dashboard URL the reviewer can click through (relative). */
  url: string;
  /** The graph edge type connecting this entity to the hypothesis subject. */
  viaEdge?: GraphEdgeType;
}
```

### 3.2 KV layout (proposed addition to `data/db.ts` layout comment)

```
["hypothesis", id]               -> Hypothesis   (derived projection)
["hypothesis_by_kind", kind, id] -> null          (secondary index)
["hypothesis_by_state", reviewState, id] -> null  (secondary index for queue)
["meta", "hypothesis_run_status"] -> HypothesisRunStatus
```

The `["hypothesis"]` prefix is a derived projection — the same philosophical
status as the `["nodes"]` and `["edges_*"]` graph keys. It is rebuilt from the
graph deltas on each synthesis run. It is **never** wiped by `seed()` (same
pattern as `["go_ingested"]` and `["appointment_ingested"]`), because approved
hypotheses contain reviewer decisions that cannot be re-derived.

`MAX_HYPOTHESIS_HISTORY` (proposed: 500) caps total stored hypotheses, evicting
the oldest rejected ones first.

### 3.3 `HypothesisRunStatus` interface

```typescript
/** Outcome of the most recent synthesis run. ["meta", "hypothesis_run_status"]. */
export interface HypothesisRunStatus {
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  trigger: "cron" | "manual";
  model: string;
  windowStart: string;
  windowEnd: string;
  /** Graph delta fed to the model: node count + edge count. */
  deltaNodes: number;
  deltaEdges: number;
  /** Hypotheses generated by the model this run. */
  generated: number;
  /** Hypotheses discarded (below evidence threshold or duplicate). */
  discarded: number;
  /** Hypotheses stored (now pending review). */
  stored: number;
  errors: string[];
}
```

---

## 4. Pipeline & Model Chunking

### 4.1 Schedule

A separate `Deno.cron` job (`weekly-insight-synthesis`) runs at **03:30 IST
every Sunday** (22:00 UTC Saturday) — well after the daily GO ingest (02:30
IST). The offset is intentional: the synthesis window is the **preceding seven
days** of new/updated graph edges, so Sunday morning always captures a full
calendar week.

The job uses the same guard pattern as `registerIngestCron()` — it self-disables
when `Deno.cron` is unavailable (local dev without `--unstable-cron`) or when
`SYNTHESIS_MODEL_KEY` is not set. This keeps `deno task dev` and CI clean.

```
CRON_SCHEDULE_SYNTHESIS = "0 22 * * 0"  // Sunday 22:00 UTC
```

### 4.2 Input: bounded graph delta

The synthesis model receives **only the delta** — edges and nodes written or
updated in the past seven days — not the full graph. This bounds the token
footprint to something predictable regardless of total graph size.

Extraction process (pseudo-code; actual implementation in `lib/synthesis.ts`):

```
windowStart = sevenDaysAgo()
windowEnd   = now()

// Scan KV for edges dated within the window (edge properties carry `date`)
newEdges = listEdgesSince(windowStart)          // capped at SYNTHESIS_EDGE_LIMIT

// Resolve each edge to a lightweight summary (no PDF bytes, just structured fields)
nodeSummaries = resolveNodes(newEdges.flatMap(e => [e.sourceId, e.targetId]))

// Assemble the structured delta payload (JSON, not raw text)
delta = { windowStart, windowEnd, edges: newEdges, nodes: nodeSummaries }
```

`SYNTHESIS_EDGE_LIMIT` (proposed: 200 edges) prevents token overrun. If the
delta exceeds the limit, the pipeline logs a warning and trims to the most
recent 200 edges by date. Future work: chunk into multiple runs by domain.

### 4.3 Model tier — free reasoning model via existing clients

The existing ingest pipeline uses **cheap, fast classification models** (Gemini
Flash, OpenRouter Gemini Flash Lite, NVIDIA Llama 70B) for the per-document
field extraction. Those models are optimised for throughput: ~60 PDFs per run,
multiple runs per day.

The synthesis layer is structurally different: **one call per weekly run**, over
a bounded JSON payload. This means:

- Free-tier daily-request caps (~200 req/day on NVIDIA NIM) are a non-issue —
  the synthesis job makes ≈1 API call per week.
- Latency is a non-issue — a reasoning model that takes 30–60 seconds per
  response is fine for a background cron, unlike per-document extraction where
  latency multiplies across 60 PDFs.
- The slowness that disqualified reasoning models from the bulk extraction chain
  (e.g., `sarvamai/sarvam-m` emitting hidden think tokens and returning
  empty/timeout responses) is **not a problem** here, provided the model
  reliably produces strict JSON on a single call.

**The synthesis layer therefore defaults to a free-tier model** and is designed
to cost near-zero. Token cost is not the binding constraint — the reviewer's
time is.

#### Model selection

The configurable env var is `INSIGHTS_MODEL` (following the exact pattern of
`GEMINI_MODEL` / `NVIDIA_MODEL` / `OPENROUTER_MODEL` in the ingest chain):

```
INSIGHTS_MODEL = Deno.env.get("INSIGHTS_MODEL") ?? DEFAULT_INSIGHTS_MODEL
```

**Default:** `nvidia/llama-3.3-nemotron-super-49b-v1` via the existing
`lib/nvidia.ts` client (NVIDIA NIM free tier). This model is a reasoning-
optimised variant of the Llama 3.3 family and is available on the NVIDIA NIM
free tier at build.nvidia.com. Verify the exact slug against build.nvidia.com
before implementing — NIM model slugs change between releases.

**Candidate free reasoning models (in preference order):**

| Rank | Model slug (verify before use)                   | Provider           | Why                                                                              |
| ---- | ------------------------------------------------ | ------------------ | -------------------------------------------------------------------------------- |
| 1    | `nvidia/llama-3.3-nemotron-super-49b-v1`         | NVIDIA NIM         | Free tier; reasoning-optimised; reuses `lib/nvidia.ts` with no new dependency    |
| 2    | `qwen/qwen3-30b-a3b:free` or `qwen/qwq-32b:free` | OpenRouter `:free` | Strong reasoning; reuses `lib/openrouter.ts`; `:free` tier has no per-token cost |
| 3    | `deepseek/deepseek-r1:free`                      | OpenRouter `:free` | Strongest open reasoning model; same client reuse                                |

All three reuse existing clients (`lib/nvidia.ts` or `lib/openrouter.ts`) — no
new provider dependency, no new env var for an API key.

**JSON-mode validation requirement:** Before any model is adopted as the
default, it must be tested for reliable strict-JSON output on a representative
synthesis prompt. The ingest chain learned this lesson from `sarvamai/sarvam-m`
(returned empty whitespace in JSON mode). The implementation PR must include a
`lib/synthesis_test.ts` fixture that asserts the model returns a parseable JSON
array for a sample delta. If the chosen default fails this test, fall back to
the next candidate.

**Fallback:** If `NVIDIA_KEY` is set, use `lib/nvidia.ts` with `INSIGHTS_MODEL`.
If not, use `lib/openrouter.ts` with `OPENROUTER_API_KEY` and `INSIGHTS_MODEL`
(an OpenRouter `:free` model). No paid tier is required; if neither key is set,
the cron self-disables with a warning (same pattern as the ingest cron).

| Env var                     | Purpose                                     | Default                                  |
| --------------------------- | ------------------------------------------- | ---------------------------------------- |
| `INSIGHTS_MODEL`            | Free reasoning model slug                   | `nvidia/llama-3.3-nemotron-super-49b-v1` |
| `NVIDIA_KEY`                | NVIDIA NIM API key (already used by ingest) | —                                        |
| `OPENROUTER_API_KEY`        | OpenRouter API key (already used by ingest) | —                                        |
| `DISABLE_INSIGHT_SYNTHESIS` | Kill switch                                 | unset (cron runs)                        |

No new API key env vars are needed: the synthesis layer reuses whichever of
`NVIDIA_KEY` / `OPENROUTER_API_KEY` is already present in the deployment.

**Why not GROQ here?** GROQ (`lib/groq.ts`) is retained as a fast text-only
client for lightweight pipeline stages (graph inference, quick classification).
The synthesis task requires multi-step relational reasoning over a structured
JSON payload; the NVIDIA NIM / OpenRouter reasoning-model tier is better suited
and has native JSON-mode support.

### 4.4 Cost bounding

- Weekly cadence: 52 calls/year — a handful of API calls per run (one call for
  the synthesis prompt; one optional translation call for `claimMl`).
- Input payload: ~200 edges × ~500 tokens each (structured JSON) ≈ 100K tokens.
- Output: JSON array of ≤10 hypotheses × ~200 tokens each ≈ 2K tokens.
- **Estimated cost: ~$0.00/run** on the free tier. The kill switch
  (`DISABLE_INSIGHT_SYNTHESIS`) can be flipped instantly if any cost is observed
  (e.g., a model slug change accidentally routing to a paid tier).
- The binding cost is the reviewer's time (Section 6), not tokens.

### 4.5 Runtime safety

The pipeline must be **runtime-safe** — pure `fetch` + Deno KV, no subprocess,
no filesystem writes — so it runs unchanged inside Deno Deploy. This mirrors the
existing ingest pipeline constraint (CLAUDE.md "runtime-safe").

No PDF bytes are passed to the synthesis model. The input is the structured JSON
delta (already in KV) serialised as a UTF-8 string in the request body. The
output is a JSON array parsed in memory and written to KV.

The synthesis cron uses the same `tryAcquireIngestLock` / `releaseIngestLock`
serialisation pattern as the ingest cron — or a separate lock key
(`["meta", "synthesis_lock"]`) if the two jobs need to run concurrently. The
lock auto-expires (proposed: 20 minutes) so a crashed run cannot wedge future
executions.

---

## 5. The Prompt

### 5.1 System prompt (sketch)

```
You are an evidence-grounded government-accountability analyst for the Kerala
Mission Control dashboard. You will be given a structured JSON "delta" of new
knowledge-graph edges added in the past seven days. Your job is to identify
cross-entity patterns that are:
  (a) grounded in at least two distinct entity ids from the delta
  (b) non-obvious (not a single-entity count a human would notice immediately)
  (c) expressed in correlational language — never causal

CONSTRAINTS:
- Output ONLY a JSON array of hypotheses (schema below). No prose, no markdown.
- Each hypothesis MUST include evidenceRefs listing every entity id that supports
  it. Do NOT cite an id that is not present in the provided delta.
- Refuse to generate a hypothesis if you cannot satisfy the evidence threshold:
  ≥ 2 distinct entity ids, ≥ 7 days of evidence window, ≥ 1 GO or appointment.
  For a refused candidate, omit it from the output entirely (do not emit null).
- For confidence: use ≤ 0.5 if fewer than 3 entities support the claim,
  ≤ 0.7 if fewer than 5. Never exceed 0.9.
- claimEn must use ONLY: "co-moves with", "appears to track", "followed by",
  "preceded by", "worth investigating", "may indicate", "no GOs found in N days".
  NEVER use: "caused", "resulted in", "proves", "demonstrates", "confirms".
- claimMl is a Malayalam translation of claimEn. If you cannot produce accurate
  Malayalam, omit claimMl entirely — do not guess.
- State explicitly which graph edge type (ISSUED_BY, IMPACTS, APPOINTED_TO, etc.)
  connects each cited entity to the hypothesis subject.
- Maximum 10 hypotheses per response. Prefer quality over quantity.
```

### 5.2 User prompt (sketch)

```
Graph delta for the window <windowStart> to <windowEnd>:

<JSON: { windowStart, windowEnd, edges: [...], nodes: {...} }>

Identify cross-entity patterns. Output JSON only:

[
  {
    "kind": "go-velocity-shift" | "appointment-churn" | "cross-dept-signal"
             | "manifesto-coverage" | "kpi-go-comovement",
    "claimEn": "...",
    "claimMl": "...",    // omit if uncertain
    "evidenceRefs": [
      { "id": "<entity-id>", "kind": "go|kpi|appointment|department|person|manifesto_goal",
        "label": "...", "url": "/gov/...", "viaEdge": "ISSUED_BY" }
    ],
    "confidence": 0.0–1.0
  }
]
```

### 5.3 Response validation

The runtime validates each item in the JSON array before storing:

1. `evidenceRefs` length ≥ 2, each `id` is non-empty and present in the provided
   delta (simple set membership check — no extra KV read needed).
2. `confidence` in `[0.0, 1.0]`.
3. `claimEn` does not contain forbidden causal verbs (basic string check as a
   second guard, in addition to the prompt constraint).
4. `kind` is one of the allowed values.

Items failing any check are discarded and logged to the run status. The run
continues; one bad item does not abort the batch.

---

## 6. Surfacing & Review Flow

### 6.1 Admin review queue

The review queue lives at `/admin/insights` — under the existing
`routes/admin/_middleware.ts` HTTP Basic Auth gate (same `ADMIN_PASSWORD` env
var). It is unlinked, `noindex`, and never reachable from any public page.

The queue page shows:

- All `reviewState: "pending"` hypotheses (newest first), with:
  - The `claimEn` text and `claimMl` (if present, labelled "machine-draft")
  - Confidence badge
  - `kind` label
  - Clickable evidence links (`EvidenceRef.url`) to the source entities
  - The graph edge path connecting the entities
  - `Approve` / `Reject` buttons (the reject action requires a `reviewerNote`)
- A separate tab for `"rejected"` hypotheses (for audit)
- A `HypothesisRunStatus` panel (mirroring the ingest status panel)

The `Approve` / `Reject` actions are handled by a new island
(`AdminInsightReview`) posting to `/admin/insights/review`, authenticated by the
same middleware. Approval sets `reviewState: "approved"`, `reviewedAt`, and
updates the `["hypothesis_by_state"]` index.

### 6.2 Public insights page

Only applies in Phase 2 (Section 7). Approved hypotheses appear at
`/gov/insights` (new public route). Each card shows:

- The `claimEn` / `claimMl` claim text
- A "Machine-generated · Human-reviewed" badge
- The evidence links (same `EvidenceRef.url` entries)
- The date range the hypothesis covers (`windowStart` to `windowEnd`)
- **No** confidence score — the public does not need to reason about model
  self-ratings; the human approval is the quality signal

The page is server-rendered (Fresh handler + component, no island needed for the
read path). Language switching works via `state.lang` → `claimEn` vs `claimMl`,
consistent with the rest of the dashboard.

### 6.3 Kill switch

The env var `DISABLE_INSIGHT_SYNTHESIS=true` suppresses:

- The `Deno.cron` registration (in `lib/synthesis.ts`)
- The public `/gov/insights` route (returns 404 or redirects)
- The admin queue page (still protected by Basic Auth even when the cron is off,
  so previously generated hypotheses remain reviewable)

This allows the feature to be deployed to the admin queue (Phase 1) and promoted
to public (Phase 2) without a code change — only an env var flip.

---

## 7. Phased Rollout

### Phase 1 — Generate + admin review queue only (no public surface)

Deliverables:

- `data/types.ts`: `Hypothesis`, `EvidenceRef`, `HypothesisRunStatus` interfaces
- `data/db.ts`: KV accessors (`putHypothesis`, `listHypothesesByState`,
  `getHypothesisRunStatus`, `setHypothesisRunStatus`, lock helpers)
- `lib/synthesis.ts`: `runSynthesis()` (delta extraction, prompt assembly, model
  call, response validation, KV storage)
- `lib/cron.ts`: `registerSynthesisCron()` (guarded, same pattern as ingest)
- `routes/admin/insights.tsx`: queue page (list pending + rejected)
- `islands/AdminInsightReview.tsx`: approve/reject action island
- `routes/admin/insights/review.ts`: handler for approve/reject POST

**DISABLE_INSIGHT_SYNTHESIS** defaults to `true` in Phase 1 — the cron registers
but the public route does not exist yet.

Entry criterion for Phase 2: at least three weekly synthesis runs completed, the
admin reviewer has approved at least five hypotheses and rejected at least two,
and there are no open hallucination concerns from the rejected set.

### Phase 2 — Approved hypotheses surface publicly

Deliverables:

- `routes/gov/insights.tsx`: public insights page (approved hypotheses only)
- Flip `DISABLE_INSIGHT_SYNTHESIS` env var from `true` → absent (or `false`) in
  Deno Deploy

No code change needed for the promotion — only the env var and the route file.

---

## 8. Open Questions & Risks

### 8.1 Hallucination risk (high priority)

A reasoning model may generate plausible-sounding cross-entity claims that cite
real entity ids but describe a relationship the data does not actually support.
The runtime validation (Section 5.3) catches missing ids and causal language,
but cannot verify that the narrative framing is correct.

**Mitigation:** The human review gate (Section 2.1) is the primary defence. The
reviewer must click through every evidence link before approving. The Phase 1
entry criterion (Section 7) requires a track record of at least five approvals
and two rejections before any public surfacing — so the reviewer builds
familiarity with the model's failure modes in a low-stakes setting first.

**Risk that remains:** a reviewer who approves without clicking through
evidence. Reviewer training and a UI that makes the evidence links visually
prominent (not collapsed by default) reduce this risk; they do not eliminate it.

### 8.2 Small-N statistics

Kerala's governance dataset is small relative to what a reasoning model
typically trains on. Seven days of GOs from a single state government may yield
10–30 new edges. At that volume, "cross-dept co-movement" is almost always
coincidental — there are too few data points to distinguish signal from noise.

**Mitigation:** The minimum-evidence thresholds (Section 2.4) and the confidence
ceiling (≤0.9) are deliberately conservative for small N. The prompt's explicit
"co-occurrence is not causation" instruction reinforces this. Reviewers should
hold the bar high: reject any hypothesis that could be explained by random
variation in a 10–30 edge sample.

**Open question:** Should the synthesis window be 30 days (monthly) rather than
7 days (weekly), to increase the evidence base per run? A monthly cadence means
fewer runs, slower feedback, but stronger statistical ground per hypothesis.
Decision deferred to implementer review.

### 8.3 Bilingual machine-draft for `claimMl`

The synthesis model generates `claimMl` as a translation of `claimEn`. This is
machine-drafted Malayalam — the same situation as ingested GO subjects. Per the
bilingual invariant (Rule 2.4, `docs/specs/bilingual-localization.md`), it must
carry `translationStatus: "machine-draft"` until reviewed by a Malayalam
speaker.

**Complication:** The synthesis model is a general reasoning model, not a
translation specialist. Its Malayalam may be technically correct but use awkward
or non-standard terminology for governance concepts (e.g., "ഭരണ ഉത്തരവ്" vs "സർക്കാർ
ഉത്തരവ്"). The reviewer's job covers content correctness, not translation quality;
a separate Malayalam-speaker review is needed before `translationStatus` can be
set to `"human"`.

**Decision needed:** Should `claimMl` be omitted from the public card until a
Malayalam speaker reviews it, and only `claimEn` shown? Or show `claimMl` with a
prominent machine-draft badge? The latter is consistent with how ingested GO
subjects are shown; the former is more conservative. The bilingual spec permits
both — what matters is that `machine-draft` is never silently treated as
authoritative.

**Interaction with `deno task check:ml`:** The CI glyph check scans `data/`
fixtures. `claimMl` lives in KV (not in `data/`), so it is not covered by the CI
check. A separate admin-queue check (flag any `claimMl` containing non-Malayalam
Unicode ranges) may be warranted in Phase 2.

### 8.4 Review bottleneck

If weekly synthesis produces 10 hypotheses/run and the admin reviewer is
unavailable for a month, 40 pending hypotheses accumulate. The queue page must
handle this gracefully (pagination, oldest-first sort option). More importantly,
a large pending backlog should not silently stale: a `pendingSince` field or a
simple count badge on the admin index page would surface the backlog without
requiring a separate notification system.

**Open question:** Should a staleness threshold (e.g., 30 days) cause pending
hypotheses to auto-expire to `"rejected"` with a system note? This prevents the
queue from growing unbounded if the reviewer stops checking, but loses
potentially valid hypotheses. Decision deferred.

### 8.5 Interaction with the deterministic learnings layer

The deterministic layer runs arithmetic over the same graph. There is a risk of
surfacing the same finding twice — once as a count ("Dept X had 40 GOs this
week, 3× its 4-week average") and again as an LLM narrative ("GO activity in
Dept X may warrant attention"). The two layers should feel complementary, not
redundant.

**Proposal:** The synthesis prompt should be explicitly told the deterministic
findings already surfaced for this window, so it can avoid re-narrating them and
instead focus on cross-entity relationships the counting layer cannot see. This
requires passing the deterministic findings as part of the user prompt payload —
a small addition once both layers exist.
