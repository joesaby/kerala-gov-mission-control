# Competitive Analysis

Kerala Mission Control is a public accountability dashboard for the Government
of Kerala — tracking state-level governance KPIs, minister portfolios, and
historical governments, with full English/Malayalam bilingual support.

This document surveys the closest analogues and where each falls short of what
this project does.

---

## Summary table

| Project                    | KPI dashboard | Minister tracker |  State-level  | Malayalam | Open source |  Independent  |
| -------------------------- | :-----------: | :--------------: | :-----------: | :-------: | :---------: | :-----------: |
| **Kerala Mission Control** |      ✅       |        ✅        |      ✅       |    ✅     |     ✅      |      ✅       |
| ForThePeople.in            |      ✅       |        ❌        | ❌ (district) |    ❌     |     ✅      |      ✅       |
| PRS Legislative Research   |      ❌       | ✅ (Parliament)  |      ❌       |    ❌     |   partial   |      ✅       |
| CivicDataLab               |  ✅ (budget)  |        ❌        |    partial    |    ❌     |     ✅      |      ✅       |
| MyNeta                     |      ❌       | ✅ (candidates)  |      ✅       |    ❌     |     ❌      |      ✅       |
| Lok Dhaba                  |      ❌       |  ✅ (electoral)  |      ✅       |    ❌     |     ❌      |   academic    |
| dashboard.kerala.gov.in    |    partial    |        ❌        |      ✅       |  partial  |     ❌      | ❌ (official) |

---

## Closest peers

### ForThePeople.in

**URL:** https://forthepeople.in\
**GitHub:** https://github.com/jayanthmb14/forthepeople

India's most structurally similar independent civic dashboard. Aggregates
publicly available government data into clean, citizen-friendly pages — one per
district — with 29 modules including crop prices, dam levels, budget spending,
and school performance. Sourced under India's Open Data Policy (NDSAP) and RTI.

**Overlap with Kerala Mission Control**

- Independent (not official government)
- Citizen-facing, open source
- Aggregates multiple government data streams into a single view
- Data defensibility through source attribution

**Gaps**

- District scope, not state governance
- No minister/portfolio/government tracking
- No Malayalam language support
- No KPI metadata (targets, trends, comparators, update frequency)

---

### PRS Legislative Research

**URL:** https://prsindia.org\
**Tools:** [MP Track](https://prsindia.org/mptrack) ·
[Bill Track](https://prsindia.org/billtrack) ·
[Vital Stats](https://prsindia.org/parliamenttrack/vital-stats)

The gold standard for parliamentary accountability in India. Tracks Lok Sabha
and Rajya Sabha MPs — attendance, debates, questions asked, bills voted on.
Well-cited by media, academia, and civil society. Data is CC-licensed. There is
also a community dataset of representative activity on
[GitHub](https://github.com/Vonter/india-representatives-activity).

**Overlap with Kerala Mission Control**

- Independent
- Politician accountability with sourced data
- Longitudinal tracking across terms

**Gaps**

- Parliament-only (no state assemblies or state cabinets)
- No governance KPIs (health, fiscal, education, etc.)
- No language support beyond English

---

### CivicDataLab

**URL:** https://civicdatalab.in\
**GitHub:** https://github.com/CivicDataLab

Open-source civic tech organization with multiple accountability tools:
constituency dashboards, sector-level budget dashboards
([Open Budgets India](https://openbudgetsindia.org)), and the
[Zombie Tracker](https://civicdatalab.in/work/lawandjustice/zombietracker/)
(cases filed under specific legal provisions). All tools are open source and
built with CKAN and other OSS stacks.

**Overlap with Kerala Mission Control**

- Open source
- Sector KPI dashboards (budget/public finance)
- Multi-state coverage

**Gaps**

- No single state-government accountability dashboard
- No minister portfolio tracker
- Budget/finance focus — does not span health, education, safety, environment
- No regional language UI

---

## Related but narrower in scope

### MyNeta

**URL:** https://www.myneta.info

Candidate and MP/MLA financial and criminal background disclosures sourced from
affidavits filed with the Election Commission. Covers candidates for every
election since the 2000s. Maintained by the Association for Democratic Reforms
(ADR).

**Relevant for:** who is in government, their declared assets and liabilities,
criminal cases\
**Not relevant for:** governance outcomes, departmental KPIs, policy performance

---

### Lok Dhaba (Ashoka University)

**URL:** https://lokdhaba.ashoka.edu.in

Free, structured, cleaned archive of Indian electoral outcomes at national and
state level from 1962 onwards. Used extensively by political scientists and
journalists. Includes a Political Career Tracker.

**Relevant for:** historical electoral data, politician career trajectories\
**Not relevant for:** real-time governance KPIs, ministerial portfolios,
citizen-facing accountability

---

### dashboard.kerala.gov.in (Official)

**URL:** https://dashboard.kerala.gov.in

Official Government of Kerala e-services monitoring dashboard. Tracks delivery
status of government services (certificates, permits, etc.) across departments
in near-real time.

**Relevant for:** e-service delivery throughput\
**Not relevant for:** outcome KPIs, minister accountability, historical
governments, independent verification

---

## What Kerala Mission Control does that no existing project does

1. **State-level governance KPIs** with full metadata per indicator — source,
   source URL, owner department, target, comparators, update frequency, last
   refresh, trend, and bilingual definition.
2. **Minister and portfolio tracker** covering the current cabinet and
   historical governments back to 2006, with party, coalition, and term data.
3. **Malayalam language support throughout** — all KPI titles, definitions,
   minister names, department names, and government names are available in
   Malayalam.
4. **Machine-readable API** (`/api/kpis`) alongside the human-readable
   dashboard, enabling downstream use by journalists, researchers, and other
   civic tools.

---

## Sources

- [ForThePeople.in](https://forthepeople.in/en)
- [PRS Legislative Research](https://prsindia.org)
- [CivicDataLab](https://civicdatalab.in)
- [Zombie Tracker](https://civicdatalab.in/work/lawandjustice/zombietracker/)
- [MyNeta](https://www.myneta.info/)
- [Lok Dhaba](https://lokdhaba.ashoka.edu.in/)
- [Official Kerala Dashboard](https://dashboard.kerala.gov.in/)
- [Open Government Data Portal Kerala](https://kerala.data.gov.in/)
- [Open Government Data Platform India](https://www.data.gov.in/)
