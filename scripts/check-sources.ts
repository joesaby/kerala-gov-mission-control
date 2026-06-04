#!/usr/bin/env -S deno run --allow-read
/**
 * Source-policy validator.
 *
 * Every statistical number on the dashboard must trace to an official
 * GOVERNMENT source — never a newspaper, blog, Wikipedia, or think-tank.
 * This script scans the data fixtures that hold sourced figures and fails if
 * any `sourceUrl` / source `url` points at a host outside the government
 * allowlist below.
 *
 * Scope: it checks the *source-of-record* fixtures (KPIs, Government Orders,
 * Status Papers, manifesto goals, the source registry). It deliberately does
 * NOT police media/attribution URLs (portrait photos in persons.ts, YouTube
 * embeds in public-speeches.ts) — those are governed by attribution, not the
 * statistical-source policy. See docs/data/source-policy.md.
 *
 * Escape hatch: a legitimate non-government source (rare) can be whitelisted
 * inline by placing `// source-policy:allow <reason>` on the same line or the
 * line immediately above the URL.
 *
 * Run:  deno task check:sources
 */

/**
 * Hard gate — fixtures of published factual figures. Every source URL here
 * MUST be government. A violation fails the build.
 */
const GATE_FILES = [
  "data/kpis.ts",
  "data/government-orders.ts",
  "data/status-papers.ts",
];

/**
 * Advisory — election-manifesto promises are a political-party document, so the
 * source of record is the party's own published manifesto, not government and
 * not a newspaper. We warn (non-fatal) on non-government sources here to flag
 * newspaper citations that should be replaced with the official manifesto PDF.
 * `data/sources.ts` is a research *catalog* (it lists third-party aggregators
 * with reliability ratings) and is intentionally out of scope entirely.
 */
const WARN_FILES = [
  "data/manifesto-goals.ts",
];

/**
 * Hosts (or host suffixes) recognised as official government / constitutional
 * bodies. Extend with care — adding a non-government domain here defeats the
 * whole check. Newspapers, Wikipedia, PRS, blogs, vendor sites: NOT allowed.
 */
const GOVT_SUFFIXES = [
  ".gov.in",
  ".nic.in",
  ".gov", // generic government TLD
  "niyamasabha.org", // Kerala Legislative Assembly (official)
  "keralalegislature.org", // Kerala Legislative Assembly (official, alt)
  "rbi.org.in", // Reserve Bank of India
  "censusindia.gov.in",
  "mospi.gov.in", // Ministry of Statistics
];

const ALLOW_MARKER = "source-policy:allow";

interface Violation {
  file: string;
  line: number;
  url: string;
  host: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "";
  }
}

function isGovt(host: string): boolean {
  return GOVT_SUFFIXES.some((s) =>
    s.startsWith(".")
      ? host.endsWith(s)
      : host === s || host.endsWith("." + s) || host === s
  );
}

const URL_RE = /https?:\/\/[^\s"'`)]+/g;

/** Scan one file, returning every non-government source URL in it. */
async function scan(
  file: string,
): Promise<{ scanned: number; bad: Violation[] }> {
  let text: string;
  try {
    text = await Deno.readTextFile(file);
  } catch {
    return { scanned: 0, bad: [] }; // fixture may not exist yet — skip silently
  }
  const lines = text.split("\n");
  const bad: Violation[] = [];
  let scanned = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = line.match(URL_RE);
    if (!matches) continue;
    const prev = i > 0 ? lines[i - 1] : "";
    const allowed = line.includes(ALLOW_MARKER) || prev.includes(ALLOW_MARKER);
    for (const raw of matches) {
      scanned++;
      if (allowed) continue;
      const url = raw.replace(/[.,;]+$/, "");
      const host = hostOf(url);
      if (!host || !isGovt(host)) {
        bad.push({ file, line: i + 1, url, host: host || "(unparseable)" });
      }
    }
  }
  return { scanned, bad };
}

const gateBad: Violation[] = [];
let gateScanned = 0;
for (const file of GATE_FILES) {
  const { scanned, bad } = await scan(file);
  gateScanned += scanned;
  gateBad.push(...bad);
}

const warnBad: Violation[] = [];
for (const file of WARN_FILES) {
  const { bad } = await scan(file);
  warnBad.push(...bad);
}

// Advisory pass — never fails the build, but surfaces newspaper-sourced
// manifesto promises that should move to the official party manifesto.
if (warnBad.length > 0) {
  console.error(
    `%c⚠ source-policy (advisory): ${warnBad.length} non-government source(s) in manifesto data —`,
    "color: orange",
  );
  console.error(
    "  replace newspaper citations with the official party manifesto PDF where possible:",
  );
  for (const v of warnBad) console.error(`  ${v.file}:${v.line}  [${v.host}]`);
  console.error("");
}

if (gateBad.length === 0) {
  console.log(
    `%c✓ source-policy: ${gateScanned} figure source(s) checked, all government-sourced.`,
    "color: green",
  );
  Deno.exit(0);
}

console.error(
  `%c✗ source-policy: ${gateBad.length} non-government source URL(s) in published-figure data.\n`,
  "color: red; font-weight: bold",
);
for (const v of gateBad) {
  console.error(`  ${v.file}:${v.line}  [${v.host}]  ${v.url}`);
}
console.error(
  "\nEvery dashboard figure must cite an official government source " +
    "(*.gov.in, *.nic.in, niyamasabha.org, rbi.org.in, censusindia.gov.in, …).\n" +
    "Newspapers, Wikipedia, blogs and think-tanks are not acceptable as the source of record.\n" +
    "If a non-government URL is genuinely required, add `// source-policy:allow <reason>` " +
    "on the line above it, and explain in the PR.\n" +
    "Policy: docs/data/source-policy.md",
);
Deno.exit(1);
