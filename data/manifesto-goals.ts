import type { ManifestoGoal } from "./types.ts";

/**
 * UDF 2026 election manifesto commitments, as published 2 April 2026.
 * Grouped into: Five Indira Guarantees, Five Dream Projects, Governance, Sector.
 *
 * Sources:
 *  - Onmanorama, "UDF releases election manifesto", 2 Apr 2026
 *  - The Print, "UDF manifesto anchors on five Indira Guarantees", 2 Apr 2026
 *  - ANI News, "Keralam Assembly polls: UDF manifesto promises Rs 6,000 under NYAY", 2 Apr 2026
 */
export const MANIFESTO_GOALS: ManifestoGoal[] = [
  // ── Five Indira Guarantees ────────────────────────────────────────────────

  {
    id: "goal.udf2026-welfare-pension",
    governmentId: "govt.satheesan-1",
    title: "Raise welfare pension to ₹3,000 per month",
    titleMl: "ക്ഷേമ പെൻഷൻ മാസം ₹3,000 ആക്കി ഉയർത്തൽ",
    category: "welfare",
    summary:
      "Increase the state welfare pension from ₹2,000 to ₹3,000 per month for all eligible beneficiaries. NYAY scheme to provide ₹6,000/month to families below the poverty line.",
    summaryMl:
      "ക്ഷേമ പെൻഷൻ ₹2,000-ൽ നിന്ന് ₹3,000-ആക്കി ഉയർത്തൽ. ദാരിദ്ര്യരേഖയ്ക്കു താഴെയുള്ള കുടുംബങ്ങൾക്ക് NYAY പദ്ധതി വഴി ₹6,000 നൽകൽ.",
    featuredLabel: "Indira Guarantee",
    featuredLabelMl: "ഇന്ദിര ഗ്യാരണ്ടി",
    status: "committed",
    sourceUrl:
      "https://www.onmanorama.com/news/kerala/2026/04/02/udf-releaases-election-manifesto-live.html",
    dataStatus: "verified",
  },
  {
    id: "goal.udf2026-womens-bus-travel",
    governmentId: "govt.satheesan-1",
    title: "Free KSRTC bus travel for women",
    titleMl: "സ്ത്രീകൾക്ക് സൗജന്യ കെ.എസ്.ആർ.ടി.സി. യാത്ര",
    category: "women",
    summary:
      "All women to travel free on Kerala State Road Transport Corporation buses across the state.",
    summaryMl: "കേരള സംസ്ഥാന റോഡ് ഗതാഗത കോർപ്പറേഷൻ ബസുകളിൽ സ്ത്രീകൾക്ക് സൗജന്യ യാത്ര.",
    featuredLabel: "Indira Guarantee",
    featuredLabelMl: "ഇന്ദിര ഗ്യാരണ്ടി",
    status: "committed",
    sourceUrl:
      "https://www.indiatvnews.com/news/india/kerala-election-udf-releases-poll-manifesto-offers-free-travel-for-women-on-state-transport-buses-2026-04-02-1036011",
    dataStatus: "verified",
  },
  {
    id: "goal.udf2026-student-allowance",
    governmentId: "govt.satheesan-1",
    title: "₹1,000/month allowance for women college students",
    titleMl: "വനിതാ കോളേജ് വിദ്യാർഥികൾക്ക് ₹1,000 മാസ ബത്ത",
    category: "education",
    summary:
      "Monthly financial assistance of ₹1,000 to all women enrolled in college to reduce dropout rates.",
    summaryMl: "കോളേജ് പഠനം തുടരുന്ന വനിതകൾക്ക് ₹1,000 മാസ സഹായം.",
    featuredLabel: "Indira Guarantee",
    featuredLabelMl: "ഇന്ദിര ഗ്യാരണ്ടി",
    status: "committed",
    sourceUrl:
      "https://theprint.in/politics/udf-manifesto-for-kerala-polls-anchors-on-five-indira-guarantees-welfare-schemes-campus-reforms/2895111/",
    dataStatus: "verified",
  },
  {
    id: "goal.udf2026-health-insurance",
    governmentId: "govt.satheesan-1",
    title: "Oommen Chandy Health Insurance — ₹25 lakh coverage per family",
    titleMl: "ഉമ്മൻ ചാണ്ടി ആരോഗ്യ ഇൻഷുറൻസ് — കുടുംബത്തിന് ₹25 ലക്ഷം",
    category: "health",
    summary:
      "Universal health insurance scheme in the name of former CM Oommen Chandy, providing ₹25 lakh per household; implemented via a digital health card system in public hospitals.",
    summaryMl:
      "മുൻ മുഖ്യമന്ത്രി ഉമ്മൻ ചാണ്ടിയുടെ നാമത്തിൽ ആരോഗ്യ ഇൻഷുറൻസ് — ഒരു കുടുംബത്തിന് ₹25 ലക്ഷം; ഡിജിറ്റൽ ഹെൽത്ത് കാർഡ് വഴി നടപ്പാക്കൽ.",
    featuredLabel: "Indira Guarantee",
    featuredLabelMl: "ഇന്ദിര ഗ്യാരണ്ടി",
    status: "in-progress",
    sourceUrl:
      "https://aninews.in/news/national/general-news/keralam-assembly-polls-udf-manifesto-promises-rs-6000-under-nyay-higher-pensions-and-farmer-support20260402115927/",
    dataStatus: "verified",
  },
  {
    id: "goal.udf2026-youth-loans",
    governmentId: "govt.satheesan-1",
    title: "Interest-free ₹5 lakh loans for youth entrepreneurs",
    titleMl: "യുവ സംരംഭകർക്ക് ₹5 ലക്ഷം പലിശ-രഹിത വായ്പ",
    category: "livelihood",
    summary:
      "Youth to receive interest-free loans up to ₹5 lakh to start their own businesses, with technical and management mentoring.",
    summaryMl: "സ്വന്തം സംരംഭം തുടങ്ങുന്ന യുവാക്കൾക്ക് ₹5 ലക്ഷം വരെ പലിശ-രഹിത വായ്പ.",
    featuredLabel: "Indira Guarantee",
    featuredLabelMl: "ഇന്ദിര ഗ്യാരണ്ടി",
    status: "committed",
    sourceUrl:
      "https://theprint.in/politics/udf-manifesto-for-kerala-polls-anchors-on-five-indira-guarantees-welfare-schemes-campus-reforms/2895111/",
    dataStatus: "verified",
  },

  // ── Five Dream Projects ───────────────────────────────────────────────────

  {
    id: "goal.udf2026-mission-samudra",
    governmentId: "govt.satheesan-1",
    title:
      "Mission Samudra — global maritime hub along Kerala's 600 km coastline",
    titleMl: "മിഷൻ സമുദ്ര — 600 കി.മി. തീരദേശത്തെ ആഗോള സമുദ്ര കേന്ദ്രം",
    category: "infrastructure",
    summary:
      "Develop Kerala's 600-km coastline and 44 rivers into an integrated global maritime hub by connecting ports and inland waterways.",
    summaryMl: "600 കി.മി. തീരദേശവും 44 നദികളും ബന്ധിപ്പിച്ചുള്ള ആഗോള സമുദ്ര ഹബ്.",
    featuredLabel: "Dream Project",
    featuredLabelMl: "ഡ്രീം പ്രോജക്ട്",
    status: "committed",
    sourceUrl: "https://voterlist.co.in/udf-kerala-election-manifesto-2026/",
    dataStatus: "verified",
  },
  {
    id: "goal.udf2026-highspeed-rail",
    governmentId: "govt.satheesan-1",
    title: "High-speed rail corridors in partnership with the Centre",
    titleMl: "കേന്ദ്ര സഹകരണത്തോടെ അതിവേഗ റെയിൽ ഇടനാഴികൾ",
    category: "infrastructure",
    summary:
      "Build financially viable high-speed rail corridors in public-private-centre partnership, replacing the stalled SilverLine project.",
    summaryMl: "പൊതു-സ്വകാര്യ-കേന്ദ്ര പങ്കാളിത്തത്തിൽ അതിവേഗ റെയിൽ ഇടനാഴി.",
    featuredLabel: "Dream Project",
    featuredLabelMl: "ഡ്രീം പ്രോജക്ട്",
    status: "committed",
    sourceUrl: "https://voterlist.co.in/udf-kerala-election-manifesto-2026/",
    dataStatus: "verified",
  },
  {
    id: "goal.udf2026-tribal-university",
    governmentId: "govt.satheesan-1",
    title: "Tribal University in Wayanad",
    titleMl: "വയനാട്ടിൽ ഗോത്ര സർവ്വകലാശാല",
    category: "tribal",
    summary:
      "Establish a dedicated Tribal University in Wayanad to provide higher education and research opportunities for Adivasi communities.",
    summaryMl: "ആദിവാസി സമൂഹങ്ങൾക്കായി വയനാട്ടിൽ ഗോത്ര സർവ്വകലാശാല സ്ഥാപനം.",
    featuredLabel: "Dream Project",
    featuredLabelMl: "ഡ്രീം പ്രോജക്ട്",
    status: "committed",
    sourceUrl: "https://voterlist.co.in/udf-kerala-election-manifesto-2026/",
    dataStatus: "verified",
  },
  {
    id: "goal.udf2026-global-job-watch",
    governmentId: "govt.satheesan-1",
    title: "Global Job Watch Square — align curriculum to global job market",
    titleMl: "ഗ്ലോബൽ ജോബ് വോച്ച് സ്ക്വയർ — ആഗോള തൊഴിൽ വിപണിക്ക് അനുസൃതമായ പാഠ്യക്രമം",
    category: "education",
    summary:
      "Permanent expert body tracking global job-market shifts and recommending curriculum changes; paired with skill training for unemployed adults.",
    summaryMl:
      "ആഗോള തൊഴിൽ വിപണി വ്യതിയാനങ്ങൾ നിരീക്ഷിക്കാൻ വിദഗ്ദ്ധ സമിതി; ഉന്നത വിദ്യാഭ്യാസ പാഠ്യക്രമം ആഗോള നിലവാരത്തിലേക്ക്.",
    featuredLabel: "Dream Project",
    featuredLabelMl: "ഡ്രീം പ്രോജക്ട്",
    status: "in-progress",
    sourceUrl:
      "https://theprint.in/politics/udf-manifesto-for-kerala-polls-anchors-on-five-indira-guarantees-welfare-schemes-campus-reforms/2895111/",
    dataStatus: "verified",
  },
  {
    id: "goal.udf2026-msme-10k",
    governmentId: "govt.satheesan-1",
    title: "10,000 new MSMEs with technical and financial support",
    titleMl: "10,000 പുതിയ സൂക്ഷ്മ-ചെറുകിട-ഇടത്തരം സംരംഭങ്ങൾ",
    category: "livelihood",
    summary:
      "Establish 10,000 new micro, small and medium enterprises by providing entrepreneurs with integrated technical, management, and financial support.",
    summaryMl: "10,000 പുതിയ MSME കൾ — സംരംഭകർക്ക് സാങ്കേതിക, ഭരണ, സാമ്പത്തിക സഹായം.",
    featuredLabel: "Dream Project",
    featuredLabelMl: "ഡ്രീം പ്രോജക്ട്",
    status: "committed",
    sourceUrl: "https://voterlist.co.in/udf-kerala-election-manifesto-2026/",
    dataStatus: "verified",
  },

  // ── Governance & Accountability ───────────────────────────────────────────

  {
    id: "goal.udf2026-fiscal-transparency",
    governmentId: "govt.satheesan-1",
    title: "White paper on Kerala finances and independent audit of KIIFB",
    titleMl: "കേരള ധനകാര്യ വൈറ്റ് പേപ്പർ — KIIFB-ന്റെ സ്വതന്ത്ര ഓഡിറ്റ്",
    category: "fiscal",
    summary:
      "Publish a white paper exposing the true state of Kerala's public debt and off-budget borrowings; commission a CAG special audit of KIIFB's liabilities and capital expenditures.",
    summaryMl:
      "കേരളത്തിന്റെ ബജറ്റേതര കടം വ്യക്തമാക്കുന്ന വൈറ്റ് പേപ്പർ; KIIFB ബാധ്യതകൾ CAG ഓഡിറ്റിന് വിധേയമാക്കൽ.",
    status: "fulfilled",
    sourceUrl:
      "http://www.niyamasabha.org/codes/16kla/Kerala_Status_Paper_consolidated%20Eng.pdf",
    dataStatus: "verified",
  },
  {
    id: "goal.udf2026-anti-corruption",
    governmentId: "govt.satheesan-1",
    title: "Restore Anti-Corruption Commission and Lok Ayukta powers",
    titleMl: "അഴിമതി വിരുദ്ധ കമ്മീഷൻ, ലോക്ക് ആയുക്ത അധികാരങ്ങൾ പുനഃസ്ഥാപിക്കൽ",
    category: "governance",
    summary:
      "Amend legislation to restore full statutory oversight powers to the Anti-Corruption Commission and Lok Ayukta that were diluted under the previous government.",
    summaryMl:
      "മുൻ സർക്കാർ ദുർബ്ബലപ്പെടുത്തിയ അഴിമതി വിരുദ്ധ കമ്മീഷൻ, ലോക്ക് ആയുക്ത അധികാരങ്ങൾ നിയമ ഭേദഗതിയിലൂടെ പുനഃസ്ഥാപിക്കൽ.",
    status: "in-progress",
    sourceUrl:
      "https://theprint.in/politics/udf-manifesto-for-kerala-polls-anchors-on-five-indira-guarantees-welfare-schemes-campus-reforms/2895111/",
    dataStatus: "verified",
  },
  {
    id: "goal.udf2026-police-accountability",
    governmentId: "govt.satheesan-1",
    title:
      "Strengthen police oversight through an independent complaints authority",
    titleMl: "സ്വതന്ത്ര പോലീസ് പരാതി പ്രാധികരണം ശക്തിപ്പെടുത്തൽ",
    category: "governance",
    summary:
      "Reconstitute the State Level Police Complaints Authority with independent judicial and civil society members to investigate police misconduct.",
    summaryMl:
      "ജുഡീഷ്യൽ, സ്വതന്ത്ര അംഗങ്ങളുൾപ്പെടെ സംസ്ഥാന പോലീസ് പരാതി പരിഹാര സമിതി പുനഃസംഘടിപ്പിക്കൽ.",
    status: "in-progress",
    sourceUrl: "https://voterlist.co.in/udf-kerala-election-manifesto-2026/",
    dataStatus: "verified",
  },
  {
    id: "goal.udf2026-lsg-decentralisation",
    governmentId: "govt.satheesan-1",
    title: "Devolve greater financial powers to Grama Panchayats",
    titleMl: "ഗ്രാമ പഞ്ചായത്തുകൾക്ക് ഉയർന്ന സാമ്പത്തിക അധികാരം",
    category: "governance",
    summary:
      "Decentralise plan funds and delegate higher financial approval powers to Grama Panchayats for local infrastructure and development projects.",
    summaryMl:
      "പ്ലാൻ ഫണ്ടുകൾ വികേന്ദ്രീകരിക്കുക; ഗ്രാമ പഞ്ചായത്തുകൾക്ക് അടിസ്ഥാന സൗകര്യ പദ്ധതികൾക്ക് ഉയർന്ന ധനാനുമതി.",
    status: "in-progress",
    sourceUrl: "https://voterlist.co.in/udf-kerala-election-manifesto-2026/",
    dataStatus: "verified",
  },

  // ── Sector Pledges ────────────────────────────────────────────────────────

  {
    id: "goal.udf2026-tribal-digital",
    governmentId: "govt.satheesan-1",
    title: "Digital literacy hubs in every tribal panchayat",
    titleMl: "ഓരോ ഗോത്ര പഞ്ചായത്തിലും ഡിജിറ്റൽ സാക്ഷരതാ കേന്ദ്രം",
    category: "tribal",
    summary:
      "Establish digital literacy hubs in tribal panchayats to bridge the digital divide for SC, ST and Backward Community residents.",
    summaryMl:
      "ഗോത്ര പഞ്ചായത്തുകളിൽ ഡിജിറ്റൽ സാക്ഷരതാ കേന്ദ്രങ്ങൾ — SC, ST, OBC ജനതയ്ക്ക് ഡിജിറ്റൽ ആക്സസ്.",
    status: "in-progress",
    sourceUrl: "https://voterlist.co.in/udf-kerala-election-manifesto-2026/",
    dataStatus: "verified",
  },
  {
    id: "goal.udf2026-five-lakh-houses",
    governmentId: "govt.satheesan-1",
    title: "Five lakh houses in five years",
    titleMl: "അഞ്ച് വർഷം കൊണ്ട് അഞ്ച് ലക്ഷം വീടുകൾ",
    category: "welfare",
    summary:
      "Build or assist in the construction of 5,00,000 housing units over the five-year term for homeless and below-poverty-line families.",
    summaryMl: "ഭവന രഹിതർക്കും ദാരിദ്ര്യ രേഖക്കു താഴെയുള്ളവർക്കും അഞ്ച് ലക്ഷം വീടുകൾ.",
    status: "committed",
    sourceUrl:
      "https://aninews.in/news/national/general-news/keralam-assembly-polls-udf-manifesto-promises-rs-6000-under-nyay-higher-pensions-and-farmer-support20260402115927/",
    dataStatus: "verified",
  },
  {
    id: "goal.udf2026-energy-conservation",
    governmentId: "govt.satheesan-1",
    title: "Mandatory energy conservation across all government offices",
    titleMl: "എല്ലാ സർക്കാർ കാര്യാലയങ്ങളിലും ഊർജ്ജ സംരക്ഷണം നിർബന്ധം",
    category: "environment",
    summary:
      "Issue binding CMO directives on energy conservation standards for all state government buildings and administrative offices.",
    summaryMl: "സർക്കാർ കെട്ടിടങ്ങൾക്ക് ഊർജ്ജ സംരക്ഷണ മാർഗ്ഗനിർദ്ദേശങ്ങൾ — CMO നിർദ്ദേശം.",
    status: "in-progress",
    sourceUrl: "https://voterlist.co.in/udf-kerala-election-manifesto-2026/",
    dataStatus: "verified",
  },
];
