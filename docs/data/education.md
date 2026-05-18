# Education sources

Feeds the `education` civic domain — enrolment, learning outcomes, dropout,
teacher density, infrastructure, higher-ed indicators.

---

## UDISE+ — Unified District Information System for Education

- **URL:** https://udiseplus.gov.in
- **Owner:** Department of School Education & Literacy, MoE, GoI.
- **What it provides:** Annual school-by-school census — enrolment by
  grade/gender/social-category, teacher count, infrastructure (toilets, drinking
  water, electricity, library, computers), dropout rates, transition rates.
- **Feeds:** `education.gross-enrolment`, `education.pupil-teacher-ratio`,
  `education.school-infra-index`, `education.dropout-rate`. The single most
  important schooling dataset for the dashboard.
- **Format:** Web dashboard + state-wise / district-wise downloadable Excel and
  PDF report cards.
- **API auth:** None for public reports; school-level micro-data needs
  research-access registration.
- **Update cadence:** Annual academic-year cycle (report cards released ~12
  months after fieldwork).
- **Licence:** Government Open Data.
- **Sync notes:** Use the state Report Card PDF as the headline ingest; use the
  district CSVs for geographic drilldowns.

## PGI — Performance Grading Index for States (school education)

- **URL:** https://pgi.udiseplus.gov.in
- **What it provides:** Composite score across Learning Outcomes, Access,
  Equity, Infrastructure, Governance.
- **Feeds:** `education.pgi-score`, `Kpi.comparators[]` (peer states).
- **Format:** PDF state report cards + Excel.
- **Update cadence:** Annual.
- **Licence:** Government publication.

## PGI-D — PGI for Districts

- **URL:** https://pgi.udiseplus.gov.in/pgid
- **What it provides:** Same composite for each district.
- **Feeds:** Future district scorecards (Tier-2 roadmap item).

## NAS — National Achievement Survey

- **URL:** https://nas.gov.in
- **Owner:** NCERT.
- **What it provides:** State-level grade 3/5/8/10 learning outcomes — language,
  maths, EVS, science, social science.
- **Feeds:** `education.foundational-literacy`,
  `education.foundational-numeracy`.
- **Format:** PDF state report cards.
- **Update cadence:** ~Every 3 years.
- **Licence:** Public document.

## ASER — Annual Status of Education Report

- **URL:** https://asercentre.org
- **Owner:** Pratham (independent NGO).
- **What it provides:** Rural household-survey-based literacy/numeracy
  assessments, by state.
- **Feeds:** Independent comparator KPI for FLN; useful as a citizen-facing
  "what an outside survey says".
- **Format:** PDF + Excel state factsheets.
- **Update cadence:** Annual.
- **Licence:** CC BY-NC (attribution, non-commercial). Acceptable for a
  public-good dashboard but credit prominently.

## AISHE — All India Survey on Higher Education

- **URL:** https://aishe.gov.in
- **Owner:** MoE, GoI.
- **What it provides:** Enrolment, gross enrolment ratio, faculty, gender,
  social-category breakdowns for HEIs.
- **Feeds:** `education.ger-higher`, `education.faculty-vacancy`.
- **Format:** PDF state report + Excel.
- **Update cadence:** Annual.
- **Licence:** Government Open Data.

## NIRF — National Institutional Ranking Framework

- **URL:** https://nirfindia.org
- **What it provides:** Annual rankings of Indian HEIs.
- **Feeds:** Optional "Kerala HEIs in top-100" tile.
- **Format:** Per-institution scorecard PDF.
- **Update cadence:** Annual (June).

## SAMAGRA — Samagra Shiksha Kerala

- **URL:** https://samagrakeralam.in
- **Owner:** Samagra Shiksha state implementation society.
- **What it provides:** Scheme outlay, beneficiaries reached, training,
  inclusive education metrics.
- **Feeds:** `education.scheme-coverage` KPIs.

## KITE — Kerala Infrastructure & Technology for Education

- **URL:** https://kite.kerala.gov.in
- **What it provides:** Hi-tech school programme stats — computers deployed,
  classrooms with projectors, teacher training.
- **Feeds:** `education.digital-classroom-coverage`.

## Kerala SCERT

- **URL:** https://scert.kerala.gov.in
- **What it provides:** Curriculum framework, learning outcome publications,
  training calendars.
- **Sync notes:** **Correction (verified 2026-05-18):** SCERT does **not**
  publish a regular machine-readable State Achievement Survey at the
  foundational-literacy level. The KPI `education.foundational-literacy` should
  **not** cite SCERT as its source. Use PARAKH Rashtriya Sarvekshan
  - ASER (below) instead. Genuine SCERT micro-data is only available via RTI or
    partnership.
- **Last verified:** 2026-05-18

## PARAKH Rashtriya Sarvekshan — NCERT

- **URL:** https://ncert.nic.in/
- **Owner:** PARAKH (Performance Assessment, Review, and Analysis of Knowledge
  for Holistic Development), NCERT.
- **What it provides:** State-disaggregated grade 3/6/9 learning-outcome survey
  results (2024 results published). National replacement for NAS.
- **Feeds:** `education.foundational-literacy`,
  `education.foundational-numeracy` — recommended replacement for the SCERT
  citation on those KPIs.
- **Format:** PDF state report cards.
- **API auth:** None.
- **Update cadence:** ~Triennial (2024 latest cycle).
- **Licence:** Government of India.
- **Sync notes:** GREEN-for-state-comparators, AMBER for ingest because
  PDF-only. Tables include Kerala broken down by subject + grade.
- **Last verified:** 2026-05-18

## NIPUN Bharat dashboard — via DIKSHA

- **URL:** https://diksha.gov.in/
- **Owner:** Ministry of Education + state implementation cells.
- **What it provides:** Foundational Literacy and Numeracy (FLN) mission
  progress tracking — teacher training, learning outcomes.
- **Feeds:** Secondary supplement to `education.foundational-literacy`.
- **Format:** HTML dashboards, varying per state.
- **Update cadence:** Continuous.
- **Licence:** Government of India.
- **Sync notes:** AMBER — Kerala participates but **state-level granular
  publication is uneven**, do not depend on it for KPI values until a stable
  state-level export is confirmed.
- **Last verified:** 2026-05-18

## SSA Kerala — School-level dashboards

- **URL:** https://education.kerala.gov.in
- **What it provides:** State-run education portal with school directory.

## Kerala State Higher Education Council

- **URL:** https://kshec.kerala.gov.in
- **What it provides:** Higher-ed policy, scholarship schemes.
