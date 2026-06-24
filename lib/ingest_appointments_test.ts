import { buildAppointmentsForOrder, matchPerson } from "./ingest.ts";
import { officeKey } from "../data/db.ts";
import type { Appointment, GovernmentOrder } from "../data/types.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// ----- matchPerson --------------------------------------------------------

Deno.test("matchPerson resolves an exact (squashed) name to the Person id", () => {
  // "Pinarayi Vijayan" is a seeded Person — punctuation/spacing is squashed away.
  assert(
    matchPerson("Pinarayi Vijayan", null) === "person.pinarayi-vijayan",
    "should match the seeded person on EN name",
  );
  assert(
    matchPerson("  pinarayi   vijayan ", null) === "person.pinarayi-vijayan",
    "match must ignore case and whitespace",
  );
});

Deno.test("matchPerson returns undefined for unknown or empty names (no fuzzy guess)", () => {
  assert(
    matchPerson("Some Unknown Bureaucrat", null) === undefined,
    "unknown name must not match",
  );
  assert(matchPerson(null, null) === undefined, "empty input must not match");
  // A partial/substring is NOT a match — only exact squashed equality.
  assert(
    matchPerson("Pinarayi", null) === undefined,
    "substring must not match",
  );
});

// ----- buildAppointmentsForOrder ------------------------------------------

const GO: GovernmentOrder = {
  id: "go.2026-fin-162",
  goNumber: "G.O.(Rt) No.162/2026/Fin",
  type: "Rt",
  subject: "Appointment of officers",
  deptId: "dept.finance",
  deptConfidence: "high",
  date: "2026-06-10",
  category: "appointment",
  meta: {
    source: "Document Portal, Government of Kerala",
    sourceUrl: "https://document.kerala.gov.in/162.pdf",
    retrievedAt: "2026-06-11T02:30:00+05:30",
  },
  translationStatus: "machine-draft",
  dataStatus: "verified",
};

Deno.test("buildAppointmentsForOrder derives stable ids from the GO id", () => {
  const appts = buildAppointmentsForOrder(GO, [
    {
      appointeeName: "Officer One",
      appointeeNameMl: null,
      office: "Secretary",
      officeMl: null,
      branch: "bureaucratic",
      action: "appointment",
      court: null,
      courtMl: null,
      effectiveDate: "2026-06-12",
    },
    {
      appointeeName: "Officer Two",
      appointeeNameMl: null,
      office: "Joint Secretary",
      officeMl: null,
      branch: "bureaucratic",
      action: "transfer",
      court: null,
      courtMl: null,
      effectiveDate: null,
    },
  ]);
  assert(appts.length === 2, "one record per appointee");
  assert(appts[0].id === "appt.2026-fin-162-0", "first id derived from GO id");
  assert(appts[1].id === "appt.2026-fin-162-1", "second id indexed");
  // termStart prefers the row's effectiveDate, else the GO date.
  assert(appts[0].termStart === "2026-06-12", "should use effectiveDate");
  assert(appts[1].termStart === "2026-06-10", "should fall back to GO date");
  // Ingested appointments are unverified machine drafts.
  assert(appts[0].dataStatus === "unverified", "ingested ⇒ unverified");
  assert(
    appts[0].translationStatus === "machine-draft",
    "ingested ⇒ machine-draft",
  );
  assert(appts[0].goId === "go.2026-fin-162", "goId links back to the order");
});

Deno.test("buildAppointmentsForOrder defaults judiciary dept to dept.law when GO is untagged", () => {
  const [appt] = buildAppointmentsForOrder(
    { ...GO, deptId: undefined, deptConfidence: "low" },
    [{
      appointeeName: "Justice X",
      appointeeNameMl: null,
      office: "Judge, High Court of Kerala",
      officeMl: null,
      branch: "judiciary",
      action: "appointment",
      court: "High Court of Kerala",
      courtMl: null,
      effectiveDate: null,
    }],
  );
  assert(appt.branch === "judiciary", "branch preserved");
  assert(appt.deptId === "dept.law", "judiciary defaults to dept.law");
  assert(appt.court === "High Court of Kerala", "court carried through");
});

Deno.test("buildAppointmentsForOrder skips rows with no usable name", () => {
  const appts = buildAppointmentsForOrder(GO, [{
    appointeeName: null,
    appointeeNameMl: null,
    office: "Secretary",
    officeMl: null,
    branch: "bureaucratic",
    action: "appointment",
    court: null,
    courtMl: null,
    effectiveDate: null,
  }]);
  assert(appts.length === 0, "a nameless row produces no appointment");
});

// ----- officeKey (supersession identity) ----------------------------------

Deno.test("officeKey groups the same office and separates different ones", () => {
  const base: Appointment = {
    id: "appt.a",
    goId: "go.x",
    appointeeName: "A",
    office: "Principal Secretary (Finance)",
    branch: "bureaucratic",
    action: "appointment",
    deptId: "dept.finance",
    termStart: "2026-01-01",
    confidence: "high",
    source: "s",
    sourceUrl: "u",
    dataStatus: "unverified",
  };
  // Same office, different holder + punctuation → same key (supersession pair).
  const successor: Appointment = {
    ...base,
    id: "appt.b",
    appointeeName: "B",
    office: "Principal  Secretary, Finance",
    termStart: "2026-09-01",
  };
  assert(officeKey(base) === officeKey(successor), "same office ⇒ same key");
  // Different department → different office, no supersession.
  assert(
    officeKey(base) !== officeKey({ ...base, deptId: "dept.revenue" }),
    "different dept ⇒ different key",
  );
});
