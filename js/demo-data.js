/**
 * The tour's INVENTED family. Nothing here comes from FACTS or Firestore — every name, ID, grade and event is made up
 * (surname "Example", teachers "Mrs. Demo", "Mr. Sample"…, opponent "Fictional Christian"), and
 * tools/hub-tour-name-scan.mjs checks the whole folder against the real directory before it is published.
 *
 * Dates are relative to the visitor's today so the tour never looks stale. On a weekend the tour shows the coming Monday
 * as "today" (a school day), and says so.
 */
const p2 = (x) => String(x).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const addDays = (iso, n) => new Date(new Date(iso + "T00:00:00Z").getTime() + n * 86400000).toISOString().slice(0, 10);
export const dowOf = (iso) => new Date(iso + "T00:00:00Z").getUTCDay();
export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DOWL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const md = (iso) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
export const dayMd = (iso) => `${DOW[dowOf(iso)]} ${md(iso)}`;

const real = isoOf(new Date());
const realDow = dowOf(real);
/** The tour's "today": a school day. */
export const TODAY = realDow === 6 ? addDays(real, 2) : realDow === 0 ? addDays(real, 1) : real;
export const SHIFTED = TODAY !== real;
/** The next school day after `iso` (weekends skipped; the one invented closure too). */
export function nextSchoolDay(iso) {
  let d = addDays(iso, 1);
  while (dowOf(d) === 0 || dowOf(d) === 6 || CLOSED[d]) d = addDays(d, 1);
  return d;
}
export const relDay = (iso, today = TODAY) => (iso === today ? "Today" : iso === addDays(today, 1) ? "Tomorrow" : dayMd(iso));
/** The nth school day from TODAY (0 = TODAY). */
function schoolDay(n) { let d = TODAY; for (let i = 0; i < n; i++) { d = addDays(d, 1); while (dowOf(d) === 0 || dowOf(d) === 6) d = addDays(d, 1); } return d; }
function schoolDayBack(n) { let d = TODAY; for (let i = 0; i < n; i++) { d = addDays(d, -1); while (dowOf(d) === 0 || dowOf(d) === 6) d = addDays(d, -1); } return d; }

/** The tour's quarter: ends a few weeks out. */
export const QUARTER = { q: 2, start: addDays(TODAY, -30), end: addDays(TODAY, 40) };

export const PARENT = { email: "parent@example.com" };

/** Bell grid (shape of /_meta/periodTimes.byPattern — pattern → weekday → begin/end), invented times. */
const BELLS = [["08:00", "08:50"], ["08:55", "09:45"], ["09:50", "10:40"], ["10:45", "11:35"], ["12:15", "13:05"], ["13:10", "14:00"], ["14:05", "14:55"]];
export const PERIOD_TIMES = {
  templateName: "Sample bell schedule",
  byPattern: Object.fromEntries(BELLS.map(([b, e], i) => [String(i + 1), { period: `Period ${i + 1}`, days: Object.fromEntries([1, 2, 3, 4, 5].map((d) => [String(d), { begin: b, end: e }])) }])),
};
export const bellOf = (pattern) => BELLS[Number(pattern) - 1];

/** Children. Rowan = high school (periods, a team); Wren = elementary (no periods, no teams) — the two shapes the Hub handles. */
export const KIDS = [
  { id: "900102", first: "Wren", last: "Example", grade: "04", homeroom: "Grade 4 · Mrs. Prototype", email: "", color: "#8E1420" },
  { id: "900101", first: "Rowan", last: "Example", grade: "10", homeroom: "10B · Mr. Sample", email: "rowan.example@student.example", color: "#2563eb",
    gender: "M" },
];

export const CLASSES = {
  "900101": [
    { id: "c-hr10", name: "Homeroom 10B", short: "HR", color: "#4b5563", staffName: "Mr. Sample", room: "204", pattern: null, homeroom: true },
    { id: "c-bib10", name: "Bible 10", short: "Bible", color: "#7e22ce", staffName: "Mr. Mockup", room: "112", pattern: 1 },
    { id: "c-eng10", name: "English 10", short: "Eng", color: "#2563eb", staffName: "Mrs. Demo", room: "208", pattern: 2 },
    { id: "c-geo", name: "Geometry", short: "Geom", color: "#15803d", staffName: "Mr. Sample", room: "204", pattern: 3 },
    { id: "c-bio", name: "Biology", short: "Bio", color: "#0e7490", staffName: "Ms. Specimen", room: "Lab 2", pattern: 4 },
    { id: "c-hist", name: "World History", short: "Hist", color: "#b45309", staffName: "Mrs. Prototype", room: "110", pattern: 5 },
    { id: "c-span", name: "Spanish II", short: "Span", color: "#be185d", staffName: "Sra. Ejemplo", room: "115", pattern: 6 },
    { id: "c-pe", name: "Physical Education 10", short: "PE", color: "#c2410c", staffName: "Coach Testwell", room: "Gym", pattern: 7 },
  ],
  "900102": [
    { id: "c-g4", name: "Grade 4 Homeroom", short: "HR", color: "#4b5563", staffName: "Mrs. Prototype", room: "Room 14", pattern: null, homeroom: true },
    { id: "c-m4", name: "Math 4", short: "Math", color: "#15803d", staffName: "Mrs. Prototype" },
    { id: "c-r4", name: "Reading 4", short: "Read", color: "#2563eb", staffName: "Mrs. Prototype" },
    { id: "c-s4", name: "Science 4", short: "Sci", color: "#0e7490", staffName: "Mrs. Prototype" },
    { id: "c-b4", name: "Bible 4", short: "Bible", color: "#7e22ce", staffName: "Mrs. Prototype" },
  ],
};

export const GRADES = {
  "900101": { "c-bib10": [95.2, "A"], "c-eng10": [88.4, "B+"], "c-geo": [81.0, "B-"], "c-bio": [92.7, "A-"], "c-hist": [90.1, "A-"], "c-span": [86.5, "B"], "c-pe": [99.0, "A+"] },
  "900102": { "c-m4": [93.0, "A"], "c-r4": [97.5, "A+"], "c-s4": [89.0, "B+"], "c-b4": [100, "A+"] },
};

/** Gradebook assignments: status Valid / Missing / Incomplete; points null = not graded yet. */
const A = (cls, title, due, max, got, status = "Valid") => ({ classId: cls, title, dateDue: due, maxPoints: max, receivedPoints: got, status });
export const ASSIGNMENTS = {
  "900101": [
    A("c-geo", "Proofs worksheet 4.2", schoolDayBack(2), 20, null, "Missing"),
    A("c-geo", "Quiz: Congruent Triangles", schoolDayBack(5), 50, 41),
    A("c-geo", "Homework 4.1", schoolDayBack(6), 10, 10),
    A("c-geo", "Chapter 4 Test", schoolDay(4), 100, null),
    A("c-eng10", "Essay draft: A Tale of Two Cities", schoolDayBack(1), 50, null, "Incomplete"),
    A("c-eng10", "Vocabulary Quiz 6", schoolDayBack(4), 25, 23),
    A("c-eng10", "Reading log week 9", schoolDay(1), 10, null),
    A("c-bio", "Lab report: Osmosis", schoolDayBack(3), 40, 37),
    A("c-bio", "Cell diagram", schoolDay(0), 15, null),
    A("c-hist", "Map quiz: Europe", schoolDayBack(3), 30, 28),
    A("c-hist", "Chapter 8 questions", schoolDay(1), 20, null),
    A("c-span", "Vocab 5 quiz", schoolDayBack(2), 20, 17),
    A("c-bib10", "Memory verse", schoolDayBack(1), 10, 10),
    A("c-pe", "Fitness log", schoolDayBack(4), 10, 10),
  ],
  "900102": [
    A("c-m4", "Multiplication facts 7s", schoolDayBack(1), 20, 19),
    A("c-m4", "Word problems p. 112", schoolDay(1), 10, null),
    A("c-r4", "Book report: chapter 3", schoolDayBack(2), 25, 25),
    A("c-s4", "Weather journal", schoolDayBack(3), 15, null, "Incomplete"),
    A("c-s4", "Plant observation", schoolDay(0), 10, null),
    A("c-b4", "Memory verse", schoolDayBack(1), 10, 10),
  ],
};

/** Lesson-plan homework (typed by teachers in FACTS lesson plans), merged with the gradebook on the Homework tab. */
const H = (cls, title, due, detail = "") => ({ classId: cls, title, dueOn: due, detail, source: "lessonplan" });
export const LESSON_HW = {
  "900101": [
    H("c-span", "Practice conjugations, p. 88 #1–20", schoolDay(0), "Practice conjugations, p. 88 #1–20.\nCheck answers in the back of the book."),
    H("c-eng10", "Read chapters 9–10", schoolDay(1), "Read chapters 9–10 and jot down two questions for Thursday's discussion."),
    H("c-bib10", "Memory verse: Psalm 119:105", schoolDay(2)),
    H("c-hist", "Study for the map quiz retake (optional)", schoolDay(3)),
  ],
  "900102": [
    H("c-r4", "Read 20 minutes and log it", schoolDay(0)),
    H("c-m4", "Practice 8s facts", schoolDay(1), "Practice the 8s facts with the flash cards sent home today."),
  ],
};

export const ATTENDANCE = {
  "900101": [{ date: schoolDayBack(7), code: "T", codeName: "Tardy", tardy: true }],
  "900102": [{ date: schoolDayBack(9), code: "AE", codeName: "Absent Excused", absent: true, excused: true }],
};

/** Sports profile (Talon Hub's record, mirrored to the Hub): physical + handbook. */
export const SPORTS = {
  "900101": { teams: ["Varsity Boys Basketball"], physical: { state: "ok", text: `On file · expires ${md(addDays(TODAY, 200))}` }, handbookSigned: false },
};

/** Games (shape of an /athletics doc, as packages/facts-client/gameday.js renders it). */
export const GAMES = {
  "900101": [
    { date: TODAY, teamName: "Varsity Boys Basketball", title: "at Fictional Christian", location: "Fictional Christian Academy", homeAway: "away",
      start: "18:00", allDay: false, canceled: false, dismiss: "14:15", depart: "14:30" },
    { date: schoolDay(3), teamName: "Varsity Boys Basketball", title: "vs Imaginary Valley", location: "HCS Gym", homeAway: "home",
      start: "18:00", allDay: false, canceled: false, dismiss: null, depart: null },
  ],
};
export const TEAMS = { "900101": [{ id: "t-vbb", name: "Varsity Boys Basketball" }] };

/** Lunch (shape of /_meta/lunchMenu + each child's orders): this week + next, school days only. */
export const LUNCH_MENU = [
  { name: "Chicken Tenders", price: 5.25 }, { name: "Pizza Slice", price: 4.75 }, { name: "Turkey & Cheese Sandwich", price: 5.0 },
  { name: "Mac & Cheese", price: 4.5 }, { name: "Taco Bowl", price: 5.5 }, { name: "Chocolate Milk", price: 0.75, note: "add-on" },
];
const MAINS = ["Chicken Tenders", "Pizza Slice", "Taco Bowl", "Mac & Cheese", "Turkey & Cheese Sandwich"];
export function lunchWeeks() {
  const mon = addDays(TODAY, -((dowOf(TODAY) + 6) % 7));
  return [0, 1].map((w) => ({ label: w ? "Next week" : "This week",
    days: [0, 1, 2, 3, 4].map((i) => addDays(mon, w * 7 + i)).filter((d) => d >= TODAY).map((d) => ({ date: d, closed: !!CLOSED[d], main: MAINS[dowOf(d) - 1] })) }));
}
/** What each child ordered (✓) — some days not ordered, so the "Not ordered" state shows too. */
export function lunchOrder(kid, date) {
  const n = Math.round((Date.parse(date) - Date.parse(TODAY)) / 86400000);
  if (kid === "900101") return n % 3 === 2 ? null : [{ name: MAINS[dowOf(date) - 1], qty: 1, price: LUNCH_MENU.find((m) => m.name === MAINS[dowOf(date) - 1]).price }];
  return n % 2 === 1 ? null : [{ name: MAINS[dowOf(date) - 1], qty: 1, price: LUNCH_MENU.find((m) => m.name === MAINS[dowOf(date) - 1]).price }, { name: "Chocolate Milk", qty: 1, price: 0.75 }];
}

/** The school calendar (60 days). who = the child ids it concerns (the Hub's guess from the title); rule = why. */
const E = (key, title, date, start, who = [], rule = "", extra = {}) => ({ key, title, date, start, allDay: !start, childIds: who, rule, ...extra });
const inService = schoolDay(9);
export const CLOSED = { [inService]: "No School – Teacher In-Service" };
export const EARLY = { [schoolDay(6)]: "Early Dismissal – 12:00 PM" };
export const EVENTS = [
  E("ev-chapel", "Chapel: Guest Speaker", schoolDay(1), "08:10", ["900101", "900102"], "school"),
  E("ev-g10", "Grade 10 Class Meeting", schoolDay(1), "14:10", ["900101"], "grade"),
  E("ev-photo", "Picture Retake Day", schoolDay(3), "", [], ""),
  E("ev-bookfair", "Book Fair (Library)", schoolDay(2), "", [], "", { endDate: schoolDay(4) }),
  E("ev-g4trip", "4th Grade Field Trip: Science Center", schoolDay(5), "09:00", ["900102"], "grade"),
  E("ev-early", "Early Dismissal – 12:00 PM", schoolDay(6), "", ["900101", "900102"], "school"),
  E("ev-band", "Fall Band Concert", schoolDay(7), "19:00", [], ""),
  E("ev-inservice", "No School – Teacher In-Service", inService, "", ["900101", "900102"], "school"),
  E("ev-ptc", "Parent-Teacher Conferences", schoolDay(12), "15:30", [], ""),
  E("ev-spirit", "Spirit Week", schoolDay(14), "", [], "", { endDate: schoolDay(18) }),
  E("ev-drama", "Fall Drama Production", schoolDay(16), "19:00", [], ""),
  E("ev-g4music", "Grade 4 Music Program", schoolDay(20), "18:30", ["900102"], "grade"),
  E("ev-sat", "SAT Practice Test (Grades 10–11)", schoolDay(24), "08:00", ["900101"], "grade"),
  E("ev-quarter", "End of Quarter 2", QUARTER.end, "", [], ""),
];
