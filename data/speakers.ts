import type { Speaker } from "./types.ts";

/**
 * Kerala Legislative Assembly Speakers and Deputy Speakers, 12th–15th KLA.
 *
 * Key events:
 *   13th KLA: G. Karthikeyan died in office (2015-03-07). Deputy Speaker
 *             N. Sakthan resigned the Deputy Speakership (2015-03-10) and was
 *             elected Speaker three days later.
 *   15th KLA: M. B. Rajesh resigned as Speaker (2022-09-03) to join the
 *             cabinet; A. N. Shamseer elected as 24th Speaker (2022-09-12).
 *
 * Sources: Wikipedia "List of speakers of the Kerala Legislative Assembly";
 * individual Wikipedia articles for each person.
 */
export const SPEAKERS: Speaker[] = [
  // ── 12th KLA (LDF, 2006–2011) ──────────────────────────────────────────
  {
    id: "speaker.k-radhakrishnan-12",
    slug: "k-radhakrishnan-12",
    personId: "person.k-radhakrishnan-speaker",
    assemblyTerm: 12,
    rank: "Speaker",
    termStart: "2006-05-25",
    termEnd: "2011-05-31",
    source: "Wikipedia",
    sourceUrl:
      "https://en.wikipedia.org/wiki/List_of_speakers_of_the_Kerala_Legislative_Assembly",
    dataStatus: "verified",
  },

  // ── 13th KLA (UDF, 2011–2016) ──────────────────────────────────────────
  {
    id: "speaker.g-karthikeyan-13",
    slug: "g-karthikeyan-13",
    personId: "person.g-karthikeyan",
    assemblyTerm: 13,
    rank: "Speaker",
    termStart: "2011-06-02",
    termEnd: "2015-03-07",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/G._Karthikeyan",
    dataStatus: "verified",
  },
  {
    id: "speaker.n-sakthan-deputy-13",
    slug: "n-sakthan-deputy-13",
    personId: "person.n-sakthan",
    assemblyTerm: 13,
    rank: "Deputy Speaker",
    termStart: "2011-06-02",
    termEnd: "2015-03-10",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/N._Sakthan",
    dataStatus: "verified",
  },
  {
    id: "speaker.n-sakthan-13",
    slug: "n-sakthan-13",
    personId: "person.n-sakthan",
    assemblyTerm: 13,
    rank: "Speaker",
    termStart: "2015-03-12",
    termEnd: "2016-06-01",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/N._Sakthan",
    dataStatus: "verified",
  },

  // ── 14th KLA (LDF, 2016–2021) ──────────────────────────────────────────
  {
    id: "speaker.p-sreeramakrishnan-14",
    slug: "p-sreeramakrishnan-14",
    personId: "person.p-sreeramakrishnan",
    assemblyTerm: 14,
    rank: "Speaker",
    termStart: "2016-06-03",
    termEnd: "2021-05-24",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/P._Sreeramakrishnan",
    dataStatus: "verified",
  },
  {
    id: "speaker.v-sasi-deputy-14",
    slug: "v-sasi-deputy-14",
    personId: "person.v-sasi",
    assemblyTerm: 14,
    rank: "Deputy Speaker",
    termStart: "2016-06-29",
    termEnd: "2021-05-24",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/V._Sasi",
    dataStatus: "verified",
  },

  // ── 15th KLA (LDF, 2021–2026) ──────────────────────────────────────────
  {
    id: "speaker.mb-rajesh-15",
    slug: "mb-rajesh-15",
    personId: "person.mb-rajesh",
    assemblyTerm: 15,
    rank: "Speaker",
    termStart: "2021-05-25",
    termEnd: "2022-09-03",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/M._B._Rajesh",
    dataStatus: "verified",
  },
  {
    id: "speaker.an-shamseer-15",
    slug: "an-shamseer-15",
    personId: "person.an-shamseer",
    assemblyTerm: 15,
    rank: "Speaker",
    termStart: "2022-09-12",
    termEnd: "2026-05-18",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/A._N._Shamseer",
    dataStatus: "verified",
  },
  {
    id: "speaker.chittayam-gopakumar-deputy-15",
    slug: "chittayam-gopakumar-deputy-15",
    personId: "person.chittayam-gopakumar",
    assemblyTerm: 15,
    rank: "Deputy Speaker",
    termStart: "2021-06-01",
    termEnd: "2026-05-18",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Chittayam_Gopakumar",
    dataStatus: "verified",
  },

  // ── 16th KLA (UDF, 2026–present) ───────────────────────────────────────
  {
    id: "speaker.thiruvanchoor-radhakrishnan-16",
    slug: "thiruvanchoor-radhakrishnan-16",
    personId: "person.thiruvanchoor-radhakrishnan",
    assemblyTerm: 16,
    rank: "Speaker",
    termStart: "2026-05-18",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Thiruvanchoor_Radhakrishnan",
    dataStatus: "verified",
  },
  {
    id: "speaker.shanimol-osman-deputy-16",
    slug: "shanimol-osman-deputy-16",
    personId: "person.shanimol-osman",
    assemblyTerm: 16,
    rank: "Deputy Speaker",
    termStart: "2026-05-18",
    source: "Wikipedia",
    sourceUrl: "https://en.wikipedia.org/wiki/Shanimol_Osman",
    dataStatus: "verified",
  },
];
