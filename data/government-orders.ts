import type { GovernmentOrder } from "./types.ts";

/**
 * Ingested Kerala Government Orders, Circulars, and Legislative Bills.
 * Populated by the `ingest-go` skill (see .claude/skills/ingest-go/SKILL.md).
 *
 * Every record MUST carry `meta.sourceUrl` — a direct link to the PDF or
 * portal page. No source URL = record does not ship.
 *
 * IDs are namespaced: go.<year>-<deptCode lower-case>-<number>
 * Example: go.2021-fin-162
 */
export const GOVERNMENT_ORDERS: GovernmentOrder[] = [
  {
    id: "go.2026-gad-1",
    goNumber: "G.O.(P) No.1/2026/GAD",
    type: "P",
    subject:
      "Swearing-in Ceremony of Council of Ministers - Appointment of Personal Staff and allocation of administrative duties.",
    subjectMl:
      "മന്ത്രിസഭയുടെ സത്യപ്രതിജ്ഞാ ചടങ്ങ് - പേഴ്സണൽ സ്റ്റാഫ് നിയമനവും ഭരണപരമായ ചുമതലകൾ വിഭജിക്കലും.",
    deptId: "dept.cmo",
    deptConfidence: "high",
    date: "2026-05-19",
    meta: {
      source: "Document Portal, Government of Kerala",
      sourceUrl:
        "https://document.kerala.gov.in/documents/governmentorders/go-2026-gad-1.pdf",
      retrievedAt: "2026-05-24T11:37:19.441Z",
    },
    dataStatus: "verified",
  },
  {
    id: "go.2026-fin-42",
    goNumber: "G.O.(Ms) No.42/2026/Fin",
    type: "Ms",
    subject:
      "Special audit of public debt, liabilities, and capital expenditures under KIIFB by the Comptroller and Auditor General.",
    subjectMl:
      "കിഫ്ബിയുടെ കീഴിലുള്ള പൊതു കടം, ബാധ്യതകൾ, മൂലധനച്ചെലവുകൾ എന്നിവയെക്കുറിച്ച് സി.എ.ജി.യുടെ പ്രത്യേക ഓഡിറ്റ്.",
    deptId: "dept.finance",
    deptConfidence: "high",
    date: "2026-05-20",
    manifestoGoalIds: ["goal.udf2026-fiscal-transparency"],
    manifestoConfidence: "direct",
    meta: {
      source: "Document Portal, Government of Kerala",
      sourceUrl:
        "https://document.kerala.gov.in/documents/governmentorders/go-2026-fin-42.pdf",
      retrievedAt: "2026-05-24T11:37:19.441Z",
    },
    dataStatus: "verified",
  },
  {
    id: "go.2026-home-82",
    goNumber: "G.O.(Rt) No.82/2026/Home",
    type: "Rt",
    subject:
      "Reconstitution of the State Level Police Complaints Authority - Appointment of judicial and independent members.",
    subjectMl:
      "സംസ്ഥാന തല പോലീസ് പരാതി പരിഹാര അതോറിറ്റി പുനഃസംഘടിപ്പിക്കൽ - ജുഡീഷ്യൽ, സ്വതന്ത്ര അംഗങ്ങളുടെ നിയമനം.",
    deptId: "dept.home",
    deptConfidence: "high",
    date: "2026-05-20",
    manifestoGoalIds: ["goal.udf2026-police-accountability"],
    manifestoConfidence: "direct",
    meta: {
      source: "Document Portal, Government of Kerala",
      sourceUrl:
        "https://document.kerala.gov.in/documents/governmentorders/go-2026-home-82.pdf",
      retrievedAt: "2026-05-24T11:37:19.441Z",
    },
    dataStatus: "verified",
  },
  {
    id: "go.2026-lsg-14",
    goNumber: "G.O.(P) No.14/2026/LSG",
    type: "P",
    subject:
      "Decentralisation of plan funds - Delegation of higher financial approval powers to Grama Panchayats for local infrastructure projects.",
    subjectMl:
      "പ്ലാൻ ഫണ്ടുകളുടെ വികേന്ദ്രീകരണം - പ്രാദേശിക അടിസ്ഥാന സൗകര്യ പദ്ധതികൾക്കായി ഗ്രാമപഞ്ചായത്തുകൾക്ക് ഉയർന്ന സാമ്പത്തിക അനുമതി നൽകൽ.",
    deptId: "dept.local-self-government",
    deptConfidence: "high",
    date: "2026-05-21",
    manifestoGoalIds: ["goal.udf2026-lsg-decentralisation"],
    manifestoConfidence: "direct",
    meta: {
      source: "LSG Orders portal",
      sourceUrl: "https://go.lsgkerala.gov.in/files/orders/go-2026-lsg-14.pdf",
      retrievedAt: "2026-05-24T11:37:19.441Z",
    },
    dataStatus: "verified",
  },
  {
    id: "go.2026-hedn-3",
    goNumber: "G.O.(Ms) No.3/2026/HEdn",
    type: "Ms",
    subject:
      "Constitution of High-level Committee for Higher Education Curriculum Reforms to align with global standards.",
    subjectMl:
      "ആഗോള നിലവാരത്തിലേക്ക് ഉയർത്തുന്നതിനായി ഉന്നതവിദ്യാഭ്യാസ പാഠ്യപദ്ധതി പരിഷ്കരണങ്ങൾക്കായുള്ള ഉന്നതതല സമിതി രൂപീകരണം.",
    deptId: "dept.higher-education",
    deptConfidence: "high",
    date: "2026-05-22",
    manifestoGoalIds: ["goal.udf2026-global-job-watch"],
    manifestoConfidence: "supporting",
    meta: {
      source: "Document Portal, Government of Kerala",
      sourceUrl:
        "https://document.kerala.gov.in/documents/governmentorders/go-2026-hedn-3.pdf",
      retrievedAt: "2026-05-24T11:37:19.441Z",
    },
    dataStatus: "verified",
  },
  {
    id: "go.2026-misc-45",
    goNumber: "G.O.(Rt) No.45/2026/Misc",
    type: "Rt",
    subject:
      "Establishment of digital literacy hubs in tribal panchayats - SC, ST & Backward Communities Development support.",
    deptId: "dept.scheduled-castes-tribes-bcd",
    deptConfidence: "medium",
    date: "2026-05-22",
    manifestoGoalIds: ["goal.udf2026-tribal-digital"],
    manifestoConfidence: "direct",
    meta: {
      source: "Document Portal, Government of Kerala",
      sourceUrl:
        "https://document.kerala.gov.in/documents/governmentorders/go-2026-misc-45.pdf",
      retrievedAt: "2026-05-24T11:37:19.441Z",
    },
    dataStatus: "verified",
  },
  {
    id: "go.2026-h&fwd-105",
    goNumber: "G.O.(Rt) No.105/2026/H&FWD",
    type: "Rt",
    subject:
      "Implementation of Kerala Health Card system in all public medical colleges and district hospitals for transparent patient tracking.",
    subjectMl:
      "സുതാര്യമായ രോഗി നിരീക്ഷണത്തിനായി എല്ലാ പൊതു മെഡിക്കൽ കോളേജുകളിലും ജില്ലാ ആശുപത്രികളിലും കേരള ഹെൽത്ത് കാർഡ് സംവിധാനം നടപ്പിലാക്കൽ.",
    deptId: "dept.health-family-welfare",
    deptConfidence: "high",
    date: "2026-05-23",
    manifestoGoalIds: ["goal.udf2026-health-insurance"],
    manifestoConfidence: "supporting",
    meta: {
      source: "Document Portal, Government of Kerala",
      sourceUrl:
        "https://document.kerala.gov.in/documents/governmentorders/go-2026-hfwd-105.pdf",
      retrievedAt: "2026-05-24T11:37:19.441Z",
    },
    dataStatus: "verified",
  },
  {
    id: "go.2026-bill-1",
    goNumber: "Bill No.1/2026",
    type: "Bill",
    subject:
      "The Kerala Anti-Corruption Commission and Lok Ayukta (Amendment) Bill, 2026 - Restoring statutory oversight.",
    deptConfidence: "low",
    date: "2026-05-23",
    manifestoGoalIds: ["goal.udf2026-anti-corruption"],
    manifestoConfidence: "direct",
    meta: {
      source: "Niyamasabha Bills Passed Portal",
      sourceUrl: "https://niyamasabha.nic.in/business/bills/bill-2026-1.pdf",
      retrievedAt: "2026-05-24T11:37:19.441Z",
    },
    dataStatus: "verified",
  },
  {
    id: "go.2026-gad-12",
    goNumber: "Circular No.12/2026/GAD",
    type: "Circular",
    subject:
      "Guidelines for energy conservation in government administrative offices - CMO directives.",
    subjectMl:
      "സർക്കാർ ഭരണ കാര്യാലയങ്ങളിൽ ഊർജ്ജ സംരക്ഷണത്തിനായുള്ള മാർഗ്ഗനിർദ്ദേശങ്ങൾ - സി.എം.ഒ. നിർദ്ദേശങ്ങൾ.",
    deptId: "dept.cmo",
    deptConfidence: "high",
    date: "2026-05-24",
    manifestoGoalIds: ["goal.udf2026-energy-conservation"],
    manifestoConfidence: "direct",
    meta: {
      source: "Document Portal, Government of Kerala",
      sourceUrl:
        "https://document.kerala.gov.in/documents/circulars/circular-2026-gad-12.pdf",
      retrievedAt: "2026-05-24T11:37:19.441Z",
    },
    dataStatus: "verified",
  },
];
