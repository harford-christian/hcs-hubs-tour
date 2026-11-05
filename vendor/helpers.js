/**
 * @hcs/facts-client — pure helpers (no Firebase imports) so they can be unit-tested in Node and
 * shared by facts-client.js. Anything here must stay side-effect free.
 */

/** FACTS gradebook status codes → words (docs/SCHEMA.md "Conventions"). One source of truth. */
export const GRADE_STATUS = Object.freeze({
  65: "Absent", 68: "Dropped", 69: "Excused", 73: "Incomplete", 77: "Missing", 80: "Pending", 86: "Valid",
});

/** The set of words the sync may have written into `status` (it maps codes at write time). */
const STATUS_WORDS = new Set(Object.values(GRADE_STATUS));

/**
 * Normalise a stored `status` (word written by the sync, or a stray numeric code) to a word.
 * Unknown → "" so a raw code can never leak onto the screen.
 */
export function statusWord(status) {
  if (status === undefined || status === null || status === "") return "";
  if (typeof status === "number" || /^\d+$/.test(String(status))) return GRADE_STATUS[Number(status)] || "";
  return STATUS_WORDS.has(status) ? status : "";
}

/**
 * Display string for one assignment grade. Never shows a raw status code.
 *   Valid / unspecified with points → "18 / 20"   (receivedPoints / gradeMaxPoints)
 *   Missing, Excused, Absent, …     → that word    ("Missing", "Excused")
 *   Pending or no points yet        → "—"          (ungraded)
 * Points use `gradeMaxPoints` (the per-grade max) and fall back to `maxPoints` (the assignment's).
 */
export function formatGrade({ receivedPoints, gradeMaxPoints, maxPoints, status } = {}) {
  const word = statusWord(status);
  if (word && word !== "Valid" && word !== "Pending") return word; // Missing, Excused, Absent, Dropped, Incomplete
  const has = (v) => v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v));
  if (word === "Pending" || !has(receivedPoints)) return "—"; // em dash = ungraded
  const max = has(gradeMaxPoints) ? Number(gradeMaxPoints) : has(maxPoints) ? Number(maxPoints) : null;
  const got = Number(receivedPoints);
  return max === null ? String(got) : `${got} / ${max}`;
}

/** Role from decoded ID-token claims; anything unknown or missing → null (reads nothing). */
export function roleFromClaims(claims) {
  const r = claims && claims.role;
  return r === "admin" || r === "staff" || r === "parent" || r === "student" ? r : null;
}

/**
 * Student IDs this principal may read *by claim*: parent → studentIds[], student → [studentId].
 * Staff/admin → [] (they are not ID-listed; use roster queries). Always strings.
 */
export function studentIdsFromClaims(claims) {
  const role = roleFromClaims(claims);
  if (role === "parent") return Array.isArray(claims.studentIds) ? claims.studentIds.map(String) : [];
  if (role === "student") return claims.studentId !== undefined && claims.studentId !== null ? [String(claims.studentId)] : [];
  // B2b: staff/admin who are ALSO FACTS guardians carry their own children (syncMyClaims 2026-11-02); other staff → [].
  if (role === "staff" || role === "admin") return Array.isArray(claims.studentIds) ? claims.studentIds.map(String) : [];
  return [];
}

/** A Date `days` ago at local midnight — the lower bound for "recent" queries. */
export function sinceDate(days, now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - Math.max(0, Number(days) || 0));
  return d;
}

/** `sinceDate` as `YYYY-MM-DD`, for date fields the sync stores as ISO strings. */
export function sinceIso(days, now = new Date()) {
  const d = sinceDate(days, now);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** `YYYY-MM-DD` for local midnight `days` AHEAD of now — the upper bound for "due in the next N days" queries (B2). */
export function untilIso(days, now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + Math.max(0, Number(days) || 0));
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ───────── B4 (today's ride) — pure interpretation of /transport_status/{studentId}; additive ───────── */

/**
 * Today's ride from one `/transport_status` doc (docs/SCHEMA.md B4; written by the FACTS Dismissal GAS, never a client).
 * `today` counts only when its `day` is `todayIso` — yesterday's change simply stops applying at midnight, no write needed.
 * `beat` = `/_meta/sync.transportStatus` (already in `dataFreshness()`); `live` says the publisher ran today.
 * @return {{published:false} | {published:true, live, am, pm, usual, changed, standing, flag}}
 */
export function rideForToday(doc, todayIso, beat) {
  if (!doc || !doc.base || !doc.base.pm) return { published: false };
  const t = doc.today && doc.today.day === todayIso ? doc.today : null;
  return {
    published: true,
    live: !!(beat && beat.day === todayIso),
    am: doc.base.am || null,
    pm: (t && t.pm) || doc.base.pm,
    usual: t && t.pm ? doc.base.pm : null,      // set only when today's answer came from the board
    changed: !!(t && t.changed),
    standing: !!(t && t.standing),
    flag: (t && t.flag) || null,
  };
}

const routeWords = (routes) => (routes || []).map((r) => `${r.name || r.code}${r.colour ? ` (${r.colour})` : ""}`).join(" or ");

/** One line for a ride: "Bus — Abingdon (Orange)", "Car rider", "Walk-up — to the High School lobby", … Never empty. */
export function describeRide(ride) {
  if (!ride) return "Not on file";
  switch (ride.mode) {
    case "Bus": return ride.routes && ride.routes.length ? `Bus — ${routeWords(ride.routes)}` : "Bus";
    case "Car": return "Car rider";
    case "Early Bird": return "Early Bird — released before the buses for car pickup";
    case "Staff Kid": return ride.walkTo ? `Walked to ${ride.walkTo} (staff parent)` : "Walked to their staff parent";
    case "Walk-up": return `Walk-up — to ${ride.walkTo || "the High School lobby"}`;
    case "Half day": return "Half day — Kindergarten entrance about 11:30, by car";
    default: return String(ride.mode || "Not on file");
  }
}

/** 'HH:mm' → '1:04 PM'. */
export function clock12(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

/** The parent's line for a flag (category + time only — the GAS never publishes a reason text or another person). */
export function describeFlag(flag) {
  if (!flag) return "";
  const at = clock12(flag.at);
  switch (flag.kind) {
    case "absent": return "Absent today";
    case "signedOut": return at ? `Signed out at ${at}` : "Signed out";
    case "leftEarly": return "Left early";
    case "noSchool": return "No school today (K4/K5 weather delay)";
    case "pickupPlanned": return at ? `Early pickup planned for ${at}` : "Early pickup planned";
    case "gameDay": return "Game-day dismissal";
    default: return "";
  }
}

/** Prefix-search key — MUST match functions/sync-config.js searchKey (lowercase, accents stripped, spaces collapsed). */
export function searchKey(s) {
  const t = String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
  return t;
}

/* ───────── B3 Conferences (apps/conferences/SPEC.md) — pure; mirrored by functions/conferences.js (parity test) ───────── */
const NOT_CONFERENCE = /\b(home ?room|study hall|lunch)\b/i;
/**
 * D3 — the teachers a parent books for one child: K-6 → the homeroom teacher (else the child's class teachers);
 * 7-12 → every distinct primary teacher of a class with a `period`, minus Homeroom / Study Hall / Lunch.
 * `student` = /students doc; `classes` = [{id, ...classDoc}] for this term's schedule rows.
 * → [{staffId, staffName, classId|null, classNames[]}], one per teacher.
 */
/** D3 band of a FACTS grade value: "secondary" (7-12) or "elementary" (PK-6, homeschool, unknown). */
export function conferenceBand(grade) {
  const g = String(grade ?? "").trim().replace(/^0+/, "");
  const n = /^\d+$/.test(g) ? Number(g) : NaN;
  return Number.isFinite(n) && n >= 7 ? "secondary" : "elementary";
}

export function conferenceTeachers(student, classes) {
  const s = (v) => (v === undefined || v === null ? "" : String(v).trim());
  const g = s(student && student.grade).replace(/^0+/, "");
  const n = /^\d+$/.test(g) ? Number(g) : (/^(K|PK|K\d)/i.test(g) ? 0 : NaN);
  const byTeacher = new Map();
  const add = (staffId, staffName, classId, className) => {
    if (!staffId) return;
    const t = byTeacher.get(staffId) || { staffId, staffName: staffName || "", classId: classId || null, classNames: [] };
    if (className && !t.classNames.includes(className)) t.classNames.push(className);
    if (!t.staffName && staffName) t.staffName = staffName;
    byTeacher.set(staffId, t);
  };
  if (!(Number.isFinite(n) && n >= 7)) {
    const hr = s(student && student.homeroomTeacherId);
    if (hr) {
      const c = classes.find((x) => s(x.staffId) === hr) || {};
      add(hr, c.staffName, s(student.homeroomClassId) || c.id || null, "Homeroom");
      return [...byTeacher.values()];
    }
    for (const c of classes) add(s(c.staffId), c.staffName, c.id, c.description || c.name);
    return [...byTeacher.values()];
  }
  for (const c of classes) {
    if (!c.period) continue;
    if (NOT_CONFERENCE.test(`${c.name || ""} ${c.description || ""} ${c.period || ""}`)) continue;
    add(s(c.staffId), c.staffName, c.id, c.description || c.name);
  }
  return [...byTeacher.values()];
}

/* ───────────── B7 absence reports (pure) ───────────── */

export const ABSENCE_KIND_LABEL = Object.freeze({ absent: "Absent", late: "Arriving late", early: "Leaving early" });

/**
 * `/absenceReports` docs (one child, one day) → display groups, like the tracker's Entries.familyGroups: only ACTIVE
 * docs; 'upcoming' = days from today on (soonest first), 'past' = days before today (latest first). A group that spans
 * today shows its past days under past and the rest under upcoming. Built from the children, not the reporter, so every
 * guardian of the same children sees the same list (tracker #22).
 * @return {Array<{groupId, kind, kindLabel, reason, time, pickupBy, note, reportedByName, mine, pushed, studentIds:[], days:[]}>}
 */
export function absenceGroups(docs, todayIso, when = "upcoming", myUid = "") {
  const past = when === "past";
  const by = new Map();
  for (const r of docs || []) {
    if (!r || r.status !== "active" || !r.date) continue;
    if (past ? r.date >= todayIso : r.date < todayIso) continue;
    let g = by.get(r.groupId);
    if (!g) {
      g = { groupId: r.groupId, kind: r.kind, kindLabel: ABSENCE_KIND_LABEL[r.kind] || r.kind, reason: r.reason || "", time: r.time || "",
        pickupBy: r.pickupBy || "", note: r.note || "", reportedByName: r.reportedByName || "", mine: !!myUid && r.guardianUid === myUid,
        pushed: false, studentIds: [], days: [] };
      by.set(r.groupId, g);
    }
    if (!g.studentIds.includes(String(r.studentId))) g.studentIds.push(String(r.studentId));
    if (!g.days.includes(r.date)) g.days.push(r.date);
    if (r.pushed && r.pushed.result === "pushed") g.pushed = true;
  }
  const out = [...by.values()];
  for (const g of out) g.days.sort();
  out.sort((a, b) => (a.days[0] < b.days[0] ? -1 : a.days[0] > b.days[0] ? 1 : 0));
  return past ? out.reverse() : out;
}

/** Is this child reported for `iso` with this kind (default absent)? Used to reconcile the ride card. */
export function reportedOn(docs, studentId, iso, kind = "absent") {
  return (docs || []).find((r) => r && r.status === "active" && String(r.studentId) === String(studentId) && r.date === iso && r.kind === kind) || null;
}

/* ───────────────────────── B8: game-day dismissals (pure; rendered by ./gameday.js) ───────────────────────── */

/** "HH:MM[:SS]" → minutes since midnight; -1 if unparseable. */
const athMin = (s) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(s || "")); return m ? Number(m[1]) * 60 + Number(m[2]) : -1; };

/**
 * Which `/athletics` docs belong to ONE student. The query already matched `rosterClassIds` against the student's
 * classes; this applies the per-class gender list (`rosterGenders[classId]`, present only when the team depends on
 * the student's gender — e.g. "JVVB" names none and the only JV volleyball calendar is girls') and the date window.
 * A student whose record has no gender matches only teams that also apply to "" (silence beats a wrong bus time).
 * @returns events sorted by date, then start (all-day last)
 */
export function athleticsForStudent(docs, { classIds = [], gender = "", from = "", to = "" } = {}) {
  const mine = new Set((classIds || []).map(String));
  const g = String(gender || "").trim().toLowerCase().charAt(0);
  const want = g === "m" ? "M" : g === "f" ? "F" : "";
  const out = (docs || []).filter((d) => {
    if (!d || (from && d.date < from) || (to && d.date > to)) return false;
    return (d.rosterClassIds || []).some((cid) => {
      if (!mine.has(String(cid))) return false;
      const only = d.rosterGenders && d.rosterGenders[cid];
      return !Array.isArray(only) || only.includes(want);
    });
  });
  const startKey = (d) => { const m = athMin(d.start); return m < 0 ? 9999 : m; };
  return out.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : startKey(a) - startKey(b) || String(a.teamName || "").localeCompare(String(b.teamName || ""))));
}

/**
 * The class periods a dismissal takes a student out of, on the event's weekday.
 * A period is MISSED when it is still in session at the dismissal time: bell end > dismissal (a dismissal mid-period
 * counts that period — `partial: true`; one at the exact bell end does not). Joined like the Today tab: class
 * `pattern` × `/_meta/periodTimes.byPattern[pattern].days[weekdayCol]`. Lunch slots are not classes and are skipped.
 * @param {{date:string, dismiss:string|null, canceled?:boolean}} event
 * @param {Array<{id, name, pattern, period?}>} classes  the student's classes this quarter
 * @param {Object|null} periodTimes  the /_meta/periodTimes doc
 * @returns {{ status: "notPosted"|"canceled"|"noSchool"|"noGrid"|"ok", periods: Array<{id, name, period, begin, end, partial}> }}
 *   noGrid = no bell grid, or none of the classes has a period (K-6) → show the dismissal time only.
 */
export function missedPeriods(event, classes, periodTimes) {
  if (!event || event.canceled) return { status: "canceled", periods: [] };
  const dm = athMin(event.dismiss);
  if (dm < 0) return { status: "notPosted", periods: [] };
  const dow = new Date(`${event.date}T00:00:00Z`).getUTCDay();
  if (!(dow >= 1 && dow <= 5)) return { status: "noSchool", periods: [] };
  const byPattern = (periodTimes && periodTimes.byPattern) || null;
  const timed = (classes || []).filter((c) => c && c.pattern !== null && c.pattern !== undefined && c.pattern !== "");
  if (!byPattern || !timed.length) return { status: "noGrid", periods: [] };
  const periods = [];
  for (const c of timed) {
    const pat = byPattern[String(c.pattern)];
    const cell = pat && pat.days ? pat.days[String(dow)] : null;
    if (!cell) continue;
    const label = String(c.period || pat.period || cell.slotLabel || "");
    if (/^lunch/i.test(label) || /^lunch/i.test(String(c.name || ""))) continue;
    const b = athMin(cell.begin);
    let e = athMin(cell.end);
    if (b < 0 || e < 0) continue;
    if (e <= b && e + 720 - b <= 120) e += 720;          // 12-hour typed end ("12:33-01:11"), as schedule-order.js
    if (e > dm) periods.push({ id: String(c.id), name: c.name || "", period: label, begin: cell.begin.slice(0, 5), end: `${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`, partial: b < dm });
  }
  periods.sort((x, y) => athMin(x.begin) - athMin(y.begin));
  return { status: "ok", periods };
}

/**
 * B8b: the teams ONE student is on, from `/_meta/athleticsRoster` ({ teams:[{id,name,sport}], classes:[{classId, teams:[{id, genders}]}] })
 * and the student's class ids + gender — the same per-class gender rule as `athleticsForStudent` (a gender-dependent
 * team is shown only when the student's "M"/"F"/"" is listed). Sorted by team name; [] = on no team (the Hub shows nothing).
 */
export function teamsForStudent(roster, { classIds = [], gender = "" } = {}) {
  if (!roster || !Array.isArray(roster.classes)) return [];
  const mine = new Set((classIds || []).map(String));
  const g = String(gender || "").trim().toLowerCase().charAt(0);
  const want = g === "m" ? "M" : g === "f" ? "F" : "";
  const names = new Map((roster.teams || []).map((t) => [t.id, t]));
  const ids = new Set();
  for (const c of roster.classes) {
    if (!mine.has(String(c.classId))) continue;
    for (const t of c.teams || []) if (!Array.isArray(t.genders) || t.genders.includes(want)) ids.add(t.id);
  }
  // Every team the student's roster classes resolve to, YEAR-ROUND (2026-11-03: "Keep fall teams shown"). The
  // roster's `inSeason` flag rides along on each team, but nothing filters on it.
  return [...ids].map((id) => names.get(id) || { id, name: id, sport: "" }).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}
