/**
 * Parent Hub tour — a static copy of apps/parent-portal/public/app.js's screens (same markup + classes, so the real
 * stylesheet renders them), driven by the invented family in demo-data.js. No Firebase, no network, no writes: the sign-in
 * buttons only switch screens, the absence form ends in "This is a demo, nothing was sent", and every link that would
 * leave the Hub (FACTS, Talon Hub, the trip form) opens an explainer sheet instead. CLAIMS.md maps each tour claim to code.
 */
import { $, esc, tourBar, startTour, endTour, tourRunning, againButton, explain } from "./tour.js";
import * as D from "./demo-data.js";
import { renderAthletics, gameDayStyles } from "../vendor/gameday.js";

const { TODAY, addDays, dowOf, md, dayMd, relDay, DOW } = D;
const TALON_DEMO = "https://talon-hub.harfordchristian.org/?demo=1";

/* ───────────── icons (apps/parent-portal/public/app.js ICON) ───────────── */
const ICON = {
  overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>',
  grades: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6"/></svg>',
  homework: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  attendance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  chev: '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
};
const TABS = [{ id: "overview", label: "Overview" }, { id: "grades", label: "Grades" }, { id: "homework", label: "Homework" }, { id: "attendance", label: "Attendance" }, { id: "calendar", label: "Calendar" }];
const SECTIONS = [
  { id: "homework", label: "Homework" }, { id: "missing", label: "Missing or incomplete" }, { id: "goodtoknow", label: "Good to Know" },
  { id: "lunch", label: "Lunch" }, { id: "athletics", label: "Athletics" }, { id: "ride", label: "Today's ride" }, { id: "absences", label: "Absent, late or leaving early" },
];
const KID_COLORS = ["#8E1420", "#2563eb"];

/* ───────────── state ───────────── */
const S = {
  tab: "overview", kid: D.KIDS[0].id, all: true, hdrOpen: false, arranging: false, order: SECTIONS.map((s) => s.id),
  calView: "list", calMine: false, calAnchor: "", calDay: "", picks: {}, focus: "",
  kids: Object.fromEntries(D.KIDS.map((k) => [k.id, { hwFilter: "all", openClass: null }])),
  abs: { open: false, form: null, msg: null }, reports: [],
};
const kidById = (id) => D.KIDS.find((k) => k.id === id);
const me = () => kidById(S.kid);
const kidName = (s) => s.first;
const kidColor = (id) => KID_COLORS[D.KIDS.findIndex((k) => k.id === id) % KID_COLORS.length];
const dispGrade = (g) => String(g || "").replace(/^0/, "");
const gradeNum = (g) => Number(String(g).replace(/\D/g, "")) || 0;
const allView = () => S.all && S.tab === "overview";
const cls = (kid, cid) => (D.CLASSES[kid] || []).find((c) => c.id === cid) || { name: "Class", short: "?", color: "#6b7280" };
const kchip = (kid, cid) => { const c = cls(kid, cid); return `<span class="kchip" style="--c:${esc(c.color)}">${esc(c.short)}</span>`; };
const clock = (hhmm) => { if (!hhmm) return ""; let [h, m] = hhmm.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}:${String(m).padStart(2, "0")} ${ap}`; };
const goAttr = (t) => ` data-go="${esc(JSON.stringify(t))}"`;
const PILL = { Missing: "miss", Incomplete: "late" };
const pill = (w) => (w && PILL[w] ? `<span class="pill ${PILL[w]}">${esc(w)}</span>` : "");
const money = (n) => `$${n.toFixed(2)}`;

/* ───────────── homework: gradebook + lesson plans, one list (hub-views.buildHomework, simplified) ───────────── */
function homework(kid) {
  const gb = (D.ASSIGNMENTS[kid] || []).filter((a) => a.status === "Valid" && a.receivedPoints === null)
    .map((a) => ({ classId: a.classId, title: a.title, dueOn: a.dateDue, points: a.maxPoints, source: "assignment", detail: "" }));
  return [...gb, ...(D.LESSON_HW[kid] || [])].sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.title.localeCompare(b.title));
}
const flagged = (kid) => (D.ASSIGNMENTS[kid] || []).filter((a) => a.status === "Missing" || a.status === "Incomplete");
/** Today + the next school day (the Hub's "next 24 hours" box). */
function soonGroups(kid) {
  const hw = homework(kid), next = D.nextSchoolDay(TODAY);
  return [{ label: "Due today", day: TODAY }, { label: `Due ${next === addDays(TODAY, 1) ? "tomorrow" : DOW[dowOf(next)]} (${dayMd(next)})`, day: next }]
    .map((g) => ({ ...g, items: hw.filter((it) => it.dueOn === g.day) }));
}

/* ───────────── Good to Know (today + the next school day; ★ up to a week ahead) ───────────── */
const onHome = (e) => S.picks[e.key] === "star" || (S.picks[e.key] !== "hide" && e.childIds.length > 0);
const GK_TAG = { sports: "Game", calendar: "Calendar", school: "School", starred: "★ Starred", absence: "Your report", closed: "No school", early: "Early dismissal", profile: "Athletics" };
const FAMILY_KINDS = new Set(["closed", "early", "school"]);
function gtkLines() {
  const next = D.nextSchoolDay(TODAY), win = [TODAY, next], week = addDays(TODAY, 7), lines = [];
  const when = (d) => (d === TODAY ? "Today" : d === addDays(TODAY, 1) ? "Tomorrow" : DOW[dowOf(d)]);
  for (const d of win) {
    if (D.CLOSED[d]) lines.push({ kind: "closed", date: d, text: `${when(d)}: ${D.CLOSED[d]}`, childIds: D.KIDS.map((k) => k.id), key: "ev-inservice" });
    if (D.EARLY[d]) lines.push({ kind: "early", date: d, text: `${when(d)}: ${D.EARLY[d]}`, childIds: D.KIDS.map((k) => k.id), key: "ev-early" });
  }
  for (const e of D.EVENTS) {
    if (e.key === "ev-inservice" || e.key === "ev-early") continue;
    const starred = S.picks[e.key] === "star";
    const inWin = win.includes(e.date) || (e.endDate && e.date <= next && e.endDate >= TODAY);
    if (!(starred ? e.date >= TODAY && e.date <= week : inWin && onHome(e))) continue;
    const names = e.childIds.map((id) => kidName(kidById(id)));
    lines.push({ kind: starred ? "starred" : e.rule === "school" ? "school" : "calendar", date: e.date, key: e.key, childIds: e.childIds.length ? e.childIds : D.KIDS.map((k) => k.id),
      text: `${when(e.date) === DOW[dowOf(e.date)] ? dayMd(e.date) : when(e.date)}: ${e.title}${e.start ? ` · ${clock(e.start)}` : ""}${names.length && e.rule !== "school" ? ` (${names.join(", ")})` : ""}` });
  }
  for (const k of D.KIDS) {
    for (const g of D.GAMES[k.id] || []) if (win.includes(g.date)) lines.push({ kind: "sports", date: g.date, childIds: [k.id],
      text: `${when(g.date)}: ${g.teamName} ${g.title} · ${clock(g.start)}${g.dismiss ? ` · ${k.first} leaves class at ${clock(g.dismiss)}` : ""}` });
    const sp = D.SPORTS[k.id];
    if (sp && !sp.handbookSigned) lines.push({ kind: "profile", item: "handbook", date: TODAY, childIds: [k.id], text: `${k.first}: athletic handbook not signed yet` });
  }
  for (const r of S.reports) if (r.days.some((d) => win.includes(d))) lines.push({ kind: "absence", date: r.days[0], childIds: r.studentIds, text: `${when(r.days[0])}: ${r.studentIds.map((id) => kidName(kidById(id))).join(", ")} — ${r.kindLabel.toLowerCase()} (${r.reason})` });
  const order = { closed: 0, early: 1, absence: 2, sports: 3, profile: 4, school: 5, calendar: 6, starred: 7 };
  return { next, lines: lines.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind]) };
}
function gtkTarget(l) {
  const kid = l.childIds[0];
  if (l.kind === "profile") return { tab: "overview", kid, prep: "profile", focus: `prof:${l.item}` };
  if (l.kind === "sports") return { tab: "overview", kid, focus: "sec:athletics" };
  if (l.kind === "absence") return { tab: "overview", kid, prep: "absences", focus: "sec:absences" };
  return { tab: "calendar", prep: "calAll", focus: l.key ? `cal:${l.key}` : "" };
}
const windowLabel = (next) => `today + ${next === addDays(TODAY, 1) ? "tomorrow" : DOW[dowOf(next)]}`;
function gtkCard(childId) {
  const { next, lines } = gtkLines();
  const shown = childId ? lines.filter((l) => l.childIds.includes(childId) && !FAMILY_KINDS.has(l.kind) && !(l.kind === "starred" && l.childIds.length > 1)) : lines;
  const who = childId ? kidName(kidById(childId)) : "";
  let rows = shown.map((l) => `<div class="gk ${esc(l.kind)}"><button type="button" class="gk-go"${goAttr(gtkTarget(l))}><span class="tag">${esc(GK_TAG[l.kind])}</span><span class="m">${esc(l.text)}</span>${ICON.chev}</button>` +
    (l.key ? `<button type="button" class="gkhide" data-gkhide="${esc(l.key)}" aria-label="Hide from Home">✕</button>` : "") + "</div>").join("");
  if (!shown.length) rows += `<div class="notice"><div class="m">${who ? `Nothing just for ${esc(who)}` : "Nothing to know"} ${esc(windowLabel(next).replace("today + ", "today or "))}.</div></div>`;
  return `<div class="grouplabel"><span>Good to Know${who ? ` · ${esc(who)}` : ""}</span><span class="cnt">${esc(windowLabel(next))}</span></div><div class="card" id="gtk">${rows}</div>`;
}

/* ───────────── shell: kids, tabs, routing ───────────── */
function renderKids() {
  const el = $("#kids");
  if (S.tab === "calendar") { el.innerHTML = ""; el.hidden = true; return; }
  el.hidden = false;
  const every = S.tab === "overview" ? `<button type="button" class="chip kid every${allView() ? " on" : ""}" data-kid="all" style="--c:#8E1420" aria-pressed="${allView()}">Everyone</button>` : "";
  el.innerHTML = every + D.KIDS.map((s) => { const on = !allView() && S.kid === s.id; return `<button type="button" class="chip kid${on ? " on" : ""}" data-kid="${s.id}" style="--c:${kidColor(s.id)}" aria-pressed="${on}">${esc(s.first)} <small>Gr ${esc(dispGrade(s.grade))}</small></button>`; }).join("");
}
function renderTabs() {
  $("#tabs").innerHTML = TABS.map((t) => `<button type="button" class="tab${S.tab === t.id ? " on" : ""}" data-tab="${t.id}" role="tab" aria-selected="${S.tab === t.id}"><span class="ic">${ICON[t.id]}</span>${t.label}</button>`).join("");
  $("#topnav").innerHTML = TABS.map((t) => `<button type="button" class="${S.tab === t.id ? "on" : ""}" data-tab="${t.id}">${t.label}</button>`).join("");
}
function showTab(id, { keepScroll = false } = {}) {
  S.tab = id; S.arranging = false;
  renderTabs(); renderKids();
  if (!keepScroll && !tourRunning()) window.scrollTo(0, 0);
  render();
}
const PREP = { profile: () => { S.hdrOpen = true; }, absences: () => { S.abs.open = true; }, calAll: () => { S.calMine = false; } };
function go(t) {
  if (t.kid) { S.kid = t.kid; S.all = false; } else if (t.all) S.all = true;
  if (t.openClass) S.kids[S.kid].openClass = t.openClass;
  for (const p of [].concat(t.prep || [])) PREP[p] && PREP[p]();
  S.focus = t.focus || "";
  showTab(t.tab);
}
/** Scroll to + highlight a deep-linked item (the real app's applyFocus). */
function applyFocus() {
  if (!S.focus) return;
  const el = [...document.querySelectorAll("[data-focus]")].find((x) => x.dataset.focus === S.focus);
  S.focus = "";
  if (!el || tourRunning()) return;
  setTimeout(() => { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.classList.add("hl"); setTimeout(() => el.classList.remove("hl"), 2600); }, 0);
}
const RENDER = { overview: renderOverview, grades: renderGrades, homework: renderHomework, attendance: renderAttendance, calendar: renderCalendar };
function render() { RENDER[S.tab](); applyFocus(); }

/* ───────────── OVERVIEW ───────────── */
function headerCard(s) {
  const sp = D.SPORTS[s.id];
  const line = [`Grade ${dispGrade(s.grade)}`, `Q${D.QUARTER.q} ends ${md(D.QUARTER.end)}`].join(" · ");
  const row = (label, value, c = "", focus = "", act = "") => `<div class="ov-row${act ? " act" : ""}"${focus ? ` data-focus="${focus}"` : ""}><span class="k">${label}</span><span class="v${c ? ` ${c}` : ""}">${value}</span>${act}</div>`;
  let sports = "";
  if (sp) {
    sports += row("Teams this year", esc(sp.teams.join(" · ")));
    sports += row("Sports physical", esc(sp.physical.text), "ok", "prof:physical");
    sports += row("Athletic handbook", sp.handbookSigned ? "Signed" : "Not signed yet", sp.handbookSigned ? "ok" : "warn", "prof:handbook",
      sp.handbookSigned ? "" : `<a class="btn small resolve" href="#" data-explain="handbook">Sign in Talon Hub ↗</a><span class="rnote">Handbook signing is coming to Talon Hub; until it is there, the athletic office can help.</span>`);
  }
  return `<details class="card hdr" id="hdr"${S.hdrOpen ? " open" : ""}><summary><span class="hi">${esc(`${s.first} ${s.last}`)}</span><span class="sub">${esc(line)}</span>${ICON.chev}</summary>` +
    row("Homeroom", esc(s.homeroom)) + row("Student ID", `<span class="mono">${esc(s.id)}</span>`) +
    (s.email ? row("School email", `<span class="mono">${esc(s.email)}</span>`) : "") + sports +
    row("Quarter", `Q${D.QUARTER.q} · ends ${esc(md(D.QUARTER.end))}`) + row("Data as of", esc(freshness())) + "</details>";
}
const freshness = () => `${D.MON[Number(TODAY.slice(5, 7)) - 1]} ${Number(TODAY.slice(8, 10))}, 7:30 AM`;
function homeworkSoonCard(kid) {
  const groups = soonGroups(kid), n = groups.reduce((a, g) => a + g.items.length, 0);
  let html = `<div class="grouplabel"><span>Homework</span><span class="cnt">${n}</span></div><div class="card" id="hw-soon">`;
  if (!n) html += '<div class="empty"><b>Nothing due today or tomorrow.</b><br>From the gradebook and teachers\' lesson plans.</div>';
  for (const g of groups) {
    if (!g.items.length) continue;
    html += `<div class="daybar"><span><b>${esc(g.label)}</b></span></div>`;
    for (const it of g.items) html += `<button type="button" class="item soon go"${goAttr({ tab: "homework", kid })}>${kchip(kid, it.classId)}<div class="txt"><div class="ttl">${esc(it.title)}</div><div class="meta"><span>${esc(cls(kid, it.classId).name)}</span></div></div>${ICON.chev}</button>`;
  }
  return html + `<button type="button" class="mrow" data-tab="homework"><span>All homework</span>${ICON.chev}</button></div>`;
}
function dueItem(kid, a) {
  const late = a.dateDue < TODAY;
  return `<button type="button" class="item go${late ? " late" : ""}"${goAttr({ tab: "grades", kid, openClass: a.classId, focus: `as:${a.title}` })}>${kchip(kid, a.classId)}<div class="txt"><div class="ttl">${esc(a.title)}</div>` +
    `<div class="meta"><span class="due">${late ? "Was due " : "Due "}${esc(relDay(a.dateDue))}</span><span>· ${esc(cls(kid, a.classId).name)}</span>${pill(a.status)}</div></div><span class="pts">${a.maxPoints} pts</span>${ICON.chev}</button>`;
}
function missingCard(kid) {
  const f = flagged(kid);
  return `<div class="grouplabel${f.length ? " warn" : ""}"><span>Marked missing or incomplete</span><span class="cnt">${f.length}</span></div><div class="card" id="missing">` +
    (f.length ? f.map((a) => dueItem(kid, a)).join("") : '<div class="empty"><b>Nothing marked missing or incomplete.</b><br>Teachers set these in FACTS; this list updates every half hour on school days.</div>') + "</div>";
}
function lunchCard(childId) {
  const kids = childId ? [childId] : D.KIDS.map((k) => k.id);
  const who = childId ? kidName(kidById(childId)) : "";
  let html = `<div class="grouplabel"><span>Lunch${who ? ` · ${esc(who)}` : ""}</span><span class="cnt">ordered in FACTS</span></div><div class="card lunch" id="lunch">`;
  const line = (kid, d) => { const o = D.lunchOrder(kid, d); return o ? { html: `<span class="lo"><span class="ok">✓</span> ${o.map((x) => esc(x.name)).join(" · ")}</span>`, total: o.reduce((a, x) => a + x.price * x.qty, 0) } : { html: '<span class="lo none">Not ordered</span>', total: 0 }; };
  for (const w of D.lunchWeeks()) {
    if (!w.days.length) continue;
    html += `<div class="daybar"><span><b>${esc(w.label)}</b></span></div>`;
    for (const d of w.days) {
      const today = d.date === TODAY ? " today" : "", label = `<span class="ld">${esc(d.date === TODAY ? "Today" : dayMd(d.date))}</span>`;
      if (d.closed) { html += `<div class="lrow${today}">${label}<span class="lo none">No school</span></div>`; continue; }
      const open = (c) => `<a class="lrow go${c}${today}" href="#" data-explain="lunch" aria-label="${esc(d.date === TODAY ? "Today" : dayMd(d.date))}: order or change lunch in FACTS">`;
      if (childId) { const l = line(childId, d.date); html += `${open("")}${label}${l.html}${l.total ? `<span class="lt">${money(l.total)}</span>` : ""}<span class="ext" aria-hidden="true">↗</span></a>`; }
      else html += `${open(" fam")}${label}<span class="lkids">${kids.map((id) => `<span class="lk" style="--c:${kidColor(id)}"><b>${esc(kidName(kidById(id)))}</b>${line(id, d.date).html}</span>`).join("")}</span><span class="ext" aria-hidden="true">↗</span></a>`;
    }
  }
  html += `<details class="lmenu"><summary><span>Menu &amp; prices</span>${ICON.chev}</summary>${D.LUNCH_MENU.map((m) => `<div class="lmi"><span class="n">${esc(m.name)}${m.note ? ` <small>${esc(m.note)}</small>` : ""}</span><span class="p">${money(m.price)}</span></div>`).join("")}</details>`;
  html += `<div class="lgo"><a class="btn wide" href="#" data-explain="lunch">Order lunch in FACTS ↗</a></div>`;
  return html + '<div class="note" style="padding:6px 14px 10px">Ordering, changes and payment are in the FACTS Family Portal (district code HF-MD). New orders show here within half an hour.</div></div>';
}
function athleticsSection(s) {
  if (gradeNum(s.grade) < 6 || !D.TEAMS[s.id]) return "";
  gameDayStyles();
  const list = (D.CLASSES[s.id] || []).filter((c) => c.pattern).map((c) => ({ id: c.id, name: c.name, pattern: c.pattern, period: `Period ${c.pattern}` }));
  return renderAthletics({ teams: D.TEAMS[s.id], events: D.GAMES[s.id], classes: list, periodTimes: D.PERIOD_TIMES, today: TODAY, who: s.first });
}
function rideCard(s) {
  const game = (D.GAMES[s.id] || []).some((g) => g.date === TODAY);
  const changed = s.id === "900102";
  if (!game && !changed) return "";
  let body = (game ? '<div class="ov-row" data-ride="game"><span class="k">Today</span><span class="v">After-school game — see the team\'s dismissal</span></div>' : "") +
    `<div class="ov-row" data-ride="pm"><span class="k">Going home</span><span class="v">${changed ? 'Bus 7 <span class="pill late">Changed today</span>' : "Car pickup"}</span></div>` +
    (changed ? '<div class="ov-row"><span class="k">Usually</span><span class="v">Car pickup</span></div>' : "");
  body += '<div class="note" style="padding:8px 14px">Dismissal list as of 1:45 PM. Need a change? Call the office.</div>';
  return `<div class="grouplabel"><span>Today's ride</span></div><div class="card" id="ride">${body}</div>`;
}
function absItem(g) {
  return `<div class="item abs-item" data-focus="abs:${esc(g.id)}"><div class="txt"><div class="ttl">${esc(g.label)}</div>` +
    `<div class="meta"><span class="due">${esc(`${g.kindLabel}${g.time ? ` · ${clock(g.time)}` : ""} · ${g.reason}`)}</span>${g.pickupBy ? `<span>· picked up by ${esc(g.pickupBy)}</span>` : ""}</div>` +
    (g.note ? `<div class="meta">“${esc(g.note)}”</div>` : "") + '<div class="meta"><span>Reported by you</span> <span class="pill late">Demo · not sent</span></div></div></div>';
}
function absenceCard(s) {
  const A = S.abs;
  let body = "";
  if (A.form && A.form.kid === s.id) body = absForm();
  else {
    if (A.msg) body += `<div class="abs-msg ok" role="status" id="abs-msg">${A.msg}</div>`;
    body += `<div class="abs-actions"><button type="button" class="btn" data-abs="sick">Report ${esc(s.first)} sick</button><button type="button" class="btn alt" data-abs="plan">Plan an absence, late arrival or early pickup</button></div>`;
    const mine = S.reports.filter((r) => r.studentIds.includes(s.id));
    body += mine.length ? mine.map(absItem).join("") : `<div class="empty small">No upcoming reports for ${esc(s.first)}.</div>`;
    body += '<div class="t-note" style="margin:4px 12px 12px"><span class="t-tag">Coming soon</span> Uploading a doctor\'s note with a report is on the way. It isn\'t in the Hub yet.</div>';
  }
  const n = S.reports.filter((r) => r.studentIds.includes(s.id)).length;
  const open = A.open || !!A.form || !!A.msg;
  return `<details class="card absbox" id="abs-box"${open ? " open" : ""}><summary><span class="txt"><span class="ttl">Absent, late or leaving early</span><span class="sub">${n ? `${n} upcoming report${n === 1 ? "" : "s"}` : "Report sick or plan an absence"}</span></span>${ICON.chev}</summary><div id="abs">${body}</div></details>`;
}
function renderOverview() {
  const view = $("#view");
  if (allView()) { renderFamily(); return; }
  const s = me();
  const SECTION = { homework: () => homeworkSoonCard(s.id), missing: () => missingCard(s.id), goodtoknow: () => gtkCard(s.id), lunch: () => lunchCard(s.id),
    athletics: () => athleticsSection(s), ride: () => rideCard(s), absences: () => absenceCard(s) };
  let html = headerCard(s);
  if (S.arranging) html += arrangeCard();
  else for (const id of S.order) { const sec = SECTION[id](); if (sec) html += `<div class="sec" data-focus="sec:${id}">${sec}</div>`; }
  if (!S.arranging) html += '<button type="button" class="arrange-link" data-arrange="open">Arrange this page</button>';
  html += '<div class="note">Grades, homework and attendance are on the tabs below. Questions about a grade go to the teacher; about a day, to the office.</div>';
  view.innerHTML = html;
}
function famRow(s) {
  const bits = [], to = (focus, prep) => goAttr({ tab: "overview", kid: s.id, focus, ...(prep ? { prep } : {}) });
  for (const g of soonGroups(s.id)) if (g.items.length) bits.push(`<button type="button" class="fb"${to("sec:homework")}>${g.items.length} ${esc(g.label.replace(/^Due /, "due ").replace(/\s*\(.*\)$/, ""))}</button>`);
  const f = flagged(s.id).length;
  if (f) bits.push(`<button type="button" class="fb warn"${to("sec:missing")}>${f} missing</button>`);
  const g = (D.GAMES[s.id] || []).find((x) => x.date === TODAY);
  if (g) bits.push(`<button type="button" class="fb game"${to("sec:athletics")}>Game today · out ${esc(clock(g.dismiss))}</button>`);
  if (s.id === "900102") bits.push(`<button type="button" class="fb ride"${to("sec:ride")}>Home: Bus 7</button>`);
  if (S.reports.some((r) => r.studentIds.includes(s.id) && r.days.includes(TODAY) && r.kind === "absent")) bits.push(`<button type="button" class="fb"${to("sec:absences", "absences")}>Reported absent today</button>`);
  return `<div class="famrow" style="--c:${kidColor(s.id)}"><button type="button" class="fn"${to("")} aria-label="${esc(s.first)}: open their Overview"><b>${esc(s.first)}</b><small>Gr ${esc(dispGrade(s.grade))}</small></button><span class="fbits">${bits.join("")}</span><button type="button" class="fgo"${to("")} aria-label="Open ${esc(s.first)}'s Overview">${ICON.chev}</button></div>`;
}
function renderFamily() {
  let html = gtkCard("");
  html += `<div class="grouplabel"><span>Your children</span><span class="cnt">${esc(windowLabel(D.nextSchoolDay(TODAY)))}</span></div><div class="card fam" id="fam">${D.KIDS.map(famRow).join("")}</div>`;
  html += lunchCard("");
  html += '<div class="note">Tap any line to open it — a child\'s name opens their whole Overview.</div>';
  $("#view").innerHTML = html;
}
function arrangeCard() {
  const label = Object.fromEntries(SECTIONS.map((x) => [x.id, x.label]));
  return '<div class="grouplabel"><span>Arrange this page</span></div><div class="card arrange">' + S.order.map((id, i) =>
    `<div class="arow"><span>${esc(label[id])}</span><button type="button" class="abtn" data-move="${id}" data-dir="-1" aria-label="Move ${esc(label[id])} up"${i === 0 ? " disabled" : ""}>↑</button>` +
    `<button type="button" class="abtn" data-move="${id}" data-dir="1" aria-label="Move ${esc(label[id])} down"${i === S.order.length - 1 ? " disabled" : ""}>↓</button></div>`).join("") +
    '<div class="arow foot"><button type="button" class="link2" data-arrange="reset">Back to the usual order</button><button type="button" class="btn" data-arrange="done">Done</button></div>' +
    '<div class="note" style="padding:6px 14px">The same order for every child, on every device you sign in on.</div></div>';
}

/* ───────────── absence form (the real form's fields; ends in "nothing was sent") ───────────── */
const REASONS = ["Illness", "Medical/Dental", "Family", "Bereavement", "College visit", "Other"];   // functions/vendor/absence-tracker/entries.js
const KIND_LABEL = { absent: "Absent", late: "Arriving late", early: "Leaving early" };
const reasonLabel = (r, kind) => (r === "Family" && kind === "absent" ? "Family trip / event (needs approval)" : r);
const FAMILY_GUIDANCE = [   // packages/hub-views/family-request.js FAMILY_GUIDANCE
  "Family trips need approval from the school before the days are excused.",
  "Please send the request at least 10 days before the trip.",
  "The school asks families to keep trip absences to five school days or fewer a year.",
  "Your child is responsible for getting and finishing the classwork they miss.",
];
function absForm() {
  const F = S.abs.form, v = F.values, sick = F.mode === "sick";
  let h = `<div class="abs-form"><h3>${sick ? "Report sick" : "Plan an absence, late arrival or early pickup"}</h3>`;
  if (sick) h += `<p class="abs-for">For <b>${esc(dayMd(TODAY))} (today)</b></p>`;
  if (F.step === "review") return h + absReview() + "</div>";
  h += `<fieldset><legend>Children</legend>${D.KIDS.map((s) => `<label class="chk"><input type="checkbox" name="abs-kid" value="${s.id}"${v.studentIds.includes(s.id) ? " checked" : ""}> ${esc(s.first)} <small class="muted">Gr ${esc(dispGrade(s.grade))}</small></label>`).join("")}</fieldset>`;
  if (!sick) {
    h += `<fieldset><legend>What</legend>${Object.entries(KIND_LABEL).map(([k, l]) => `<label class="chk"><input type="radio" name="abs-kind" value="${k}"${v.kind === k ? " checked" : ""}> ${l}</label>`).join("")}</fieldset>`;
    h += `<div class="abs-grid"><label class="f">${v.kind === "absent" ? "First day" : "Day"}<input type="date" id="abs-start" value="${esc(v.start)}" min="${TODAY}"></label>`;
    h += v.kind === "absent" ? `<label class="f">Last day <span class="muted small">(optional)</span><input type="date" id="abs-end" value="${esc(v.end)}" min="${TODAY}"></label>`
      : `<label class="f">${v.kind === "late" ? "Expected arrival" : "Pickup time"}<input type="time" id="abs-time" value="${esc(v.time)}" min="07:30" max="15:30"></label>`;
    h += "</div>";
    if (v.kind === "early") h += `<label class="f">Who is picking up?<input type="text" id="abs-pickup" maxlength="100" value="${esc(v.pickupBy)}"></label>`;
  }
  h += `<label class="f">Reason<select id="abs-reason">${REASONS.map((r) => `<option value="${r}"${v.reason === r ? " selected" : ""}>${esc(reasonLabel(r, v.kind))}</option>`).join("")}</select></label>`;
  if (v.kind === "absent" && v.reason === "Family") {
    return h + `<div class="abs-family" role="note"><p><b>Family trips need approval.</b> Nothing is recorded here: please send the trip request form instead.</p><ul>${FAMILY_GUIDANCE.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>` +
      '<p class="muted small">If the trip is approved, the school records the days. If it isn’t, please report the absence here so the office knows.</p></div>' +
      '<div class="abs-actions"><a class="btn" href="#" data-explain="trip">Open the trip request form</a><button type="button" class="btn alt" data-abs="close">Back</button></div></div>';
  }
  h += `<label class="f">Note <span class="muted small">(optional)</span><textarea id="abs-note" maxlength="500" rows="2">${esc(v.note)}</textarea></label>`;
  h += '<p class="muted small">Your child’s teachers and the front office will see this.</p>';
  if (F.errors.length) h += `<ul class="abs-errors" role="alert">${F.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`;
  return h + `<div class="abs-actions"><button type="button" class="btn" data-abs="${sick ? "send" : "review"}">${sick ? "Send" : "Review"}</button><button type="button" class="btn alt" data-abs="close">Back</button></div></div>`;
}
/** School days from start..end (weekends + the invented closure skipped). */
function schoolDays(start, end) {
  const out = [];
  for (let d = start; d <= (end || start) && out.length < 30; d = addDays(d, 1)) if (dowOf(d) !== 0 && dowOf(d) !== 6 && !D.CLOSED[d]) out.push(d);
  return out;
}
const daysLabel = (days) => (days.length === 1 ? relDay(days[0]) : `${relDay(days[0])} – ${relDay(days[days.length - 1])} (${days.length} school days)`);
function absReview() {
  const v = S.abs.form.values, days = schoolDays(v.start, v.kind === "absent" ? v.end : v.start);
  return `<div class="ov-row"><span class="k">Who</span><span class="v">${esc(v.studentIds.map((id) => kidName(kidById(id))).join(", "))}</span></div>` +
    `<div class="ov-row"><span class="k">What</span><span class="v">${esc(KIND_LABEL[v.kind])}${v.kind !== "absent" && v.time ? ` · ${esc(clock(v.time))}` : ""} · ${esc(v.reason)}</span></div>` +
    `<div class="ov-row"><span class="k">School day${days.length === 1 ? "" : "s"}</span><span class="v">${esc(daysLabel(days))}</span></div>` +
    '<div class="abs-actions"><button type="button" class="btn" data-abs="submit">Send</button><button type="button" class="btn alt" data-abs="back">Go back</button></div>';
}
function readAbsForm() {
  const F = S.abs.form; if (!F || F.step !== "edit") return;
  const v = F.values, q = (id) => document.getElementById(id);
  v.studentIds = [...document.querySelectorAll('input[name="abs-kid"]:checked')].map((i) => i.value);
  const k = document.querySelector('input[name="abs-kind"]:checked'); if (k) v.kind = k.value;
  for (const [id, key] of [["abs-start", "start"], ["abs-end", "end"], ["abs-time", "time"], ["abs-pickup", "pickupBy"], ["abs-reason", "reason"], ["abs-note", "note"]]) if (q(id)) v[key] = q(id).value;
}
function validate(v) {
  const e = [];
  if (!v.studentIds.length) e.push("Choose at least one child.");
  if (!v.start) e.push("Choose a day.");
  else if (!schoolDays(v.start, v.kind === "absent" ? v.end : v.start).length) e.push("That isn't a school day.");
  if (v.kind !== "absent" && !v.time) e.push(v.kind === "late" ? "Enter the expected arrival time." : "Enter the pickup time.");
  if (v.kind === "early" && !v.pickupBy.trim()) e.push("Say who is picking up.");
  return e;
}
function absSubmit() {
  const v = S.abs.form.values, days = schoolDays(v.start, v.kind === "absent" ? v.end : v.start);
  const names = v.studentIds.map((id) => kidName(kidById(id))).join(", ");
  S.reports.push({ id: `demo-${S.reports.length + 1}`, studentIds: [...v.studentIds], kind: v.kind, kindLabel: KIND_LABEL[v.kind], time: v.kind === "absent" ? "" : v.time,
    pickupBy: v.kind === "early" ? v.pickupBy : "", reason: v.reason, note: v.note, days, label: daysLabel(days) });
  S.abs.msg = `<b>This is a demo — nothing was sent.</b><br>In the real Hub you would now see: “<b>Sent:</b> ${esc(names)}, ${esc(KIND_LABEL[v.kind].toLowerCase())}, ${esc(daysLabel(days))}. ` +
    "The front office and teachers are told automatically, and you’ll get a confirmation email.”";
  S.abs.form = null;
  render();
  const m = document.getElementById("abs-msg"); if (m && !tourRunning()) m.scrollIntoView({ block: "center", behavior: "smooth" });
  explain({ title: "This is a demo — nothing was sent", html: `<p>In the real Parent Hub, this report for <b>${esc(names)}</b> goes to the <b>front desk</b> and ${v.studentIds.length > 1 ? "each child's" : "your child's"} <b>teacher(s)</b>, and is <b>recorded in FACTS</b>. You'd also get a confirmation email.</p>` +
    "<p>In the real Hub you can also change or cancel a report from this same box.</p>" });
}
function openAbsForm(mode) {
  S.abs.msg = null;
  S.abs.form = { mode, kid: S.kid, step: "edit", errors: [], values: { studentIds: [S.kid], kind: "absent", start: TODAY, end: "", time: "", pickupBy: "", reason: "Illness", note: "" } };
  render();
}

/* ───────────── GRADES ───────────── */
function gradedLine(rows) {
  let graded = 0, total = 0, missing = 0;
  for (const a of rows) { total++; if (a.status === "Valid" && a.receivedPoints !== null) graded++; if (a.status === "Missing") missing++; }
  return total ? `${graded} of ${total} graded${missing ? ` · ${missing} missing` : ""}` : "";
}
function assignmentRow(a) {
  const ungraded = a.status === "Valid" && a.receivedPoints === null;
  const tag = a.status !== "Valid" ? pill(a.status) : ungraded ? `<span class="pill up">${a.dateDue >= TODAY ? "Upcoming" : "Not graded yet"}</span>` : "";
  const score = PILL[a.status] ? "" : `<div class="score${ungraded ? " word" : ""}">${esc(ungraded ? `/ ${a.maxPoints}` : `${a.receivedPoints}/${a.maxPoints}`)}</div>`;
  return `<div class="row" data-focus="as:${esc(a.title)}"><div class="txt"><div class="ttl">${esc(a.title)}</div><div class="meta"><span class="due">Due ${esc(dayMd(a.dateDue))}</span></div></div>${score}${tag}</div>`;
}
function renderGrades() {
  const kid = S.kid, k = S.kids[kid];
  let html = "";
  for (const c of D.CLASSES[kid].filter((x) => !x.homeroom)) {
    const g = (D.GRADES[kid] || {})[c.id], open = k.openClass === c.id, list = (D.ASSIGNMENTS[kid] || []).filter((a) => a.classId === c.id);
    const avg = g ? `<div class="avg"><span class="q">Q${D.QUARTER.q}</span><span class="num">${g[0]}</span><span class="letter${/^[DF]/.test(g[1]) ? " lo" : ""}">${esc(g[1])}</span></div>` : `<div class="avg"><span class="q">Q${D.QUARTER.q}</span><span class="none">no average yet</span></div>`;
    html += `<div class="card${open ? " open" : ""}"><button type="button" class="gcard" data-grade="${c.id}" aria-expanded="${open}"><div class="rail" style="background:${c.color}"></div>` +
      `<div class="gname"><div class="n">${esc(c.name)}</div><div class="m">${esc([c.staffName, gradedLine(list)].filter(Boolean).join(" · "))}</div></div>${avg}${ICON.chev}</button>`;
    if (open) html += list.length ? list.map(assignmentRow).join("") : '<div class="row"><div class="txt"><div class="meta">Nothing in the gradebook for this class this quarter.</div></div></div>';
    html += "</div>";
  }
  html += '<div class="note">Averages and scores exactly as FACTS records them. Tap a class for its assignments. "Not graded yet" is usually grading lag, not something your child did wrong.</div>';
  $("#view").innerHTML = html;
}

/* ───────────── HOMEWORK ───────────── */
function hwItem(kid, it) {
  const late = it.dueOn < TODAY, more = it.detail && it.detail.replace(/\s+/g, " ") !== it.title ? it.detail : "", tag = more ? "button" : "div";
  return `<${tag}${more ? ' type="button" data-hwx' : ""} class="item${late ? " late" : ""}">${kchip(kid, it.classId)}<div class="txt"><div class="ttl">${esc(it.title)}</div>` + (more ? `<div class="hw">${esc(more)}</div>` : "") +
    `<div class="meta"><span class="due">${late ? "Was due" : "Due"} ${esc(relDay(it.dueOn))}</span><span>· ${esc(cls(kid, it.classId).name)}</span><span>· ${it.source === "assignment" ? "Gradebook" : "Lesson plan"}</span></div></div>${it.points ? `<span class="pts">${it.points} pts</span>` : ""}</${tag}>`;
}
function renderHomework() {
  const kid = S.kid, k = S.kids[kid], f = (it) => k.hwFilter === "all" || it.classId === k.hwFilter;
  const items = homework(kid).filter(f), fl = flagged(kid).filter(f), has = new Set(homework(kid).map((it) => it.classId));
  let html = `<div class="chips" id="hwchips"><button type="button" class="chip plain${k.hwFilter === "all" ? " on" : ""}" data-chip="all">All</button>` +
    D.CLASSES[kid].filter((c) => !c.homeroom).map((c) => `<button type="button" class="chip${k.hwFilter === c.id ? " on" : ""}" data-chip="${c.id}" style="--c:${c.color}${has.has(c.id) ? "" : ";opacity:.45"}"><span class="dot"></span>${esc(c.short)}</button>`).join("") + "</div>";
  const groups = [];
  if (fl.length) groups.push({ label: "Missing or incomplete", warn: true, html: fl.map((a) => dueItem(kid, a)).join(""), n: fl.length });
  const up = items.filter((it) => it.dueOn >= TODAY), horizon = addDays(TODAY, 7);
  for (const day of [...new Set(up.map((it) => it.dueOn))].filter((d) => d <= horizon)) {
    const g = up.filter((it) => it.dueOn === day);
    groups.push({ label: `Due ${relDay(day)}${day === TODAY || day === addDays(TODAY, 1) ? ` · ${dayMd(day)}` : ""}`, html: g.map((it) => hwItem(kid, it)).join(""), n: g.length });
  }
  const later = up.filter((it) => it.dueOn > horizon);
  if (later.length) groups.push({ label: "Later", html: later.map((it) => hwItem(kid, it)).join(""), n: later.length });
  if (!groups.length) html += '<div class="card"><div class="empty"><b>No homework due in the next 14 days</b><br>and nothing marked missing for this class.</div></div>';
  for (const g of groups) html += `<div class="grouplabel${g.warn ? " warn" : ""}"><span>${esc(g.label)}</span><span class="cnt">${g.n}</span></div><div class="card">${g.html}</div>`;
  html += '<div class="note">Gradebook assignments plus the homework teachers type in FACTS lesson plans. A lesson-plan line without a date is shown as due the next school day. Tap a line to read the whole entry.</div>';
  $("#view").innerHTML = html;
}

/* ───────────── ATTENDANCE ───────────── */
function renderAttendance() {
  const rows = D.ATTENDANCE[S.kid] || [], absent = rows.filter((r) => r.absent).length, tardy = rows.filter((r) => r.tardy).length;
  let html = `<div class="stat" id="attstat"><button type="button"${absent ? ' class="warn"' : ""}><b>${absent}</b>absent</button><button type="button"><b>${tardy}</b>tardy</button><button type="button"><b>${rows.length - absent - tardy}</b>other</button></div>`;
  html += `<div class="card"><div class="daybar"><span><b>Q${D.QUARTER.q}</b> · since ${esc(md(D.QUARTER.start))}</span><span>${rows.length} day${rows.length === 1 ? "" : "s"}</span></div>`;
  for (const r of rows) html += `<div class="item"><div class="txt"><div class="ttl">${esc(r.codeName)}</div><div class="meta"><span class="due">${esc(dayMd(r.date))}</span></div></div><span class="pill ${r.absent ? (r.excused ? "up" : "miss") : "late"}">${esc(r.code)}</span></div>`;
  html += '</div><div class="note">Exactly as recorded in FACTS. Questions about a day go to the office.</div>';
  $("#view").innerHTML = html;
}

/* ───────────── CALENDAR (List / Week / Month, ★ = on the Overview) ───────────── */
const CAL_WHY = { school: "Everyone", grade: "" };
function calRows(from, to) {
  const out = [];
  for (const e of D.EVENTS) {
    const end = e.endDate || e.date;
    for (let d = e.date < from ? from : e.date; d <= end && d <= to; d = addDays(d, 1)) {
      if (e.endDate && (dowOf(d) === 0 || dowOf(d) === 6)) continue;
      out.push({ ...e, day: d, cont: d !== e.date, pick: S.picks[e.key] || "" });
    }
  }
  return out.filter((e) => !S.calMine || onHome(e) || D.CLOSED[e.day] || D.EARLY[e.day]).sort((a, b) => a.day.localeCompare(b.day) || (a.start || "99").localeCompare(b.start || "99"));
}
function calEvRow(e) {
  const kids = e.childIds.map((id) => `<span class="kidtag" style="--c:${kidColor(id)}">${esc(kidName(kidById(id)))}</span>`).join("");
  const why = e.childIds.length && CAL_WHY[e.rule] ? `<span class="calwhy">${esc(CAL_WHY[e.rule])}</span>` : "";
  const on = onHome(e), hid = e.pick === "hide";
  const span = e.endDate && e.endDate > e.day ? `<div class="calspan">${e.cont ? `Began ${esc(dayMd(e.date))} · ` : ""}through ${esc(dayMd(e.endDate))}</div>` : e.cont ? '<div class="calspan">ends today</div>' : "";
  return `<div class="calev${hid ? " hid" : ""}" data-focus="cal:${esc(e.key)}" data-ev="${esc(e.key)}"><div class="when">${e.cont ? "Cont." : e.allDay ? "All day" : esc(clock(e.start))}</div><div class="what"><div class="ttl">${esc(e.title)}</div>${span}` +
    (kids || why || hid ? `<div class="who">${kids}${why}${hid ? '<span class="calwhy">Hidden from Overview</span>' : ""}</div>` : "") + "</div>" +
    `<button type="button" class="calstar${on ? " on" : ""}" data-calpick="${esc(e.key)}" aria-pressed="${on}" aria-label="${on ? "Take off Overview" : "Show on Overview"}: ${esc(e.title)}">${on ? "★" : "☆"}</button></div>`;
}
const calDayTag = (d) => (D.CLOSED[d] ? '<span class="caltag off">No school</span>' : D.EARLY[d] ? '<span class="caltag">Early dismissal</span>' : "");
const calNone = () => `<div class="card"><div class="calnone">${S.calMine ? "Nothing for your children" : "Nothing scheduled"}</div></div>`;
function weekStart(iso) { return addDays(iso, -dowOf(iso)); }
function calNav(label, unit) {
  return `<div class="calnav"><button type="button" class="calnavb" data-calnav="-1" aria-label="Previous ${unit}">‹</button><div class="calnavt" aria-live="polite">${esc(label)}</div>` +
    `<button type="button" class="calnavb" data-calnav="1" aria-label="Next ${unit}">›</button><button type="button" class="calnavb today" data-calnav="0"${S.calAnchor ? "" : " disabled"}>Today</button></div>`;
}
function calWeekHtml() {
  const a = S.calAnchor || TODAY, from = weekStart(a), to = addDays(from, 6), rows = calRows(from, to);
  let html = calNav(`${D.MON[Number(from.slice(5, 7)) - 1]} ${Number(from.slice(8, 10))} – ${D.MON[Number(to.slice(5, 7)) - 1]} ${Number(to.slice(8, 10))}`, "week");
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const evs = rows.filter((e) => e.day === d), rel = relDay(d);
    html += `<div class="calday${d === TODAY ? " now" : ""}"><span>${esc(rel === dayMd(d) ? rel : `${rel} · ${dayMd(d)}`)}</span>${calDayTag(d)}</div>`;
    html += evs.length ? `<div class="card">${evs.map(calEvRow).join("")}</div>` : calNone();
  }
  return html;
}
function calMonthHtml() {
  const a = S.calAnchor || TODAY, first = `${a.slice(0, 7)}-01`, start = weekStart(first);
  const month = a.slice(0, 7), sel = S.calDay && S.calDay.slice(0, 7) === month ? S.calDay : TODAY.slice(0, 7) === month ? TODAY : "";
  const end = addDays(start, 41), rows = calRows(start, end);
  let html = calNav(`${D.MON[Number(a.slice(5, 7)) - 1]} ${a.slice(0, 4)}`, "month") + `<div class="calgrid" role="grid" aria-label="Month"><div class="calrow dow" role="row">` +
    ["S", "M", "T", "W", "T", "F", "S"].map((x, i) => `<span role="columnheader" aria-label="${DOW[i]}">${x}</span>`).join("") + "</div>";
  for (let w = 0; w < 6; w++) {
    const wk = Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i));
    if (w > 3 && wk[0].slice(0, 7) !== month) break;
    html += '<div class="calrow" role="row">';
    for (const d of wk) {
      const evs = rows.filter((e) => e.day === d);
      const c = ["calcell", d.slice(0, 7) === month ? "" : "out", d === TODAY ? "now" : "", d === sel ? "sel" : "", D.CLOSED[d] ? "off" : D.EARLY[d] ? "early" : ""].filter(Boolean).join(" ");
      const kc = (e) => (e.childIds.length ? ` style="--c:${kidColor(e.childIds[0])}"` : "");
      const dots = evs.slice(0, 3).map((e) => `<i class="dot${e.childIds.length ? " kid" : ""}${e.pick === "star" ? " star" : ""}"${kc(e)}></i>`).join("") + (evs.length > 3 ? `<b class="more">+${evs.length - 3}</b>` : "");
      const titles = evs.slice(0, 2).map((e) => `<span class="ct${e.childIds.length ? " kid" : ""}"${kc(e)}>${esc(e.title)}</span>`).join("") + (evs.length > 2 ? `<span class="ct more">+${evs.length - 2} more</span>` : "");
      html += `<button type="button" role="gridcell" class="${c}" data-calday="${d}" aria-label="${esc(`${dayMd(d)}: ${evs.length ? `${evs.length} event${evs.length > 1 ? "s" : ""}` : "nothing scheduled"}`)}" aria-selected="${d === sel}"><span class="n">${Number(d.slice(8))}</span><span class="dots">${dots}</span><span class="cts">${titles}</span></button>`;
    }
    html += "</div>";
  }
  html += "</div>";
  if (!sel) html += '<div class="note">Tap a day to see its events.</div>';
  else { const evs = rows.filter((e) => e.day === sel), rel = relDay(sel); html += `<div class="calday"><span>${esc(rel === dayMd(sel) ? rel : `${rel} · ${dayMd(sel)}`)}</span>${calDayTag(sel)}</div>` + (evs.length ? `<div class="card">${evs.map(calEvRow).join("")}</div>` : calNone()); }
  return html;
}
const calNote = () => '<div class="note">From the school\'s public calendar (titles and times only). A child\'s name means the event names their grade, a class or team, or is for everyone — a guess from the title. ★ = shown on Overview (a week ahead for events you star). Tap a filled ★ to take a guess off. Saved to your account.</div>' +
  '<div class="t-note" id="newsletter-note"><span class="t-tag">Coming soon</span> Items from the <b>HCS Newsletter</b> will be added to this calendar soon.</div>';
function renderCalendar() {
  const view = S.calView, mine = S.calMine;
  let html = `<div class="grouplabel"><span>School Calendar</span>${view === "list" ? '<span class="cnt">next 60 days</span>' : ""}</div>` +
    `<div class="seg seg3 calviews" role="tablist" aria-label="Calendar view">${["list", "week", "month"].map((x) => `<button type="button" role="tab" data-calview="${x}" class="${view === x ? "on" : ""}" aria-selected="${view === x}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("")}</div>` +
    `<div class="seg" role="tablist" id="calmine"><button type="button" role="tab" data-calmine="0" class="${mine ? "" : "on"}" aria-selected="${!mine}">Everything</button><button type="button" role="tab" data-calmine="1" class="${mine ? "on" : ""}" aria-selected="${mine}">For my children</button></div>`;
  if (view === "week") html += calWeekHtml();
  else if (view === "month") html += calMonthHtml();
  else {
    const rows = calRows(TODAY, addDays(TODAY, 60));
    for (const d of [...new Set(rows.map((e) => e.day))]) html += `<div class="calday"><span>${esc(relDay(d))}</span>${calDayTag(d)}</div><div class="card">${rows.filter((e) => e.day === d).map(calEvRow).join("")}</div>`;
  }
  $("#view").innerHTML = html + calNote();
}
function pickFor(key) {
  const e = D.EVENTS.find((x) => x.key === key), cur = S.picks[key] || "";
  const row = { ...e, pick: cur };
  if (onHome(row)) S.picks[key] = e.childIds.length ? "hide" : "";   // a filled ★ hides (a guess) / un-stars
  else S.picks[key] = cur === "hide" ? "" : "star";                  // an empty ★ stars — or un-hides a hidden guess
  if (!S.picks[key]) delete S.picks[key];
}

/* ───────────── clicks ───────────── */
document.addEventListener("click", (e) => {
  const t = e.target;
  const ex = t.closest("[data-explain]");
  if (ex) { e.preventDefault(); explainFor(ex.dataset.explain); return; }
  const talon = t.closest('a[data-gd="talon"]');
  if (talon) { e.preventDefault(); explainFor("talon"); return; }
  const kidB = t.closest("[data-kid]");
  if (kidB) { const all = kidB.dataset.kid === "all"; S.all = all; if (!all) S.kid = kidB.dataset.kid; S.arranging = false; renderKids(); render(); return; }
  const tabB = t.closest("[data-tab]");
  if (tabB) { showTab(tabB.dataset.tab); return; }
  const goB = t.closest("[data-go]");
  if (goB && !t.closest("[data-gkhide]")) { go(JSON.parse(goB.dataset.go)); return; }
  const gh = t.closest("[data-gkhide]");
  if (gh) { S.picks[gh.dataset.gkhide] = "hide"; render(); return; }
  const gr = t.closest("[data-grade]");
  if (gr) { const k = S.kids[S.kid]; k.openClass = k.openClass === gr.dataset.grade ? null : gr.dataset.grade; render(); return; }
  const chip = t.closest("[data-chip]");
  if (chip) { S.kids[S.kid].hwFilter = chip.dataset.chip; render(); return; }
  const hw = t.closest("[data-hwx]");
  if (hw) { hw.classList.toggle("open"); return; }
  const ar = t.closest("[data-arrange]");
  if (ar) { const a = ar.dataset.arrange; if (a === "open") S.arranging = true; else if (a === "done") S.arranging = false; else S.order = SECTIONS.map((s) => s.id); render(); return; }
  const mv = t.closest("[data-move]");
  if (mv) { const i = S.order.indexOf(mv.dataset.move), j = i + Number(mv.dataset.dir); if (j >= 0 && j < S.order.length) { [S.order[i], S.order[j]] = [S.order[j], S.order[i]]; } render(); return; }
  const cm = t.closest("[data-calmine]");
  if (cm) { S.calMine = cm.dataset.calmine === "1"; render(); return; }
  const cvB = t.closest("[data-calview]");
  if (cvB) { S.calView = cvB.dataset.calview; S.calAnchor = ""; S.calDay = ""; render(); return; }
  const nv = t.closest("[data-calnav]");
  if (nv && !nv.disabled) { const dir = Number(nv.dataset.calnav), a = S.calAnchor || TODAY;
    S.calAnchor = !dir ? "" : S.calView === "week" ? addDays(a, 7 * dir) : (() => { const [y, m] = a.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + dir, 1)); return d.toISOString().slice(0, 10); })();
    S.calDay = ""; render(); return; }
  const cd = t.closest("[data-calday]");
  if (cd) { S.calDay = S.calAnchor = cd.dataset.calday; render(); return; }
  const cp = t.closest("[data-calpick]");
  if (cp) { pickFor(cp.dataset.calpick); render(); return; }
  const ab = t.closest("[data-abs]");
  if (ab) {
    const F = S.abs.form;
    switch (ab.dataset.abs) {
      case "sick": case "plan": openAbsForm(ab.dataset.abs); break;
      case "close": S.abs.form = null; render(); break;
      case "send": case "review": readAbsForm(); F.errors = validate(F.values); if (F.errors.length) { render(); break; } if (ab.dataset.abs === "send") absSubmit(); else { F.step = "review"; render(); } break;
      case "submit": absSubmit(); break;
      case "back": F.step = "edit"; render(); break;
    }
  }
});
document.addEventListener("change", (e) => {
  if (S.abs.form && (e.target.name === "abs-kind" || e.target.id === "abs-reason" || e.target.id === "abs-start")) { readAbsForm(); render(); }
});
document.addEventListener("toggle", (e) => {
  if (e.target.id === "hdr") S.hdrOpen = e.target.open;
  else if (e.target.id === "abs-box") S.abs.open = e.target.open;
}, true);

function explainFor(what) {
  if (what === "talon") explain({ title: "This opens the Talon Hub app", html: "<p>Tapping a game or team in the Parent Hub opens <b>Talon Hub</b>, HCS's athletics app, in a new tab: team schedules, rides and results.</p>" +
    "<p>Talon Hub has its own public demo with made-up data.</p>", link: { href: TALON_DEMO, label: "Open the Talon Hub demo ↗" } });
  else if (what === "lunch") explain({ title: "Lunch orders are in FACTS for now", html: "<p>The Lunch card shows this week's and next week's menu and what each child has ordered (✓). To order, change or pay, it <b>currently links to the FACTS Family Portal</b>.</p>" +
    "<p>We're planning to build ordering into the Hub itself.</p>" });
  else if (what === "handbook") explain({ title: "Athletic handbook → Talon Hub", html: "<p>In the real Hub this button opens Talon Hub, where families sign the athletic handbook. Handbook signing is still coming to Talon Hub; until then, the athletic office can help.</p>",
    link: { href: TALON_DEMO, label: "Open the Talon Hub demo ↗" } });
  else if (what === "trip") explain({ title: "The family trip request form", html: "<p>In the real Hub this opens the school's trip request form in a new tab. A family trip is a <b>request</b> that the school approves. Nothing is recorded until it's approved.</p>" });
}

/* ───────────── sign-in (simulated: every path lands on the Example family) ───────────── */
const PANELS = ["signedout", "signup", "reset", "link", "verify", "ready"];
function show(state) {
  for (const p of PANELS) $(`#state-${p}`).hidden = p !== state;
  $("#tabs").hidden = state !== "ready"; $("#topnav").hidden = state !== "ready";
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-mode]");
  if (!b) return;
  const m = b.dataset.mode;
  show(m === "signin" ? "signedout" : m);
});
$("#f-signin").addEventListener("submit", (e) => { e.preventDefault(); signIn(); });
$("#google").addEventListener("click", () => signIn());
$("#yahoo")?.addEventListener("click", () => signIn());
$("#microsoft")?.addEventListener("click", () => signIn());
$("#f-signup").addEventListener("submit", (e) => { e.preventDefault(); $("#verify-email").textContent = $("#su-email").value || D.PARENT.email; show("verify"); });
$("#verify-continue").addEventListener("click", () => signIn());
$("#f-reset").addEventListener("submit", (e) => { e.preventDefault(); const m = $("#reset-msg"); m.hidden = false; m.textContent = `If an account exists for ${$("#rs-email").value}, a reset link is on its way. (Demo: nothing was sent.)`; });
$("#f-link").addEventListener("submit", (e) => {
  e.preventDefault();
  const m = $("#link-msg"); m.hidden = false;
  m.textContent = `Check ${$("#lk-email").value} for a sign-in link and open it on this device. (Demo: nothing was sent.)`;
  $("#link-open").hidden = false;
});
$("#link-open").addEventListener("click", () => signIn());
$("#signout").addEventListener("click", () => { endTour(true); location.href = "index.html"; });

function signIn() {
  endTour(true);
  $("#who").innerHTML = `Signed in as <b>${esc(D.PARENT.email)}</b>`;
  $("#signout").hidden = false;
  $("#freshness").textContent = `Data as of ${freshness()}${D.SHIFTED ? " · the tour shows a sample school day" : ""}`;
  show("ready");
  S.tab = "overview"; S.all = true;
  renderTabs(); renderKids(); render();
  window.scrollTo(0, 0);
  setTimeout(appTour, 250);
}

/* ───────────── the two guided tours ───────────── */
const signinSteps = [
  { sel: "#state-signedout", title: "Welcome to the Parent Hub", html: "<p>This is the real sign-in screen. Sign in with <b>the email address FACTS has for you</b>.</p><p>You have three ways to sign in. The next steps show each one.</p>" },
  { sel: "#google", title: "Recommended: Sign in with Google", html: "<p>Fastest, and nothing to remember: no new password, no email to wait for. Pick the Google account that uses your FACTS email.</p>" },
  { sel: "#linkbtn", title: "Or: email me a sign-in link", html: "<p>No password. Type your email and the Hub sends you a <b>sign-in link</b>. Open it on the same phone or computer and you're in.</p>" },
  { sel: '#state-signedout [data-mode="signup"]', title: "Or: create an account", html: "<p>Set up your own password with your FACTS email. The Hub first emails you a link to <b>confirm the address is yours</b>, and nothing loads until you confirm.</p>" },
  { sel: "#access-note", title: "Who can sign in", html: "<p>Only adults with <b>Family Portal access in FACTS</b> can sign in. Your children appear automatically when the email you sign in with matches the school's records.</p><p>If the Hub says there's no Family Portal access, or no students linked, <b>contact the office</b>.</p>" },
  { sel: "#google", title: "Try it", html: "<p>In this demo, every button signs you in to a made-up family, the <b>Examples</b>, with two children: Wren (grade 4) and Rowan (grade 10).</p>", nextLabel: "Sign in with Google", action: signIn },
];
const appSteps = [
  { sel: "", title: "You're in: the Example family", html: `<p>This is the Parent Hub with made-up data. The tour points out each part of the page.</p><p class="t-try">You can tap anything as you go, and keep exploring after the last step.</p>${D.SHIFTED ? '<p class="muted small">It\'s the weekend, so the tour shows Monday as "today".</p>' : ""}`,
    before: () => { S.all = true; showTab("overview"); } },
  { sel: "#kids", title: "Everyone, or one child", html: "<p><b>Everyone</b> is the busy-morning view of the whole family. Tap a child's name to see only that child.</p><p>Other tabs (Grades, Homework, Attendance) always show one child.</p>",
    before: () => { S.all = true; showTab("overview"); } },
  { sel: "#gtk", title: "Good to Know", html: "<p>What matters <b>today and the next school day</b>: closings, early dismissals, game days, calendar events about your children, and things to fix (like an unsigned athletic handbook).</p><p class=\"t-try\">Every line can be tapped. It opens the place where you can see or fix that item.</p>",
    before: () => { S.all = true; showTab("overview"); } },
  { sel: "#fam", title: "One line per child", html: "<p>Homework due, anything marked missing, a game today, a changed ride. Tap a child's name to open their whole Overview.</p>" },
  { sel: "#hdr", title: "Rowan's Overview and Profile", html: "<p>Tap the name line to open the <b>Profile</b>: homeroom, student ID, school email, teams, <b>sports physical</b> status and expiry, and the <b>athletic handbook</b>.</p><p>If a physical or the handbook is missing, a button shows you how to fix it.</p>",
    before: () => { S.all = false; S.kid = "900101"; S.hdrOpen = true; showTab("overview"); } },
  { sel: "#hw-soon", title: "Homework and missing work", html: "<p>Homework due today and tomorrow comes from the gradebook and the teachers' lesson plans. Right below it is anything a teacher has <b>marked missing or incomplete</b> in FACTS.</p>",
    before: () => { S.hdrOpen = false; render(); } },
  { sel: '[data-focus="sec:athletics"]', title: "Game day!", html: "<p>Rowan plays Varsity Boys Basketball. The game card shows dismissal, when the bus leaves, game time, and <b>which classes Rowan will miss</b>.</p><p class=\"t-try\">Tap \"Open in Talon Hub\" or the team line. It explains where that goes: the <b>Talon Hub</b> app for team schedules, rides and results.</p>" },
  { sel: "#ride", title: "Today's ride", html: "<p>This card appears <b>only when today is different from usual</b>, like a game, a bus change, or a weekly arrangement. On a normal day it stays hidden.</p><p>Need a change? Call the office.</p>" },
  { sel: "#lunch", title: "Lunch", html: "<p>This week's and next week's menu, with what each child ordered (✓).</p><p>For now, ordering <b>links to FACTS</b>. We're planning to build ordering into the Hub itself.</p>" },
  { sel: "#abs-box", title: "New: report sick or plan an absence", html: "<p>Report a child sick in two taps. You can also plan an absence, a late arrival or an early pickup.</p><p>A report goes to the <b>front desk</b> and your child's <b>teacher(s)</b>, and is <b>recorded in FACTS</b>.</p><p class=\"t-try\">Try \"Report Rowan sick\". This demo sends nothing.</p>",
    before: () => { S.abs.open = true; render(); } },
  { sel: ".abs-family", title: "Family trips and doctor's notes", html: "<p>\"Plan an absence\" handles future days, late arrivals and early pickups. A <b>family trip</b> needs school approval: the Hub shows the guidelines and the trip request form instead of recording the days.</p><p>Uploading a <b>doctor's note</b> is coming soon.</p>",
    before: () => { S.abs.open = true; openAbsForm("plan"); S.abs.form.values.reason = "Family"; render(); } },
  { sel: "#tabs, #topnav", title: "The tabs", html: "<p><b>Overview · Grades · Homework · Attendance · Calendar.</b> On a phone they're at the bottom of the screen. On a computer they're at the top.</p>",
    before: () => { S.abs.form = null; S.abs.open = false; render(); } },
  { sel: ".gcard", title: "Grades", html: "<p>One card per class with this quarter's average and letter grade, exactly as FACTS records them.</p><p class=\"t-try\">Tap a class to see every assignment: scores, missing work, and what isn't graded yet.</p>",
    before: () => { S.kids["900101"].openClass = "c-geo"; showTab("grades"); } },
  { sel: "#hwchips", title: "Homework", html: "<p>Gradebook assignments and the homework teachers type into FACTS lesson plans, in one list by due day. Tap a class to filter, or tap a line to read the teacher's whole entry.</p>",
    before: () => showTab("homework") },
  { sel: "#attstat", title: "Attendance", html: "<p>This quarter's absences, tardies and early dismissals, as recorded in FACTS. A day that isn't listed was a normal day.</p>",
    before: () => showTab("attendance") },
  { sel: ".calviews", title: "School Calendar: List, Week, Month", html: "<p>Every school event for the next 60 days. Switch between <b>List</b>, <b>Week</b> and <b>Month</b>. <b>For my children</b> shows only the events that involve your kids.</p>",
    before: () => { S.calView = "list"; showTab("calendar"); } },
  { sel: '[data-ev="ev-photo"] .calstar', title: "★ Star / Unstar", html: "<p><b>Star</b> an event to add it to your Overview (Good to Know). <b>Unstar</b> it to take it off. Events the Hub thinks involve your children start out starred. Tap a filled ★ to remove one.</p><p class=\"t-try\">Tap ☆ on Picture Retake Day. Then open Overview, tap <b>Everyone</b>, and look in Good to Know.</p><p>Items from the <b>HCS Newsletter</b> will be added soon.</p>",
    before: () => { S.calView = "list"; showTab("calendar"); } },
  { sel: ".arrange-link", title: "Make it yours", html: "<p><b>Arrange this page</b> puts the Overview sections in the order you want. It's saved to your account, so it's the same on every device.</p>",
    before: () => { S.all = false; S.kid = "900101"; showTab("overview"); } },
  { sel: ".hdr", title: "On your phone", html: "<ul><li><b>Add it to your home screen</b>: on iPhone, tap Share → \"Add to Home Screen\". On Android, use the ⋮ menu → \"Install app\" or \"Add to Home screen\". It opens like an app.</li><li><b>Dark mode</b> follows your phone's setting.</li><li><b>Private</b>: you see only your own children. Teacher notes, attendance reasons and phone numbers are never shown.</li></ul>",
    before: () => window.scrollTo(0, 0) },
  { sel: ".tourbar", title: "That's the tour", html: "<p>Keep exploring: everything here can be tapped. To see the Student Hub, or to start over, use the links in this bar.</p>" },
];
function appTour() { startTour(appSteps, { onEnd: () => againButton(appTour) }); }

tourBar("parent");
show("signedout");
setTimeout(() => startTour(signinSteps, { onEnd: () => {} }), 300);
