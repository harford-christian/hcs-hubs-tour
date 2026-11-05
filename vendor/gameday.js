/**
 * B8 game-day card — shared by the Student Hub (Today) and the Parent Hub (Overview), and by the b9 demo mode, which
 * feeds it simulated events. PURE: no Firebase, no reads, no DOM access beyond returning an HTML string; styles ship
 * with it (GAMEDAY_CSS, injected once by `gameDayStyles()`), so a host page only needs the Hubs' CSS variables.
 *
 *   renderGameDay(event, classes, periodTimes, { today })  → one card
 *   renderGameDays(events, classes, periodTimes, { today, who }) → the section (label + today's cards + "coming up")
 *
 * `event` = an /athletics doc (or a simulated one of the same shape): { date, teamName, title, location, homeAway,
 * start, allDay, canceled, dismiss, depart }. `dismiss: null` renders "Not posted yet" — never a guess.
 * `classes` = the student's classes this quarter [{ id, name, pattern, period }] (the Today tab's list).
 *
 * STABLE SELECTORS: the b9 demo (`demo.markSimulated`) badges a card by finding the `.card.gd` root and the `.gd-team`
 * span — rename either only together with packages/demo (it falls back to a wrapper, and a test pins both cases).
 */
import { clock12, missedPeriods } from "./helpers.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const addDays = (iso, n) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
const md = (iso) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
/** "Today" / "Tomorrow" / "Wed 11/4". */
export function gameDayLabel(iso, today) {
  if (!iso) return "";
  if (iso === today) return "Today";
  if (today && iso === addDays(today, 1)) return "Tomorrow";
  return `${DOW[new Date(`${iso}T00:00:00Z`).getUTCDay()]} ${md(iso)}`;
}
const hm = (s) => clock12(String(s || "").slice(0, 5));

/** Every game links to the Talon Hub (2026-11-03, "clickable for any athletic events … demo and real"). Talon has no
 *  per-game deep link today (its only params are ?demo / ?tryout / ?evaluator), so this is its home page, in a new tab. */
export const TALON_HUB_URL = "https://hcs-talon-hub.web.app/";
const talonAttrs = `href="${TALON_HUB_URL}" target="_blank" rel="noopener noreferrer" data-gd="talon"`;
const talonLink = `<a class="gd-talon" ${talonAttrs}>Open in Talon Hub <span aria-hidden="true">↗</span></a>`;
const short = (s) => hm(s).replace(/ (AM|PM)$/, "");

export const GAMEDAY_CSS = `
.gd{padding:0;overflow:hidden}
.gd-head{display:flex;align-items:center;gap:8px;padding:.7rem .9rem .2rem}
.gd-when{font-size:.72rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--label,#6b7280)}
.gd-team{font-weight:700;font-size:.98rem;flex:1}
.gd-title{padding:0 .9rem .55rem;font-size:.9rem;color:var(--dd,#1d1d1f)}
.gd-title .gd-loc{display:block;font-size:.8rem;color:var(--dt,#6b7280);margin-top:2px}
.gd-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--line,#ececef)}
.gd-cell{padding:.55rem .9rem;border-right:1px solid var(--line,#ececef);min-width:0}
.gd-cell:last-child{border-right:0}
.gd-k{font-size:.68rem;color:var(--label,#6b7280);text-transform:uppercase;letter-spacing:.04em}
.gd-v{font-weight:700;font-size:1.02rem;margin-top:2px}
.gd-v.gd-np{font-weight:600;font-size:.86rem;color:var(--dt,#6b7280)}
.gd-miss{border-top:1px solid var(--line,#ececef);padding:.55rem .9rem .7rem}
.gd-miss ul{margin:.3rem 0 0;padding:0;list-style:none}
.gd-miss li{display:flex;gap:8px;font-size:.88rem;padding:2px 0}
.gd-miss li .gd-p{flex:none;min-width:5.6em;color:var(--dt,#6b7280)}
.gd-miss li .gd-part{font-size:.75rem;color:var(--late,#b45309)}
.gd-note{font-size:.78rem;color:var(--dt,#6b7280);padding:0 .9rem .7rem}
.gd.gd-off .gd-grid,.gd.gd-off .gd-title{opacity:.55}
.gd-talon{display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;border-top:1px solid var(--line,#ececef);font-weight:700;font-size:.88rem;color:var(--bar-on,#8E1420);text-decoration:none}
.gd-talon:hover,.gd-talon:focus-visible{text-decoration:underline}
.gd-up{display:flex;gap:10px;align-items:baseline;min-height:44px;box-sizing:border-box;padding:.55rem .9rem;border-top:1px solid var(--line,#ececef);font-size:.88rem;color:inherit;text-decoration:none}
a.gd-up:hover .gd-x,a.gd-up:focus-visible .gd-x{text-decoration:underline}
.gd-up .gd-go{flex:none;font-size:.78rem;font-weight:700;color:var(--bar-on,#8E1420)}
.gd-teamline{display:flex;align-items:center;gap:10px;min-height:44px;box-sizing:border-box;padding:.55rem .9rem;color:inherit;text-decoration:none;font-size:.92rem}
.gd-teamline .gd-tn{flex:1;min-width:0;font-weight:700}
.gd-teamline .gd-go{flex:none;font-size:.82rem;font-weight:700;color:var(--bar-on,#8E1420)}
a.gd-teamline:hover .gd-go,a.gd-teamline:focus-visible .gd-go{text-decoration:underline}
.gd-ath .gd-none{border-top:1px solid var(--line,#ececef);padding:.55rem .9rem .65rem}
.gd-up:first-child{border-top:0}
.gd-up .gd-d{flex:none;width:5.4em;font-weight:700}
.gd-up .gd-x{flex:1;min-width:0}
.gd-up .gd-x small{display:block;color:var(--dt,#6b7280)}
@media (max-width:380px){.gd-grid{grid-template-columns:1fr 1fr}.gd-cell:nth-child(2){border-right:0}.gd-cell:nth-child(3){grid-column:1/-1;border-top:1px solid var(--line,#ececef)}}
`;
/** Inject GAMEDAY_CSS once (browser only; a no-op under Node). */
export function gameDayStyles(doc = typeof document !== "undefined" ? document : null) {
  if (!doc || doc.getElementById("gameday-css")) return;
  const el = doc.createElement("style");
  el.id = "gameday-css"; el.textContent = GAMEDAY_CSS;
  doc.head.appendChild(el);
}

function pill(event) {
  if (event.canceled) return '<span class="pill miss">Canceled</span>';
  if (event.homeAway === "home") return '<span class="pill ok">Home</span>';
  if (event.homeAway === "away") return '<span class="pill up">Away</span>';
  return "";
}

/**
 * One game-day card. Missed periods are listed only when a dismissal is posted and the student has a bell schedule
 * (`missedPeriods` in helpers.js): a mid-period dismissal counts that period ("leaves mid-period"); K-6 / no grid →
 * dismissal time only.
 */
export function renderGameDay(event, classes, periodTimes, { today = "" } = {}) {
  if (!event) return "";
  const miss = missedPeriods(event, classes, periodTimes);
  const notPosted = '<div class="gd-v gd-np">Not posted yet</div>';
  const cell = (k, v, attr) => `<div class="gd-cell" data-gd="${attr}"><div class="gd-k">${k}</div>${v}</div>`;
  const game = event.allDay || !event.start ? "All day" : hm(event.start);
  let html = `<div class="card gd${event.canceled ? " gd-off" : ""}" data-gameday="${esc(event.date)}">` +
    `<div class="gd-head"><span class="gd-when">${esc(gameDayLabel(event.date, today))}</span><span class="gd-team">${esc(event.teamName || "Team")}</span>${pill(event)}</div>` +
    `<div class="gd-title">${esc(event.title || "Game")}${event.location ? `<span class="gd-loc">${esc(event.location)}</span>` : ""}</div>`;
  if (event.canceled) {
    html += `<div class="gd-note">This game is marked canceled on the team calendar — normal dismissal.</div>${talonLink}</div>`;
    return html;
  }
  html += '<div class="gd-grid">' +
    cell("Dismissal", event.dismiss ? `<div class="gd-v">${esc(hm(event.dismiss))}</div>` : notPosted, "dismiss") +
    cell("Bus leaves", event.depart ? `<div class="gd-v">${esc(hm(event.depart))}</div>` : notPosted, "depart") +
    cell(event.homeAway === "away" ? "Game time" : "Starts", `<div class="gd-v">${esc(game)}</div>`, "start") + "</div>";
  if (miss.status === "ok") {
    html += `<div class="gd-miss" data-gd="missed"><div class="gd-k">${miss.periods.length ? `Classes missed (${miss.periods.length})` : "Classes missed"}</div>`;
    html += miss.periods.length
      ? `<ul>${miss.periods.map((p) => `<li><span class="gd-p">${esc(p.period || "")}</span><span>${esc(p.name)} <small>${esc(`${short(p.begin)}–${short(p.end)}`)}</small>${p.partial ? ' <span class="gd-part">leaves mid-period</span>' : ""}</span></li>`).join("")}</ul>`
      : '<div class="gd-note" style="padding:.2rem 0 0">None — dismissal is after the last class.</div>';
    html += "</div>";
  } else if (miss.status === "noGrid") {
    html += '<div class="gd-note" data-gd="missed">Leave at the dismissal time — class periods aren’t listed for this schedule.</div>';
  } else if (miss.status === "notPosted") {
    html += '<div class="gd-note" data-gd="missed">The coach hasn’t posted a dismissal time on the team calendar yet. Until then, assume a normal day.</div>';
  }
  html += `<div class="gd-note">From the team calendar — the coach’s word is final.</div>${talonLink}</div>`;
  return html;
}

/** "JV Boys Soccer — vs Calvary", or just the title when the coach already put the team in it. */
const upTitle = (e) => { const t = e.title || "Game", n = e.teamName || ""; return n && !t.toLowerCase().includes(n.toLowerCase()) ? `${n} — ${t}` : t; };

/** One compact "coming up" row — the whole row is the Talon Hub link. Times only when the coach posted them. */
function upRow(e, today, withTeam = true) {
  const what = e.canceled ? "Canceled" : e.dismiss ? `Dismissal ${hm(e.dismiss)}${e.depart ? ` · bus ${hm(e.depart)}` : ""}` : "Dismissal not posted yet";
  return `<a class="gd-up" ${talonAttrs} aria-label="${esc(`${gameDayLabel(e.date, today)}: ${upTitle(e)} — open in Talon Hub`)}"><span class="gd-d">${esc(gameDayLabel(e.date, today))}</span><span class="gd-x">${esc(withTeam ? upTitle(e) : e.title || "Game")}<small>${esc(what)}</small></span>${pill(e)}<span class="gd-go" aria-hidden="true">Talon ↗</span></a>`;
}

/**
 * The section for a Hub page: today's games as full cards; later games (≤ `upcoming`) as compact rows. Returns ""
 * when there is nothing — a student on no team sees no section at all.
 */
export function renderGameDays(events, classes, periodTimes, { today = "", who = "", upcoming = 3 } = {}) {
  const list = (events || []).filter((e) => e && (!today || e.date >= today));
  if (!list.length) return "";
  const now = list.filter((e) => e.date === today);
  const later = list.filter((e) => e.date !== today).slice(0, upcoming);
  let html = `<div class="grouplabel"><span>${esc(now.length ? "Game day" : "Games coming up")}${who ? ` · ${esc(who)}` : ""}</span><span class="cnt">${list.length}</span></div>`;
  html += now.map((e) => renderGameDay(e, classes, periodTimes, { today })).join("");
  if (later.length) {
    html += `${now.length ? '<div class="grouplabel"><span>Coming up</span></div>' : ""}<div class="card gd" data-gameday-upcoming="${later.length}">` +
      later.map((e) => upRow(e, today)).join("") + "</div>";
  }
  return html;
}

/**
 * B8b — the Hubs' ATHLETICS section (2026-11-03: "calendar info or the link to Talon Hub" must show even with no game
 * posted). Always rendered for a student on a team, even with zero games:
 *   label "Athletics · <who>"  →  today's games as full cards  →  ONE compact card: the team line
 *   ("<team names> · Open Talon Hub ↗", the whole line is the link) + the coming games as rows, or "no games in the next
 *   2 weeks" when the calendar has none. `teams` = teamsForStudent(...); `events` = getAthleticsForStudent(...).
 * Returns "" only for a student on no team with no games (the section is absent, as before).
 */
export function renderAthletics({ teams = [], events = [], classes = [], periodTimes = null, today = "", who = "", upcoming = 4, days = 14 } = {}) {
  const list = (events || []).filter((e) => e && (!today || e.date >= today));
  if (!(teams || []).length && !list.length) return "";
  const now = list.filter((e) => e.date === today);
  const later = list.filter((e) => e.date !== today).slice(0, upcoming);
  const names = (teams || []).map((t) => t.name).filter(Boolean);
  let html = `<div class="grouplabel"><span>Athletics${who ? ` · ${esc(who)}` : ""}</span>${list.length ? `<span class="cnt">${list.length}</span>` : ""}</div>`;
  html += now.map((e) => renderGameDay(e, classes, periodTimes, { today })).join("");
  html += `<div class="card gd gd-ath" data-athletics="${names.length}">` +
    `<a class="gd-teamline" ${talonAttrs} aria-label="${esc(`${names.join(", ") || "Your team"} — open Talon Hub`)}"><span class="gd-tn">${esc(names.join(" · ") || "Your team")}</span><span class="gd-go" aria-hidden="true">Open Talon Hub ↗</span></a>`;
  // one team: the team line already names it, so the rows show just the coach's title
  if (later.length) html += later.map((e) => upRow(e, today, names.length !== 1)).join("");
  else if (!now.length) html += `<div class="gd-note gd-none" data-athletics="none">No games on the team calendar in the next ${days === 14 ? "2 weeks" : `${days} days`}. Practices aren’t listed.</div>`;
  return html + "</div>";
}

