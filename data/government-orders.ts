import type { GovernmentOrder } from "./types.ts";

/**
 * Static baseline of Kerala Government Orders seeded into KV on cold start.
 *
 * Only orders with a verified, resolvable PDF on the official portal ship here.
 * Fresh orders are added at runtime by the daily Gemini ingest (see lib/ingest.ts
 * + lib/cron.ts), which writes straight to KV under a durable mirror that
 * survives reseeds — so this file is intentionally small and need not be hand-
 * edited to keep the site current.
 *
 * Every record carries meta.sourceUrl — a direct link to the PDF on the official
 * Kerala Government Document Portal (document.kerala.gov.in).
 *
 * IDs: go.<year>-<deptCode>-<number>
 */
export const GOVERNMENT_ORDERS: GovernmentOrder[] = [
  {
    id: "go.2026-misc-15",
    goNumber: "G.O.(Ms)No.15/2026/TRANS",
    type: "Ms",
    subject:
      "Transport Department - Railways - Thiruvananthapuram - Kasaragod Semi High Speed Silverline Project - Cancelled - Orders issued",
    deptId: "dept.transport",
    deptConfidence: "medium",
    date: "2026-05-21",
    manifestoGoalIds: ["goal.udf2026-highspeed-rail"],
    manifestoConfidence: "direct",
    meta: {
      source: "Document Portal, Government of Kerala",
      sourceUrl:
        "https://document.kerala.gov.in/documents/governmentorders/eofficeorder_134_2305202602:00:43.pdf",
      retrievedAt: "2026-05-24T12:33:28.768Z",
    },
    dataStatus: "verified",
  },
  {
    id: "go.2026-clad-300",
    goNumber: "G.O.(Rt) No.300/2026/CLAD",
    type: "Rt",
    subject:
      "ഭാരത് ഭവന് - 2026-27- സാമ്പത്തിക വർഷത്തെ പദ്ധതിയേതര വിഹിതത്തില്‍ നിന്ന് ആദ്യ ഗഡു അനുമതി ഉത്തരവ്",
    subjectMl:
      "ഭാരത് ഭവന് - 2026-27- സാമ്പത്തിക വർഷത്തെ പദ്ധതിയേതര വിഹിതത്തില്‍ നിന്ന് ആദ്യ ഗഡു അനുമതി ഉത്തരവ്",
    deptId: "dept.cmo",
    deptConfidence: "high",
    date: "2026-05-22",
    meta: {
      source: "Document Portal, Government of Kerala",
      sourceUrl:
        "https://document.kerala.gov.in/documents/governmentorders/govtorder2205202618:58:45.pdf",
      retrievedAt: "2026-05-24T12:29:07.964Z",
    },
    dataStatus: "verified",
  },
  {
    id: "go.2026-misc-446",
    goNumber: "G.O.(Rt) No.446/2026/TAXES",
    type: "Rt",
    subject:
      "എക്സൈസ് - ഭരണപരം -21 സംസ്ഥാന എക്സൈസ് കലാകായികമേളയുടെ നടത്തിന് സർക്കാർ സഹായമായി തുക അനുമതി ഉത്തരവ്",
    subjectMl:
      "എക്സൈസ് - ഭരണപരം -21 സംസ്ഥാന എക്സൈസ് കലാകായികമേളയുടെ നടത്തിന് സർക്കാർ സഹായമായി തുക അനുമതി ഉത്തരവ്",
    deptId: "dept.excise",
    deptConfidence: "medium",
    date: "2026-05-22",
    meta: {
      source: "Document Portal, Government of Kerala",
      sourceUrl:
        "https://document.kerala.gov.in/documents/governmentorders/govtorder2205202619:27:07.pdf",
      retrievedAt: "2026-05-24T12:29:32.527Z",
    },
    dataStatus: "verified",
  },
  {
    id: "go.2026-home-3",
    goNumber: "G.O.(Rt)1793/2026/HOME",
    type: "Rt",
    subject:
      "നാഷണല്‍ ഇൻവെസ്റ്റിഗേഷൻ എജൻസിയില്‍ അന്യത്രസേവനത്തിനുശേഷം പ്രോസിക്യൂഷൻ വകുപ്പിലേക്ക് തിരികെ പ്രവേശിച്ച ശ്രീമതി ലെനിഎ അസിസ്റ്റന്റ പബ്ലിക് പ്രോസിക്യൂട്ടർ സീനിയർ ഗ്രേഡ് നിയമനത്തിനായി കാത്തിരുന്ന കാലയളവ് ക്രമീകരിച്ചുള്ള ഉത്തരവ്",
    subjectMl:
      "നാഷണല്‍ ഇൻവെസ്റ്റിഗേഷൻ എജൻസിയില്‍ അന്യത്രസേവനത്തിനുശേഷം പ്രോസിക്യൂഷൻ വകുപ്പിലേക്ക് തിരികെ പ്രവേശിച്ച ശ്രീമതി ലെനിഎ അസിസ്റ്റന്റ പബ്ലിക് പ്രോസിക്യൂട്ടർ സീനിയർ ഗ്രേഡ് നിയമനത്തിനായി കാത്തിരുന്ന കാലയളവ് ക്രമീകരിച്ചുള്ള ഉത്തരവ്",
    deptId: "dept.home",
    deptConfidence: "high",
    date: "2026-05-22",
    meta: {
      source: "Document Portal, Government of Kerala",
      sourceUrl:
        "https://document.kerala.gov.in/documents/governmentorders/govtorder2305202618:28:54.pdf",
      retrievedAt: "2026-05-24T12:29:46.669Z",
    },
    dataStatus: "verified",
  },
];
