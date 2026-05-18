import type { CoalitionMembership, Party } from "./types.ts";

/**
 * Political parties active in Kerala state politics.
 * `abbreviation` must match the PartyAffiliation string union in types.ts.
 *
 * Sources: Wikipedia party articles; Election Commission of India party symbols.
 */
export const PARTIES: Party[] = [
  {
    id: "party.cpim",
    slug: "cpim",
    name: "Communist Party of India (Marxist)",
    nameMl: "ഭാരതീയ കമ്യൂണിസ്റ്റ് പാർട്ടി (മാർക്‌സിസ്റ്റ്)",
    abbreviation: "CPI(M)",
    color: "#e63946",
    websiteUrl: "https://cpim.org",
    founded: "1964-11-07",
    source: "Wikipedia",
    sourceUrl:
      "https://en.wikipedia.org/wiki/Communist_Party_of_India_(Marxist)",
    dataStatus: "verified",
  },
  {
    id: "party.cpi",
    slug: "cpi",
    name: "Communist Party of India",
    nameMl: "ഭാരതീയ കമ്യൂണിസ്റ്റ് പാർട്ടി",
    abbreviation: "CPI",
    color: "#c1121f",
    websiteUrl: "https://www.communistpartyindia.in",
    founded: "1920-10-17",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Communist_Party_of_India",
    dataStatus: "verified",
  },
  {
    id: "party.inc",
    slug: "inc",
    name: "Indian National Congress",
    nameMl: "ഇന്ത്യൻ നാഷണൽ കോൺഗ്രസ്",
    abbreviation: "INC",
    color: "#138808",
    websiteUrl: "https://www.inc.in",
    founded: "1885-12-28",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Indian_National_Congress",
    dataStatus: "verified",
  },
  {
    id: "party.iuml",
    slug: "iuml",
    name: "Indian Union Muslim League",
    nameMl: "ഇന്ത്യൻ യൂണിയൻ മുസ്ലിം ലീഗ്",
    abbreviation: "IUML",
    color: "#006400",
    websiteUrl: "https://iuml.org.in",
    founded: "1948-03-10",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Indian_Union_Muslim_League",
    dataStatus: "verified",
  },
  {
    id: "party.kcm",
    slug: "kcm",
    name: "Kerala Congress (M)",
    nameMl: "കേരള കോൺഗ്രസ് (എം)",
    abbreviation: "KC(M)",
    color: "#ffd700",
    founded: "1979-01-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Kerala_Congress_(M)",
    dataStatus: "verified",
  },
  {
    id: "party.kc",
    slug: "kc",
    name: "Kerala Congress",
    nameMl: "കേരള കോൺഗ്രസ്",
    abbreviation: "KC",
    color: "#b8860b",
    founded: "1964-01-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Kerala_Congress",
    dataStatus: "verified",
  },
  {
    id: "party.rsp",
    slug: "rsp",
    name: "Revolutionary Socialist Party",
    nameMl: "റിവലൂഷ്ണറി സോഷ്യലിസ്റ്റ് പാർട്ടി",
    abbreviation: "RSP",
    color: "#cc0000",
    founded: "1935-01-01",
    source: "Wikipedia",
    sourceUrl:
      "https://en.wikipedia.org/wiki/Revolutionary_Socialist_Party_(India)",
    dataStatus: "verified",
  },
  {
    id: "party.jds",
    slug: "jds",
    name: "Janata Dal (Secular)",
    nameMl: "ജനതാ ദൾ (സെക്കുലർ)",
    abbreviation: "JD(S)",
    color: "#228b22",
    founded: "1999-06-25",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Janata_Dal_(Secular)",
    dataStatus: "verified",
  },
  {
    id: "party.ncp",
    slug: "ncp",
    name: "Nationalist Congress Party",
    nameMl: "നാഷണലിസ്റ്റ് കോൺഗ്രസ് പാർട്ടി",
    abbreviation: "NCP",
    color: "#00897b",
    founded: "1999-05-25",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Nationalist_Congress_Party",
    dataStatus: "verified",
  },
  {
    id: "party.bjp",
    slug: "bjp",
    name: "Bharatiya Janata Party",
    nameMl: "ഭാരതീയ ജനതാ പാർട്ടി",
    abbreviation: "BJP",
    color: "#ff6600",
    websiteUrl: "https://www.bjp.org",
    founded: "1980-04-06",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Bharatiya_Janata_Party",
    dataStatus: "verified",
  },
  {
    id: "party.cmp",
    slug: "cmp",
    name: "Communist Marxist Party of India",
    nameMl: "കമ്യൂണിസ്റ്റ് മാർക്സിസ്റ്റ് പാർട്ടി ഓഫ് ഇന്ത്യ",
    abbreviation: "CMP",
    color: "#cc2200",
    founded: "1986-01-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Communist_Marxist_Party_(India)",
    dataStatus: "verified",
  },
];

/**
 * Coalition membership history for Kerala parties.
 * Tracks switches: RSP left LDF for UDF in 2011; KC(M) left UDF for LDF in 2021.
 * Approximate termStart/termEnd dates used where exact GO dates are unknown —
 * marked with source "Wikipedia" and cross-checked against swearing-in dates.
 */
export const COALITION_MEMBERSHIPS: CoalitionMembership[] = [
  // ── LDF core (long-term) ────────────────────────────────────────────────
  {
    id: "cm.cpim-ldf",
    partyId: "party.cpim",
    coalition: "LDF",
    termStart: "1978-01-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Left_Democratic_Front_(Kerala)",
  },
  {
    id: "cm.cpi-ldf",
    partyId: "party.cpi",
    coalition: "LDF",
    termStart: "1978-01-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Left_Democratic_Front_(Kerala)",
  },
  // JD(S) aligned with LDF for the 2006, 2016, and 2021 elections.
  {
    id: "cm.jds-ldf-2006",
    partyId: "party.jds",
    coalition: "LDF",
    termStart: "2004-01-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Left_Democratic_Front_(Kerala)",
  },
  // NCP joined LDF alliance ahead of 2016 election.
  {
    id: "cm.ncp-ldf",
    partyId: "party.ncp",
    coalition: "LDF",
    termStart: "2016-01-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Left_Democratic_Front_(Kerala)",
  },

  // ── RSP: LDF → UDF switch ───────────────────────────────────────────────
  // RSP was in LDF for the 2006 election; moved to UDF before the 2011 election.
  {
    id: "cm.rsp-ldf-2006",
    partyId: "party.rsp",
    coalition: "LDF",
    termStart: "2004-01-01",
    termEnd: "2010-11-01",
    source: "Wikipedia",
    sourceUrl:
      "https://en.wikipedia.org/wiki/Revolutionary_Socialist_Party_(India)",
  },
  {
    id: "cm.rsp-udf",
    partyId: "party.rsp",
    coalition: "UDF",
    termStart: "2010-11-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/United_Democratic_Front_(Kerala)",
  },

  // ── UDF core (long-term) ────────────────────────────────────────────────
  {
    id: "cm.inc-udf",
    partyId: "party.inc",
    coalition: "UDF",
    termStart: "1980-01-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/United_Democratic_Front_(Kerala)",
  },
  {
    id: "cm.iuml-udf",
    partyId: "party.iuml",
    coalition: "UDF",
    termStart: "1980-01-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/United_Democratic_Front_(Kerala)",
  },
  {
    id: "cm.kc-udf",
    partyId: "party.kc",
    coalition: "UDF",
    termStart: "1980-01-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/United_Democratic_Front_(Kerala)",
  },

  // ── KC(M): UDF → LDF switch ─────────────────────────────────────────────
  // KC(M) was in UDF for decades; joined LDF ahead of the 2021 KLA election.
  {
    id: "cm.kcm-udf",
    partyId: "party.kcm",
    coalition: "UDF",
    termStart: "1980-01-01",
    termEnd: "2020-10-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Kerala_Congress_(M)",
  },
  {
    id: "cm.kcm-ldf",
    partyId: "party.kcm",
    coalition: "LDF",
    termStart: "2020-10-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Kerala_Congress_(M)",
  },
  // CMP is a smaller left-leaning party that has allied with UDF in recent elections.
  {
    id: "cm.cmp-udf",
    partyId: "party.cmp",
    coalition: "UDF",
    termStart: "2011-01-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Communist_Marxist_Party_(India)",
  },
];
