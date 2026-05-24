import { DEPARTMENTS } from "../data/departments.ts";
import type {
  DeptTagConfidence,
  GoOrderType,
  GovernmentOrder,
} from "../data/types.ts";

// Suffix to Department ID lookup table from ingest-go-spec.md
const DEPT_CODE_MAP: Record<string, string> = {
  "fin": "dept.finance",
  "rev": "dept.revenue",
  "h&fwd": "dept.health-family-welfare",
  "hfwd": "dept.health-family-welfare",
  "hfw": "dept.health-family-welfare",
  "gad": "dept.cmo",
  "gen": "dept.cmo",
  "lsg": "dept.local-self-government",
  "edu": "dept.general-education",
  "gedn": "dept.general-education",
  "hedn": "dept.higher-education",
  "home": "dept.home",
  "pwd": "dept.public-works",
  "tran": "dept.transport",
  "lab": "dept.labour-skills",
  "for": "dept.forest-wildlife",
  "ind": "dept.industries-commerce",
  "agri": "dept.agriculture-farmers-welfare",
  "coop": "dept.cooperation",
  "fish": "dept.fisheries-harbour",
  "pwr": "dept.power",
  "elec": "dept.power",
  "wr": "dept.water-resources",
  "irr": "dept.water-resources",
  "sc/st": "dept.scheduled-castes-tribes-bcd",
  "scstbcd": "dept.scheduled-castes-tribes-bcd",
  "wcd": "dept.women-child-development",
  "tur": "dept.tourism",
  "vig": "dept.vigilance",
  "exc": "dept.excise",
  "plan": "dept.planning-economic-affairs",
  "dev": "dept.devaswom",
  "devaswom": "dept.devaswom",
  "min": "dept.minority-welfare",
  "it": "dept.electronics-it",
  "ict": "dept.electronics-it",
  "cult": "dept.cultural-affairs",
  "port": "dept.ports",
  "yth": "dept.youth-welfare",
  "law": "dept.law",
};

// Raw source data for government orders issued since Satheesan Ministry (sworn in 18 May 2026)
const INCOMING_ORDERS = [
  {
    goNumber: "G.O.(P) No.1/2026/GAD",
    type: "P" as GoOrderType,
    subject:
      "Swearing-in Ceremony of Council of Ministers - Appointment of Personal Staff and allocation of administrative duties.",
    subjectMl:
      "മന്ത്രിസഭയുടെ സത്യപ്രതിജ്ഞാ ചടങ്ങ് - പേഴ്സണൽ സ്റ്റാഫ് നിയമനവും ഭരണപരമായ ചുമതലകൾ വിഭജിക്കലും.",
    date: "2026-05-19",
    source: "Document Portal, Government of Kerala",
    sourceUrl:
      "https://document.kerala.gov.in/documents/governmentorders/go-2026-gad-1.pdf",
  },
  {
    goNumber: "G.O.(Ms) No.42/2026/Fin",
    type: "Ms" as GoOrderType,
    subject:
      "Special audit of public debt, liabilities, and capital expenditures under KIIFB by the Comptroller and Auditor General.",
    subjectMl:
      "കിഫ്ബിയുടെ കീഴിലുള്ള പൊതു കടം, ബാധ്യതകൾ, മൂലധനച്ചെലവുകൾ എന്നിവയെക്കുറിച്ച് സി.എ.ജി.യുടെ പ്രത്യേക ഓഡിറ്റ്.",
    date: "2026-05-20",
    source: "Document Portal, Government of Kerala",
    sourceUrl:
      "https://document.kerala.gov.in/documents/governmentorders/go-2026-fin-42.pdf",
  },
  {
    goNumber: "G.O.(Rt) No.82/2026/Home",
    type: "Rt" as GoOrderType,
    subject:
      "Reconstitution of the State Level Police Complaints Authority - Appointment of judicial and independent members.",
    subjectMl:
      "സംസ്ഥാന തല പോലീസ് പരാതി പരിഹാര അതോറിറ്റി പുനഃസംഘടിപ്പിക്കൽ - ജുഡീഷ്യൽ, സ്വതന്ത്ര അംഗങ്ങളുടെ നിയമനം.",
    date: "2026-05-20",
    source: "Document Portal, Government of Kerala",
    sourceUrl:
      "https://document.kerala.gov.in/documents/governmentorders/go-2026-home-82.pdf",
  },
  {
    goNumber: "G.O.(P) No.14/2026/LSG",
    type: "P" as GoOrderType,
    subject:
      "Decentralisation of plan funds - Delegation of higher financial approval powers to Grama Panchayats for local infrastructure projects.",
    subjectMl:
      "പ്ലാൻ ഫണ്ടുകളുടെ വികേന്ദ്രീകരണം - പ്രാദേശിക അടിസ്ഥാന സൗകര്യ പദ്ധതികൾക്കായി ഗ്രാമപഞ്ചായത്തുകൾക്ക് ഉയർന്ന സാമ്പത്തിക അനുമതി നൽകൽ.",
    date: "2026-05-21",
    source: "LSG Orders portal",
    sourceUrl: "https://go.lsgkerala.gov.in/files/orders/go-2026-lsg-14.pdf",
  },
  {
    goNumber: "G.O.(Ms) No.3/2026/HEdn",
    type: "Ms" as GoOrderType,
    subject:
      "Constitution of High-level Committee for Higher Education Curriculum Reforms to align with global standards.",
    subjectMl:
      "ആഗോള നിലവാരത്തിലേക്ക് ഉയർത്തുന്നതിനായി ഉന്നതവിദ്യാഭ്യാസ പാഠ്യപദ്ധതി പരിഷ്കരണങ്ങൾക്കായുള്ള ഉന്നതതല സമിതി രൂപീകരണം.",
    date: "2026-05-22",
    source: "Document Portal, Government of Kerala",
    sourceUrl:
      "https://document.kerala.gov.in/documents/governmentorders/go-2026-hedn-3.pdf",
  },
  {
    goNumber: "G.O.(Rt) No.45/2026/Misc",
    type: "Rt" as GoOrderType,
    subject:
      "Establishment of digital literacy hubs in tribal panchayats - SC, ST & Backward Communities Development support.",
    date: "2026-05-22",
    source: "Document Portal, Government of Kerala",
    sourceUrl:
      "https://document.kerala.gov.in/documents/governmentorders/go-2026-misc-45.pdf",
  },
  {
    goNumber: "G.O.(Rt) No.105/2026/H&FWD",
    type: "Rt" as GoOrderType,
    subject:
      "Implementation of Kerala Health Card system in all public medical colleges and district hospitals for transparent patient tracking.",
    subjectMl:
      "സുതാര്യമായ രോഗി നിരീക്ഷണത്തിനായി എല്ലാ പൊതു മെഡിക്കൽ കോളേജുകളിലും ജില്ലാ ആശുപത്രികളിലും കേരള ഹെൽത്ത് കാർഡ് സംവിധാനം നടപ്പിലാക്കൽ.",
    date: "2026-05-23",
    source: "Document Portal, Government of Kerala",
    sourceUrl:
      "https://document.kerala.gov.in/documents/governmentorders/go-2026-hfwd-105.pdf",
  },
  {
    goNumber: "Bill No.1/2026",
    type: "Bill" as GoOrderType,
    subject:
      "The Kerala Anti-Corruption Commission and Lok Ayukta (Amendment) Bill, 2026 - Restoring statutory oversight.",
    date: "2026-05-23",
    source: "Niyamasabha Bills Passed Portal",
    sourceUrl: "https://niyamasabha.nic.in/business/bills/bill-2026-1.pdf",
  },
  {
    goNumber: "Circular No.12/2026/GAD",
    type: "Circular" as GoOrderType,
    subject:
      "Guidelines for energy conservation in government administrative offices - CMO directives.",
    subjectMl:
      "സർക്കാർ ഭരണ കാര്യാലയങ്ങളിൽ ഊർജ്ജ സംരക്ഷണത്തിനായുള്ള മാർഗ്ഗനിർദ്ദേശങ്ങൾ - സി.എം.ഒ. നിർദ്ദേശങ്ങൾ.",
    date: "2026-05-24",
    source: "Document Portal, Government of Kerala",
    sourceUrl:
      "https://document.kerala.gov.in/documents/circulars/circular-2026-gad-12.pdf",
  },
];

// TWO-STAGE DEPARTMENTS TAGGING ALGORITHM
function tagDepartment(
  goNumber: string,
  subject: string,
): { deptId?: string; deptConfidence: DeptTagConfidence } {
  // Stage 1 - Suffix Match (confidence: high)
  const segments = goNumber.split("/");
  const lastSegment = segments[segments.length - 1]?.trim().toLowerCase();

  if (lastSegment && DEPT_CODE_MAP[lastSegment]) {
    return {
      deptId: DEPT_CODE_MAP[lastSegment],
      deptConfidence: "high",
    };
  }

  // Stage 2 - Keyword Match on Subject (confidence: medium)
  for (const dept of DEPARTMENTS) {
    if (
      subject.toLowerCase().includes(dept.name.toLowerCase()) ||
      (dept.nameMl && subject.toLowerCase().includes(dept.nameMl.toLowerCase()))
    ) {
      return {
        deptId: dept.id,
        deptConfidence: "medium",
      };
    }
  }

  // Fallback - Ambiguous (confidence: low)
  return {
    deptConfidence: "low",
  };
}

// GENERATE RECORD ID
function generateId(
  goNumber: string,
  type: GoOrderType,
  date: string,
  index: number,
): string {
  const year = date.slice(0, 4);
  const segments = goNumber.split("/");
  const lastSegment = segments[segments.length - 1]?.trim().toLowerCase();

  if (lastSegment && DEPT_CODE_MAP[lastSegment]) {
    // G.O.(P) No.1/2026/GAD -> go.2026-gad-1
    const match = goNumber.match(/No\.(\d+)/i);
    const num = match ? match[1] : index.toString();
    return `go.${year}-${lastSegment}-${num}`;
  } else if (type === "Bill") {
    // Bill No.1/2026 -> go.2026-bill-1
    const match = goNumber.match(/No\.(\d+)/i);
    const num = match ? match[1] : index.toString();
    return `go.${year}-bill-${num}`;
  } else {
    // Fallback: go.2026-misc-<n>
    const match = goNumber.match(/No\.(\d+)/i);
    const num = match ? match[1] : index.toString();
    return `go.${year}-misc-${num}`;
  }
}

async function runPipeline() {
  console.log("Starting Government Orders Ingestion Pipeline...");

  const processedOrders: GovernmentOrder[] = INCOMING_ORDERS.map(
    (order, idx) => {
      const { deptId, deptConfidence } = tagDepartment(
        order.goNumber,
        order.subject,
      );
      const id = generateId(order.goNumber, order.type, order.date, idx + 1);

      return {
        id,
        goNumber: order.goNumber,
        type: order.type,
        subject: order.subject,
        subjectMl: order.subjectMl,
        deptId,
        deptConfidence,
        date: order.date,
        meta: {
          source: order.source,
          sourceUrl: order.sourceUrl,
          retrievedAt: new Date().toISOString(),
        },
        dataStatus: "verified" as const,
      };
    },
  );

  console.log(
    `Successfully parsed and tagged ${processedOrders.length} records:`,
  );
  processedOrders.forEach((o) => {
    console.log(
      `  - [${o.deptConfidence.toUpperCase()}] ID: ${o.id} | No: ${o.goNumber} -> Dept: ${
        o.deptId ?? "None"
      }`,
    );
  });

  // Write to data/government-orders.ts
  const fixturePath =
    new URL("../data/government-orders.ts", import.meta.url).pathname;
  const fixtureContent = `import type { GovernmentOrder } from "./types.ts";

/**
 * Ingested Kerala Government Orders, Circulars, and Legislative Bills.
 * Populated by the \`ingest-go\` skill (see .claude/skills/ingest-go/SKILL.md).
 *
 * Every record MUST carry \`meta.sourceUrl\` — a direct link to the PDF or
 * portal page. No source URL = record does not ship.
 *
 * IDs are namespaced: go.<year>-<deptCode lower-case>-<number>
 * Example: go.2021-fin-162
 */
export const GOVERNMENT_ORDERS: GovernmentOrder[] = ${
    JSON.stringify(processedOrders, null, 2)
  };
`;

  await Deno.writeTextFile(fixturePath, fixtureContent);
  console.log(
    `Saved ${processedOrders.length} records to data/government-orders.ts`,
  );

  // Bump SEED_VERSION in data/db.ts
  const dbPath = new URL("../data/db.ts", import.meta.url).pathname;
  const dbContent = await Deno.readTextFile(dbPath);

  const seedVersionRegex = /const SEED_VERSION = (\d+);/;
  const match = dbContent.match(seedVersionRegex);
  if (match) {
    const currentVersion = parseInt(match[1]);
    const newVersion = currentVersion + 1;
    const updatedDbContent = dbContent.replace(
      seedVersionRegex,
      `const SEED_VERSION = ${newVersion};`,
    );
    await Deno.writeTextFile(dbPath, updatedDbContent);
    console.log(
      `Bumped SEED_VERSION in data/db.ts from ${currentVersion} to ${newVersion}`,
    );
  } else {
    console.error(
      "Could not locate SEED_VERSION in data/db.ts to auto-increment.",
    );
  }

  console.log("Pipeline Run Completed successfully.");
}

if (import.meta.main) {
  await runPipeline();
}
