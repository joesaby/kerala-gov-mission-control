# Specification: Bilingual Localization & Translation System

## 1. Goal & Context

Kerala Mission Control is a public accountability dashboard. To ensure
accessibility and defensibility, every piece of citizen-visible text must
support both English (EN) and Malayalam (ML) consistently. When a citizen clicks
the language toggle, all page headings, summaries, metrics, and details must
render in the chosen language. Mixed language presentation (e.g., Malayalam body
with English headings, or missing Malayalam values falling back to English
without translation) is not permitted.

---

## 2. Invariants & Rules

### Rule 2.1: Schema Completeness

Every user-facing data model defined in `data/types.ts` must provide bilingual
fields for all descriptive text properties.

- **KPIs**: `title` & `titleMl`, `meta.definition` & `meta.definitionMl`, `unit`
  & `unitMl`, `note` & `noteMl` (if note is set on timepoints).
- **Departments**: `name` & `nameMl`, `summary` & `summaryMl`.
- **Governments**: `name` & `nameMl`, `shortName` & `shortNameMl`, `summary` &
  `summaryMl`.
- **Ministers**: `name` & `nameMl`. (`constituencyMl` does not exist in the
  schema yet — add it alongside the `Constituency` entity work tracked in
  CLAUDE.md "Not yet implemented".)
- **Government Orders**: `subject` & `subjectMl`, `summary` & `summaryMl`.
- **Manifesto Goals**: `title` & `titleMl`, `summary` & `summaryMl`,
  `featuredLabel` & `featuredLabelMl`.
- **Status Papers**: `title` & `titleMl`, `subtitle` & `subtitleMl`, `summary` &
  `summaryMl`.

### Rule 2.2: LLM Ingestion Translation Pipeline

During the automated or manual ingestion of new Government Orders
(`lib/ingest.ts`), the LLM extraction prompt must enforce the output of BOTH
languages:

1. **Malayalam-only PDFs**: Extract Malayalam fields; translate/paraphrase them
   into English to populate the English fields.
2. **English-only PDFs**: Extract English fields; translate/paraphrase them into
   Malayalam to populate the Malayalam fields.
3. **Bilingual PDFs**: Extract both directly. No field is allowed to be returned
   as `null` or empty if the other language is available.

### Rule 2.3: Zero Hardcoded UI Text

No citizen-visible string may be hardcoded in English.

1. **Short UI Text**: Always wrap in the translation helper `t(lang, en, ml)`.
2. **Dictionaries**: Categorized labels (e.g., Party Names, Order Types,
   Confidence Labels, Status Metas) must use dictionaries mapped to the active
   language context.
3. **Date Formatting**: Every date-formatting function must accept the active
   language (`Lang`) and use the correct locale (`ml-IN` for Malayalam, `en-IN`
   for English) and timezone (`Asia/Kolkata`).

**Documented exception:** the Research Hub draft generator
(`lib/research-drafts.ts`). The "blog" and "factsheet" tones follow the active
language; the "briefing" tone is intentionally English-only because its audience
(researchers, journalists, policy analysts) works in English. Revisit if a
Malayalam briefing format is requested.

### Rule 2.4: Translation Provenance

Machine translation (LLM-drafted Malayalam) is permitted **only as a flagged
draft**, never as authoritative content:

1. Any fixture record whose `*Ml` strings were produced by an LLM must carry
   `translationStatus: "machine-draft"` (see `TranslationStatus` in
   `data/types.ts`).
2. A machine-draft translation graduates only after a Malayalam speaker reviews
   it — then set `translationStatus: "human"` or remove the field.
3. Government Orders ingested via `lib/ingest.ts` are machine-translated by
   construction (Rule 2.2); their `dataStatus: "unverified"` covers this until
   reviewed.
4. Non-fixture machine-drafted Malayalam pending native review: the UI
   dictionary strings added with the Research Hub
   (`islands/ResearchExplorer.tsx`, `routes/research.tsx`), the party-label map
   in `data/lang.ts` (note: "സ്വതന്ത്രൻ" for Independent is gendered — confirm
   preferred neutral form), and the blog/factsheet draft templates in
   `lib/research-drafts.ts`.
5. `deno task check:ml` (run in CI) scans `data/` fixtures for foreign-script
   glyph corruption — a known failure mode of LLM-drafted Malayalam.

To list the review backlog: `grep -rn 'machine-draft' data/`.

---

## 3. Schema Definitions (Changes to `data/types.ts`)

The following type definitions will be expanded in `data/types.ts`:

```typescript
export interface Department {
  id: string;
  slug: string;
  name: string;
  nameMl?: string;
  summary?: string;
  summaryMl?: string; // Added for bilingual summaries
  // ...
}

export interface Government {
  id: string;
  slug: string;
  name: string;
  nameMl?: string;
  shortName: string;
  shortNameMl?: string; // Added for bilingual short names
  summary?: string;
  summaryMl?: string; // Added for bilingual summaries
  // ...
}
```

---

## 4. Audit & Verification

- Run the custom bilingual audit script to identify and verify missing `*Ml`
  fields.
- Run `deno task check:ml` to catch foreign-script glyph corruption in fixtures
  (also enforced in CI).
- Run `deno task test` — the Research Hub draft generator
  (`lib/research-drafts.ts`) has unit tests covering both languages.
- Ensure all CI/CD tasks (`deno task check`) pass cleanly after schema and UI
  updates.
