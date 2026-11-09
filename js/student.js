/**
 * Student Hub tour — a static copy of apps/portal/public/app.js's screens (Today · Grades · Homework · Attendance), same
 * markup + classes so the real stylesheet renders them, with the invented student in demo-data.js (Rowan Example). No
 * Firebase, no network. Things the Student Hub does NOT have (calendar, lunch, absence reporting) are named as Parent-only.
 */
import { $, esc, tourBar, startTour, endTour, tourRunning, againButton, explain, STUDENT_HUB } from "./tour.js";
import * as D from "./demo-data.js";
import { renderAthletics, gameDayStyles } from "../vendor/gameday.js";

const { TODAY, addDays, dowOf, md, dayMd, relDay, DOW, DOWL, MON } = D;
const TALON_DEMO = "https://talon-hub.harfordchristian.org/?demo=1";
const ME = D.KIDS.find((k) => k.id === "900101");
const CLASSES = D.CLASSES[ME.id];

const ICON = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  grades: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6"/></svg>',
  homework: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  attendance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  chev: '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
};
const TABS = [{ id: "today", label: "Today" }, { id: "grades", label: "Grades" }, { id: "homework", label: "Homework" }, { id: "attendance", label: "Attendance" }];
const S = { tab: "today", hdrOpen: false, openClass: null, hwFilter: "all" };

const cls = (cid) => CLASSES.find((c) => c.id === cid) || { name: "Class", short: "?", color: "#6b7280" };
const kchip = (cid) => { const c = cls(cid); return `<span class="kchip" style="--c:${esc(c.color)}">${esc(c.short)}</span>`; };
const clock = (hhmm) => { let [h, m] = hhmm.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}:${String(m).padStart(2, "0")} ${ap}`; };
const short = (hhmm) => clock(hhmm).replace(/ (AM|PM)$/, "");
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const PILL = { Missing: "miss", Incomplete: "late" };
const pill = (w) => (w && PILL[w] ? `<span class="pill ${PILL[w]}">${esc(w)}</span>` : "");
const longDate = (iso) => `${DOWL[dowOf(iso)]}, ${MON[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
/** The clock the tour uses: the real one during a school day, otherwise 10:15 AM (so NOW / Next always show something). */
function nowMin() { const n = new Date(), m = n.getHours() * 60 + n.getMinutes(); return !D.SHIFTED && m >= 470 && m <= 895 ? m : 615; }

/* ───────────── shell ───────────── */
function renderTabs() {
  $("#tabs").innerHTML = TABS.map((t) => `<button type="button" class="tab${S.tab === t.id ? " on" : ""}" data-tab="${t.id}" role="tab" aria-selected="${S.tab === t.id}"><span class="ic">${ICON[t.id]}</span>${t.label}</button>`).join("");
  $("#topnav").innerHTML = TABS.map((t) => `<button type="button" class="${S.tab === t.id ? "on" : ""}" data-tab="${t.id}">${t.label}</button>`).join("");
}
function showTab(id) { S.tab = id; renderTabs(); if (!tourRunning()) window.scrollTo(0, 0); render(); }
const RENDER = { today: renderToday, grades: renderGrades, homework: renderHomework, attendance: renderAttendance };
function render() { RENDER[S.tab](); }

/* ───────────── homework (gradebook + lesson plans) ───────────── */
function homework() {
  const gb = D.ASSIGNMENTS[ME.id].filter((a) => a.status === "Valid" && a.receivedPoints === null).map((a) => ({ classId: a.classId, title: a.title, dueOn: a.dateDue, points: a.maxPoints, source: "assignment", detail: "" }));
  return [...gb, ...D.LESSON_HW[ME.id]].sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.title.localeCompare(b.title));
}
const flagged = () => D.ASSIGNMENTS[ME.id].filter((a) => a.status === "Missing" || a.status === "Incomplete");
function dueItem(a) {
  const late = a.dateDue < TODAY;
  return `<button type="button" class="item go${late ? " late" : ""}" data-opengrade="${a.classId}">${kchip(a.classId)}<div class="txt"><div class="ttl">${esc(a.title)}</div>` +
    `<div class="meta"><span class="due">${late ? "Was due " : "Due "}${esc(relDay(a.dateDue))}</span><span>· ${esc(cls(a.classId).name)}</span>${pill(a.status)}</div></div><span class="pts">${a.maxPoints} pts</span></button>`;
}

/* ───────────── TODAY ───────────── */
function renderToday() {
  const m = nowMin();
  const rows = CLASSES.map((c) => {
    if (!c.pattern) return { c, state: "homeroom" };
    const [b, e] = D.bellOf(c.pattern);
    return { c, state: "today", begin: b, end: e, current: toMin(b) <= m && m < toMin(e) };
  }).sort((x, y) => (x.begin || "00").localeCompare(y.begin || "00"));
  const now = rows.find((r) => r.current), next = rows.find((r) => r.begin && toMin(r.begin) > m);
  if (next) next.next = true;
  const strip = now ? { big: `Now: ${now.c.name}`, small: `Period ${now.c.pattern} · until ${short(now.end)}${next ? ` · then ${next.c.name} at ${short(next.begin)}` : ""}` }
    : next ? { big: `Next: ${next.c.name}`, small: `Period ${next.c.pattern} · starts ${short(next.begin)}` } : { big: longDate(TODAY), small: `Q${D.QUARTER.q} · ends ${md(D.QUARTER.end)}` };
  const line = `Grade 10 · Q${D.QUARTER.q} ends ${md(D.QUARTER.end)}`;
  let html = `<details class="card hdr" id="hdr"${S.hdrOpen ? " open" : ""}><summary><span class="hi">Hi, ${esc(ME.first)}</span><span class="sub">${esc(line)}</span>${ICON.chev}</summary>` +
    `<div class="ov-row"><span class="k">Homeroom</span><span class="v">${esc(ME.homeroom)}</span></div><div class="ov-row"><span class="k">Quarter</span><span class="v">Q${D.QUARTER.q} · ends ${esc(md(D.QUARTER.end))}</span></div>` +
    `<div class="ov-row"><span class="k">Data as of</span><span class="v">${esc(freshness())}</span></div></details>` +
    `<div class="card strip-card" id="strip"><div class="today-strip"><div><div class="cls">${esc(strip.big)}</div><div class="t">${esc(strip.small)}</div></div></div></div>`;
  // homework, next 24 hours + missing
  const nextDay = D.nextSchoolDay(TODAY), hw = homework();
  const groups = [{ label: "Due today", day: TODAY }, { label: `Due ${nextDay === addDays(TODAY, 1) ? "tomorrow" : DOW[dowOf(nextDay)]} (${dayMd(nextDay)})`, day: nextDay }].map((g) => ({ ...g, items: hw.filter((it) => it.dueOn === g.day) }));
  const n = groups.reduce((a, g) => a + g.items.length, 0);
  html += `<div class="grouplabel"><span>Homework</span><span class="cnt">${n}</span></div><div class="card" id="hw-soon">`;
  for (const g of groups) if (g.items.length) html += `<div class="daybar"><span><b>${esc(g.label)}</b></span></div>` + g.items.map((it) => `<div class="item soon">${kchip(it.classId)}<div class="txt"><div class="ttl">${esc(it.title)}</div><div class="meta"><span>${esc(cls(it.classId).name)}</span></div></div></div>`).join("");
  html += `<button type="button" class="mrow" data-tab="homework"><span>All homework</span>${ICON.chev}</button></div>`;
  const f = flagged();
  html += `<div class="grouplabel${f.length ? " warn" : ""}"><span>Marked missing or incomplete</span><span class="cnt">${f.length}</span></div><div class="card" id="missing">${f.map(dueItem).join("")}</div>`;
  // athletics (the shared game-day card, packages/facts-client/gameday.js)
  gameDayStyles();
  const list = CLASSES.filter((c) => c.pattern).map((c) => ({ id: c.id, name: c.name, pattern: c.pattern, period: `Period ${c.pattern}` }));
  html += `<div class="sec" id="athletics">${renderAthletics({ teams: D.TEAMS[ME.id], events: D.GAMES[ME.id], classes: list, periodTimes: D.PERIOD_TIMES, today: TODAY })}</div>`;
  // today's classes
  html += `<div class="grouplabel"><span>Today's classes</span><span class="cnt">${rows.filter((r) => r.state === "today").length}</span></div><div class="card" id="today-list" data-mode="timed">`;
  html += rows.map((r) => {
    const when = r.state === "today" ? `${short(r.begin)}–${short(r.end)}` : "no set time";
    const head = [r.c.pattern ? `Period ${r.c.pattern}` : "", when].filter(Boolean).join(" · ");
    const sub = [/^\d/.test(r.c.room) ? `Room ${r.c.room}` : r.c.room, r.c.staffName].filter(Boolean).join(" · ");
    const tag = r.current ? '<span class="pill now">NOW</span>' : r.next ? '<span class="pill up">Next</span>' : "";
    return `<div class="cls-row${r.current ? " is-now" : ""}" data-cls="${r.c.id}"><span class="dot" style="background:${esc(r.c.color)}"></span><div class="nm"><div class="t when">${esc(head)}</div>${esc(r.c.name)}<div class="t">${esc(sub)}</div></div>${tag}</div>`;
  }).join("") + "</div>";
  html += `<div class="note">Bell times from FACTS (${esc(D.PERIOD_TIMES.templateName)}), Eastern time. Holidays and special schedules are not shown.</div>`;
  $("#view").innerHTML = html;
}
const freshness = () => `${MON[Number(TODAY.slice(5, 7)) - 1]} ${Number(TODAY.slice(8, 10))}, 7:30 AM`;

/* ───────────── GRADES ───────────── */
function gradedLine(rows) {
  let graded = 0, missing = 0;
  for (const a of rows) { if (a.status === "Valid" && a.receivedPoints !== null) graded++; if (a.status === "Missing") missing++; }
  return rows.length ? `${graded} of ${rows.length} graded${missing ? ` · ${missing} missing` : ""}` : "";
}
function renderGrades() {
  let html = "";
  for (const c of CLASSES.filter((x) => !x.homeroom)) {
    const g = D.GRADES[ME.id][c.id], open = S.openClass === c.id, list = D.ASSIGNMENTS[ME.id].filter((a) => a.classId === c.id);
    html += `<div class="card${open ? " open" : ""}"><button type="button" class="gcard" data-grade="${c.id}" aria-expanded="${open}"><div class="rail" style="background:${c.color}"></div>` +
      `<div class="gname"><div class="n">${esc(c.name)}</div><div class="m">${esc([c.staffName, gradedLine(list)].filter(Boolean).join(" · "))}</div></div>` +
      `<div class="avg"><span class="q">Q${D.QUARTER.q}</span><span class="num">${g[0]}</span><span class="letter${/^[DF]/.test(g[1]) ? " lo" : ""}">${esc(g[1])}</span></div>${ICON.chev}</button>`;
    if (open) html += list.map((a) => {
      const ungraded = a.status === "Valid" && a.receivedPoints === null;
      const tag = a.status !== "Valid" ? pill(a.status) : ungraded ? `<span class="pill up">${a.dateDue >= TODAY ? "Upcoming" : "Not graded"}</span>` : "";
      const score = PILL[a.status] ? "" : `<div class="score${ungraded ? " word" : ""}">${esc(ungraded ? `/ ${a.maxPoints}` : `${a.receivedPoints}/${a.maxPoints}`)}</div>`;
      return `<button type="button" class="row"${popAttr({ c: a.classId, t: a.title, d: a.dateDue })}><div class="txt"><div class="ttl">${esc(a.title)}</div><div class="meta"><span class="due">Due ${esc(dayMd(a.dateDue))}</span></div></div>${score}${tag}</button>`;
    }).join("");
    html += "</div>";
  }
  html += '<div class="note">Averages and scores exactly as FACTS records them. Tap a class for its assignments.</div>';
  $("#view").innerHTML = html;
}

/* ───────────── HOMEWORK ───────────── */
function renderHomework() {
  const f = (it) => S.hwFilter === "all" || it.classId === S.hwFilter, items = homework().filter(f), fl = flagged().filter(f);
  let html = `<div class="chips" id="hwchips"><button type="button" class="chip plain${S.hwFilter === "all" ? " on" : ""}" data-chip="all">All</button>` +
    CLASSES.filter((c) => !c.homeroom).map((c) => `<button type="button" class="chip${S.hwFilter === c.id ? " on" : ""}" data-chip="${c.id}" style="--c:${c.color}"><span class="dot"></span>${esc(c.short)}</button>`).join("") + "</div>";
  if (fl.length) html += `<div class="grouplabel warn"><span>Missing or incomplete</span><span class="cnt">${fl.length}</span></div><div class="card">${fl.map(dueItem).join("")}</div>`;
  for (const day of [...new Set(items.map((it) => it.dueOn))]) {
    const g = items.filter((it) => it.dueOn === day);
    html += `<div class="grouplabel"><span>Due ${esc(relDay(day))}${day === TODAY || day === addDays(TODAY, 1) ? ` · ${esc(dayMd(day))}` : ""}</span><span class="cnt">${g.length}</span></div><div class="card">` + g.map((it) => {
      const more = it.detail && it.detail.replace(/\s+/g, " ") !== it.title ? it.detail : "", tag = "button";
      return `<${tag} type="button"${popAttr({ c: it.classId, t: it.title, d: it.dueOn, x: more })} class="item">${kchip(it.classId)}<div class="txt"><div class="ttl">${esc(it.title)}</div>${more ? `<div class="hw">${esc(more)}</div>` : ""}<div class="meta"><span class="due">Due ${esc(relDay(it.dueOn))}</span><span>· ${esc(cls(it.classId).name)}</span><span>· ${it.source === "assignment" ? "Gradebook" : "Lesson plan"}</span></div></div>${it.points ? `<span class="pts">${it.points} pts</span>` : ""}</${tag}>`;
    }).join("") + "</div>";
  }
  html += '<div class="note">Gradebook assignments plus the homework teachers type in FACTS lesson plans. Tap a line to read the whole entry.</div>';
  $("#view").innerHTML = html;
}

/* ───────────── ATTENDANCE ───────────── */
function renderAttendance() {
  const rows = D.ATTENDANCE[ME.id], absent = rows.filter((r) => r.absent).length, tardy = rows.filter((r) => r.tardy).length;
  let html = `<div class="stat" id="attstat"><button type="button"><b>${absent}</b>absent</button><button type="button"><b>${tardy}</b>tardy</button><button type="button"><b>${rows.length - absent - tardy}</b>other</button></div>`;
  html += `<div class="card"><div class="daybar"><span><b>Q${D.QUARTER.q}</b> · since ${esc(md(D.QUARTER.start))}</span><span>${rows.length} day${rows.length === 1 ? "" : "s"}</span></div>` +
    rows.map((r) => `<div class="item"><div class="txt"><div class="ttl">${esc(r.codeName)}</div><div class="meta"><span class="due">${esc(dayMd(r.date))}</span></div></div><span class="pill late">${esc(r.code)}</span></div>`).join("") + "</div>";
  html += '<div class="note">Exactly as recorded in FACTS. Questions about a day go to the office.</div>';
  $("#view").innerHTML = html;
}

/* ───────────── assignment popup (same as the real Hub: tap a line → "Email <teacher> about this") ───────────── */
const popAttr = (p) => ` data-pop="${esc(JSON.stringify(p))}"`;
function openPop(el) {
  if (!el) return;
  const old = $("#tpop"); if (old) old.remove();
  const p = JSON.parse(el.dataset.pop), c = cls(p.c);
  el.insertAdjacentHTML("afterend", `<div class="tpop" id="tpop"><div class="pop-t">${esc(p.t)}</div>` +
    `<div class="meta"><span class="due">${p.d < TODAY ? "Was due" : "Due"} ${esc(relDay(p.d))}</span><span>· ${esc(c.name)}</span></div>` +
    (p.x ? `<div class="hw full">${esc(p.x)}</div>` : "") +
    `<button type="button" class="btn wide" data-mailx="${esc(c.staffName)}">✉ Email ${esc(c.staffName)} about this</button>` +
    `<button type="button" class="btn alt wide" data-popclose>Close</button></div>`);
}

/* ───────────── clicks ───────────── */
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest('a[data-gd="talon"]')) {
    e.preventDefault();
    explain({ title: "This opens the Talon Hub app", html: "<p>Tapping a game or your team opens <b>Talon Hub</b>, HCS's athletics app, in a new tab: team schedules, rides and results.</p><p>Talon Hub has its own public demo with made-up data.</p>",
      link: { href: TALON_DEMO, label: "Open the Talon Hub demo ↗" } });
    return;
  }
  const mx = t.closest("[data-mailx]");
  if (mx) {
    explain({ title: "Email your teacher", html: `<p>In your real Student Hub this opens a new email to <b>${esc(mx.dataset.mailx)}</b> with the assignment already in the subject line. Just type your question.</p><p>Nothing is sent in this demo.</p>` });
    return;
  }
  if (t.closest("[data-popclose]")) { const pp = $("#tpop"); if (pp) pp.remove(); return; }
  const po = t.closest("[data-pop]");
  if (po) { openPop(po); return; }
  const tb = t.closest("[data-tab]");
  if (tb) { showTab(tb.dataset.tab); return; }
  const og = t.closest("[data-opengrade]");
  if (og) { S.openClass = og.dataset.opengrade; showTab("grades"); return; }
  const gr = t.closest("[data-grade]");
  if (gr) { S.openClass = S.openClass === gr.dataset.grade ? null : gr.dataset.grade; render(); return; }
  const ch = t.closest("[data-chip]");
  if (ch) { S.hwFilter = ch.dataset.chip; render(); return; }
  const hw = t.closest("[data-hwx]");
  if (hw) hw.classList.toggle("open");
});
document.addEventListener("toggle", (e) => { if (e.target.id === "hdr") S.hdrOpen = e.target.open; }, true);

/* ───────────── sign-in (simulated) ───────────── */
function show(state) {
  $("#state-signedout").hidden = state !== "signedout"; $("#state-ready").hidden = state !== "ready";
  $("#tabs").hidden = state !== "ready"; $("#topnav").hidden = state !== "ready";
}
function signIn() {
  endTour(true);
  $("#who").innerHTML = `Signed in as <b>${esc(ME.email)}</b>`;
  $("#signout").hidden = false;
  $("#freshness").textContent = `Data as of ${freshness()}${D.SHIFTED ? " · the tour shows a sample school day" : ""}`;
  show("ready"); S.tab = "today"; renderTabs(); render(); window.scrollTo(0, 0);
  setTimeout(appTour, 250);
}
$("#signin").addEventListener("click", signIn);
$("#signout").addEventListener("click", () => { location.href = "index.html"; });

const signinSteps = [
  { sel: "#state-signedout", title: "Welcome to the Student Hub", html: "<p>Your schedule, grades, homework and attendance in one place.</p>" },
  { sel: "#signin", title: "Sign in with your school Google account", html: "<p>Use your <b>@harfordchristian.org</b> account. Students sign in with Google only. You don't need a separate password.</p><p>A personal Gmail or a parent's account won't work: the Hub says \"The Student Hub is for students\" and shows nothing. (Parents use the separate <b>Parent Hub</b>.)</p>" },
  { sel: "#phone-note", title: "On a phone", html: "<p>If Google opens your personal account, choose your <b>school</b> account in the Google window.</p>" },
  { sel: "#signin", title: "Try it", html: "<p>In this demo the button signs you in as a made-up student, <b>Rowan Example</b>, in grade 10.</p>", nextLabel: "Sign in with Google", action: signIn },
];
const tabBtn = (id) => `#tabs [data-tab="${id}"], #topnav [data-tab="${id}"]`;
const appSteps = [
  { sel: tabBtn("today"), title: "Today", html: "<p>Your Student Hub opens on <b>Today</b>. Tap it any time to come back here.</p>", before: () => { showTab("today"); window.scrollTo(0, 0); } },
  { sel: "#strip, #hw-soon, #athletics", all: true, title: "Your day at a glance", html: "<p><b>Today</b> shows the class you're in now, homework due in the next 24 hours, and today's key events, like a game.</p>", before: () => showTab("today") },
  { sel: tabBtn("grades"), title: "Grades", html: "<p>Next, tap <b>Grades</b>.</p>", before: () => showTab("today") },
  { sel: "#view .card", all: true, title: "Every class", html: "<p>Your current average and letter grade in every class.</p>", before: () => { S.openClass = null; showTab("grades"); window.scrollTo(0, 0); } },
  { sel: "#view :has(+ #tpop), #tpop", all: true, title: "Email your teacher", html: "<p>Tap a class to see each assignment. Tap an assignment to <b>email your teacher</b> about it.</p>",
    before: () => { S.openClass = "c-eng10"; showTab("grades"); openPop(document.querySelector("#view .card.open button.row[data-pop]")); } },
  { sel: tabBtn("homework"), title: "Homework", html: "<p>Now tap <b>Homework</b>.</p>", before: () => { S.openClass = null; showTab("grades"); } },
  { sel: "#hwchips, #view .grouplabel.warn, #view .grouplabel.warn + .card", all: true, title: "Everything that's due", html: "<p>Missing work is at the top, then everything due by day. Tap a class to filter.</p>", before: () => { S.hwFilter = "all"; showTab("homework"); window.scrollTo(0, 0); } },
  { sel: "#view :has(+ #tpop), #tpop", all: true, title: "Read it, or ask about it", html: "<p>Tap any line for your teacher's full note, or to <b>email your teacher</b> about it.</p>",
    before: () => { showTab("homework"); openPop([...document.querySelectorAll("#view button.item[data-pop]")].find((b) => JSON.parse(b.dataset.pop).x)); } },
  { sel: "#attstat", title: "Attendance", html: `<p><b>Attendance</b> shows this quarter's absences and tardies. That's the tour!</p><p><a class="t-btn t-real" href="${STUDENT_HUB}">Open my Student Hub</a></p><p class="muted small">Or keep exploring this demo.</p>`, before: () => { showTab("attendance"); window.scrollTo(0, 0); } },
];
function appTour() { startTour(appSteps, { onEnd: () => againButton(appTour) }); }

tourBar("student");
show("signedout");
setTimeout(() => startTour(signinSteps, { intro: true }), 300);
