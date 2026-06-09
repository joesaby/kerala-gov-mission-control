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
- **Ministers**: `name` & `nameMl`, `constituency` & `constituencyMl` (when
  available).
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
- Ensure all CI/CD tasks (`deno task check`) pass cleanly after schema and UI
  updates.
