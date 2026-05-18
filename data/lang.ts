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
