export type Lang = "en" | "ml";

const COOKIE_NAME = "kmc_lang";

export function readLangFromRequest(req: Request): Lang {
  const cookie = req.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === COOKIE_NAME && (v === "en" || v === "ml")) return v;
  }
  return "en";
}

export function t(lang: Lang, en: string, ml: string): string {
  return lang === "ml" ? ml : en;
}

const PARTY_MAP: Record<string, { en: string; ml: string }> = {
  "CPI(M)": { en: "CPI(M)", ml: "സി.പി.ഐ(എം)" },
  "CPI": { en: "CPI", ml: "സി.പി.ഐ" },
  "INC": { en: "Congress", ml: "കോൺഗ്രസ്" },
  "IUML": { en: "IUML", ml: "ഐ.യു.എം.എൽ" },
  "KC": { en: "Kerala Congress", ml: "കേരള കോൺഗ്രസ്" },
  "KC(M)": { en: "KC (M)", ml: "കേരള കോൺഗ്രസ് (എം)" },
  "RSP": { en: "RSP", ml: "ആർ.എസ്.പി" },
  "JD(S)": { en: "JD(S)", ml: "ജെ.ഡി(എസ്)" },
  "NCP": { en: "NCP", ml: "എൻ.സി.പി" },
  "BJP": { en: "BJP", ml: "ബി.ജെ.പി" },
  "CMP": { en: "CMP", ml: "സി.എം.പി" },
  "Independent": { en: "Independent", ml: "സ്വതന്ത്രൻ" },
  "Other": { en: "Other", ml: "മറ്റുള്ളവ" },
};

export function translateParty(party: string | undefined, lang: Lang): string {
  if (!party) return "";
  const match = PARTY_MAP[party];
  return match ? (lang === "ml" ? match.ml : match.en) : party;
}

/**
 * Format a value in Crore INR to USD (in millions or billions).
 * Exchange rate: 1 USD = ₹usdRate (standardized rate or live rate on the day).
 */
export function formatUsdValue(
  croreVal: number,
  lang: Lang,
  usdRate = 83.5,
): string {
  const usdInMillions = (croreVal * 10) / usdRate;
  if (usdInMillions >= 1000) {
    const billions = usdInMillions / 1000;
    const formatted = billions.toFixed(2);
    return lang === "ml" ? `$${formatted} ബില്യൺ` : `$${formatted}B`;
  } else {
    const formatted = usdInMillions.toFixed(1);
    return lang === "ml" ? `$${formatted} മില്യൺ` : `$${formatted}M`;
  }
}

/**
 * Parses a string for Indian Rupee figures in Crore/Lakh Crore (e.g. ₹48,733 cr, ₹5.07 lakh crore)
 * and appends the USD conversion in parentheses (e.g. ₹48,733 cr (~$5.84B)).
 * Works for both English and Malayalam patterns.
 */
export function convertTextInrToUsd(
  text: string,
  lang: Lang,
  usdRate = 83.5,
): string {
  if (!text) return text;
  return text.replace(
    /₹\s*([\d,.]+)\s*(lakh|ലക്ഷം)?\s*(cr(?:ore)?|കോടി)/gi,
    (match, numStr, lakhStr, _unitStr) => {
      const num = parseFloat(numStr.replace(/,/g, ""));
      if (isNaN(num)) return match;

      const isLakh = lakhStr !== undefined;
      const croreVal = isLakh ? num * 100000 : num;

      const usdStr = formatUsdValue(croreVal, lang, usdRate);
      return `${match} (~${usdStr})`;
    },
  );
}
