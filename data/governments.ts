import type { Government } from "./types.ts";

/**
 * Kerala state governments since 2006 (12th–15th KLA).
 *
 * `cmMinisterId` must reference a Minister record with rank === "CM".
 * The incumbent government has no `termEnd`.
 *
 * Sources: Wikipedia ministry articles; Kerala Niyamasabha; PIB press
 * releases for swearing-in dates.
 */
export const GOVERNMENTS: Government[] = [
  // ── 16th KLA — UDF ──────────────────────────────────────────────────────
  {
    id: "govt.satheesan-1",
    slug: "satheesan-1",
    name: "V. D. Satheesan ministry",
    nameMl: "വി.ഡി. സതീശൻ മന്ത്രിസഭ",
    shortName: "Satheesan I",
    coalition: "UDF",
    cmMinisterId: "min.satheesan",
    assemblyTerm: 16,
    termStart: "2026-05-18",
    summary:
      "UDF government sworn in 18 May 2026 under Chief Minister V. D. Satheesan (INC), ending five consecutive years of LDF rule.",
    source:
      "The New Indian Express — 'Who are the new Kerala ministers? Meet the full UDF cabinet under CM Satheesan', 18 May 2026",
    sourceUrl:
      "https://www.newindianexpress.com/states/kerala/2026/May/18/kerala-new-ministers-list-vd-satheesan-udf-cabinet-profiles",
    dataStatus: "verified",
  },

  // ── 15th KLA — LDF ──────────────────────────────────────────────────────
  {
    id: "govt.pinarayi-2",
    slug: "pinarayi-2",
    name: "Second Pinarayi Vijayan ministry",
    nameMl: "രണ്ടാം പിണറായി വിജയൻ മന്ത്രിസഭ",
    shortName: "Pinarayi II",
    coalition: "LDF",
    cmMinisterId: "min.pinarayi-vijayan",
    assemblyTerm: 15,
    termStart: "2021-05-20",
    termEnd: "2026-05-18",
    summary:
      "LDF government sworn in 20 May 2021 — the first Kerala government to win back-to-back terms since 1977.",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Second_Vijayan_ministry",
    dataStatus: "verified",
  },

  // ── 14th KLA — LDF ──────────────────────────────────────────────────────
  {
    id: "govt.pinarayi-1",
    slug: "pinarayi-1",
    name: "First Pinarayi Vijayan ministry",
    nameMl: "ഒന്നാം പിണറായി വിജയൻ മന്ത്രിസഭ",
    shortName: "Pinarayi I",
    coalition: "LDF",
    cmMinisterId: "min.pinarayi-vijayan-2016",
    assemblyTerm: 14,
    termStart: "2016-05-25",
    termEnd: "2021-05-20",
    summary:
      "First LDF term under Pinarayi Vijayan, notable for the Nipah response, the 2018 Kerala floods, and the COVID-19 management model.",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/First_Pinarayi_Vijayan_ministry",
    dataStatus: "verified",
  },

  // ── 13th KLA — UDF ──────────────────────────────────────────────────────
  {
    id: "govt.chandy-2",
    slug: "chandy-2",
    name: "Second Oommen Chandy ministry",
    nameMl: "ഓമൻ ചാണ്ടി രണ്ടാം മന്ത്രിസഭ",
    shortName: "Chandy II",
    coalition: "UDF",
    cmMinisterId: "min.oommen-chandy-2011",
    assemblyTerm: 13,
    termStart: "2011-05-18",
    termEnd: "2016-05-25",
    summary:
      "UDF government under Oommen Chandy (INC), his second term as Chief Minister.",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Second_Chandy_ministry",
    dataStatus: "verified",
  },

  // ── 12th KLA — LDF ──────────────────────────────────────────────────────
  {
    id: "govt.achuthanandan",
    slug: "achuthanandan",
    name: "V. S. Achuthanandan ministry",
    nameMl: "വി.എസ്. അച്ചുതാനന്ദൻ മന്ത്രിസഭ",
    shortName: "VSA 2006",
    coalition: "LDF",
    cmMinisterId: "min.vs-achuthanandan-2006",
    assemblyTerm: 12,
    termStart: "2006-05-18",
    termEnd: "2011-05-18",
    summary:
      "LDF government under V. S. Achuthanandan (CPI-M), marked by land reform initiatives and anti-encroachment drives.",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/V._S._Achuthanandan_ministry",
    dataStatus: "verified",
  },
];
