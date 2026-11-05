/**
 * HCS Hubs tour — the coach-mark engine + the tour bar + explainer sheets. No network, no storage beyond this tab.
 *
 *   tourBar(role)                       the always-visible "Demo tour · switch / start over" strip inside the Hub header
 *   startTour(steps, { onEnd })         step = { sel, title, html, before?(), nextLabel?, action?() } — sel is a CSS selector (re-resolved on every
 *                                       repaint, because the Hub screens repaint their view on every tap) or "" for a
 *                                       centred card with no spotlight
 *   explain({ title, html, link })      a bottom sheet used wherever the real Hub would leave the page (FACTS, Talon Hub, forms)
 *
 * Keyboard: → / Enter = Next, ← = Back, Esc = Skip. Focus moves into the card on every step.
 */
export const $ = (s, r = document) => r.querySelector(s);
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** The strip at the top of the sticky header — so "back to the start" is on every screen. */
export function tourBar(role) {
  const other = role === "parent" ? { href: "student.html", label: "Switch to Student" } : { href: "parent.html", label: "Switch to Parent" };
  const bar = document.createElement("div");
  bar.className = "tourbar";
  bar.innerHTML = `<div class="tin"><span class="tl"><b>Demo tour</b> · made-up family, nothing is sent</span>` +
    `<a href="${other.href}">${other.label}</a><a href="index.html">Start over</a></div>`;
  const hdr = $(".hdr");
  hdr.insertBefore(bar, hdr.firstChild);
}

let T = null;   // the running tour

export function startTour(steps, { onEnd } = {}) {
  endTour(true);
  const spot = document.createElement("div"); spot.className = "t-spot"; spot.setAttribute("aria-hidden", "true");
  const card = document.createElement("div"); card.className = "t-card at-bottom"; card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "false"); card.setAttribute("aria-labelledby", "t-title");
  document.body.append(spot, card);
  const again = document.querySelector(".t-again"); if (again) again.remove();
  T = { steps, i: 0, spot, card, onEnd, raf: 0 };
  const follow = () => { if (T) { cancelAnimationFrame(T.raf); T.raf = requestAnimationFrame(place); } };
  T.mo = new MutationObserver(follow);
  T.mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "hidden", "class"] });
  T.follow = follow;
  window.addEventListener("scroll", follow, { passive: true });
  window.addEventListener("resize", follow);
  document.addEventListener("keydown", onKey);
  card.addEventListener("click", onCardClick);
  go(0);
}

function onKey(e) {
  if (!T || document.querySelector(".t-sheet-bg")) return;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || "");
  if (e.key === "Escape") { e.preventDefault(); endTour(); }
  else if (!typing && e.key === "ArrowRight") { e.preventDefault(); next(); }
  else if (!typing && e.key === "ArrowLeft") { e.preventDefault(); go(T.i - 1); }
}
function onCardClick(e) {
  const b = e.target.closest("[data-t]");
  if (!b || !T) return;
  if (b.dataset.t === "next") next();
  else if (b.dataset.t === "back") go(T.i - 1);
  else if (b.dataset.t === "skip") endTour();
}

/** Next — or, for a step with `action` (e.g. "Sign me in"), end this tour and run it. */
function next() {
  const s = T && T.steps[T.i];
  if (s && s.action) { endTour(true); s.action(); return; }
  go(T.i + 1);
}

function target() {
  const s = T && T.steps[T.i];
  if (!s || !s.sel) return null;
  // a selector list = the first match that is on screen (e.g. the bottom tabs on a phone, the top nav on a computer)
  return [...document.querySelectorAll(s.sel)].find((el) => el.getClientRects().length) || null;
}
const fixedAncestor = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === "fixed" || p === "sticky") return n; } return null; };

async function go(i) {
  if (!T) return;
  if (i >= T.steps.length) { endTour(); return; }
  if (i < 0) return;
  T.i = i;
  const s = T.steps[i];
  if (s.before) { try { await s.before(); } catch (err) { console.warn("tour step", err); } }
  await new Promise((r) => setTimeout(r, 30));   // let the Hub view repaint first
  if (!T) return;
  const last = i === T.steps.length - 1;
  T.card.innerHTML = `<div class="t-step">Step ${i + 1} of ${T.steps.length}</div><h3 id="t-title" tabindex="-1">${esc(s.title)}</h3>` +
    `<div class="t-body" aria-live="polite">${s.html}</div><div class="t-nav"><button type="button" class="t-skip" data-t="skip">${last ? "Close" : "Skip tour"}</button><span class="sp"></span>` +
    `<button type="button" class="t-btn alt" data-t="back"${i === 0 ? " disabled" : ""}>Back</button><button type="button" class="t-btn" data-t="next">${esc(s.nextLabel || (last ? "Explore on my own" : "Next"))}</button></div>`;
  const el = target();
  if (el && !fixedAncestor(el)) {
    const hdr = document.querySelector(".hdr");
    const top = el.getBoundingClientRect().top + window.scrollY - (hdr ? hdr.offsetHeight : 0) - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  } else if (!el) window.scrollTo({ top: 0 });
  place();
  setTimeout(place, 350);
  const h = T.card.querySelector("#t-title"); if (h) h.focus({ preventScroll: true });
}

function place() {
  if (!T) return;
  const el = target();
  // set a class only when it changes: the observer above watches class attributes, so an identical write would loop
  const cls = (n, v) => { if (n.className !== v) n.className = v; };
  if (!el) { cls(T.spot, "t-spot none"); cls(T.card, "t-card at-bottom"); return; }
  const r = el.getBoundingClientRect(), pad = 4;
  cls(T.spot, "t-spot");
  Object.assign(T.spot.style, { top: `${r.top - pad}px`, left: `${r.left - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
  // the card sits in whichever half the target is not in
  // (a tall target is scrolled to the top of the screen, so its card goes to the bottom)
  const mid = r.top + Math.min(r.height, innerHeight) / 2;
  cls(T.card, `t-card ${r.height < innerHeight * 0.45 && mid > innerHeight * 0.55 ? "at-top" : "at-bottom"}`);
}

export function endTour(silent = false) {
  if (!T) return;
  const { onEnd } = T;
  T.mo.disconnect();
  window.removeEventListener("scroll", T.follow); window.removeEventListener("resize", T.follow);
  document.removeEventListener("keydown", onKey);
  T.spot.remove(); T.card.remove();
  T = null;
  if (!silent && onEnd) onEnd();
}
export const tourRunning = () => !!T;

/** "Restart the tour" pill for free exploring. */
export function againButton(start) {
  if (document.querySelector(".t-again")) return;
  const b = document.createElement("button");
  b.type = "button"; b.className = "t-btn t-again"; b.textContent = "Restart the tour";
  b.addEventListener("click", () => { b.remove(); start(); });
  document.body.appendChild(b);
}

/** A sheet explaining where the real Hub would take you. `link` = an optional real destination (opens in a new tab). */
export function explain({ title, html, link }) {
  const bg = document.createElement("div");
  bg.className = "t-sheet-bg";
  bg.innerHTML = `<div class="t-sheet" role="dialog" aria-modal="true" aria-labelledby="t-sheet-h"><h3 id="t-sheet-h" tabindex="-1">${esc(title)}</h3>${html}` +
    `<div class="t-nav">${link ? `<a class="t-btn" href="${esc(link.href)}" target="_blank" rel="noopener noreferrer">${esc(link.label)}</a>` : ""}` +
    `<button type="button" class="t-btn ${link ? "alt" : ""}" data-close>Close</button></div></div>`;
  const prev = document.activeElement;
  const close = () => { bg.remove(); document.removeEventListener("keydown", key, true); if (prev && prev.focus) prev.focus({ preventScroll: true }); };
  const key = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
  bg.addEventListener("click", (e) => { if (e.target === bg || e.target.closest("[data-close]")) close(); });
  document.addEventListener("keydown", key, true);
  document.body.appendChild(bg);
  bg.querySelector("#t-sheet-h").focus();
}
