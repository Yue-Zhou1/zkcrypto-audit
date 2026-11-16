import { LEAD, SEVERITIES, VERIFY_SIDE, buildModel, stateAt, callsBefore, bare, mulberry } from "./model.js";
import * as kit from "./kit.js";
import * as wall from "./scene.js";
import * as skirmish from "./skirmish.js";
import * as factory from "./factory.js";
import * as dungeon from "./dungeon.js";

const BUFFER = 2.5;
const QUIET = 4;
const SVG = "http://www.w3.org/2000/svg";

const state = { id: null, loaded: null, notes: {}, log: [], offset: 0, pending: [], hooked: false, model: null, models: {}, theme: "wall", open: null, loading: false, dirty: false, seen: new Set(), skew: null, replay: null };
const cache = {};
const THEMES = { wall, skirmish, factory, dungeon }, SINGLE = matchMedia("(max-width: 760px)");
let scene = wall;

const $ = (selector) => document.querySelector(selector);

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) if (child != null) node.append(child);
  return node;
}
function svg(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  for (const child of [].concat(children)) if (child != null) node.append(child);
  return node;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// One line above the stage, for what the drawing cannot say: nothing to show, a session that cannot be read or drawn,
// a lost connection. The first that applies is shown.
function note(kind, text) {
  state.notes[kind] = text || "";
  const shown = ["load", "draw", "link"].map((k) => state.notes[k]).find(Boolean) || "", node = $("#notice");
  node.hidden = !shown;
  node.textContent = shown;
}
function setText(id, value) { if (cache[id] !== value) { cache[id] = value; document.getElementById(id).textContent = value; } }

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

// Records are stamped by the machine that runs the audit; the playhead must follow that clock, not the browser's.
// A sample is low by the response delay, so the largest is the closest. A jump means one of the clocks was reset.
function syncClock(serverNow) {
  const sample = Date.parse(serverNow) - Date.now();
  if (Number.isNaN(sample)) return;
  state.skew = state.skew == null || Math.abs(sample - state.skew) > 1000 ? sample : Math.max(state.skew, sample);
}

// The page shows the active engagement and follows it when another becomes active. With none active it stays on the
// one it shows, or takes the first in the list.
async function loadEngagements() {
  const index = await getJSON("/api/engagements"), ids = index.engagements.map((e) => e.id), previous = state.id;
  state.id = index.active || (ids.includes(previous) ? previous : ids[0] || null);
  document.title = state.id ? state.id + " · Audit dashboard" : "Audit dashboard";
  note("load", ids.length ? "" : `No engagements found in ${index.root}`);
  if (state.id !== previous) setTheme(themeFor(state.id));
  return state.id !== previous;
}

async function loadEngagement(reset) {
  if (!state.id) return;
  if (reset || state.loaded !== state.id) {
    Object.assign(state, { log: [], offset: 0, pending: [], open: null, seen: new Set() });
    setModels(null);
    setReplay(false);
  }
  const id = state.id, base = `/api/engagements/${encodeURIComponent(id)}`;
  const data = await getJSON(base);
  let more = true;
  while (more) {
    const part = await getJSON(`${base}/timeline?offset=${state.offset}`);
    if (id !== state.id) return;
    syncClock(part.now);
    more = part.log.length > 0 && part.offset > state.offset;
    if (part.offset < state.offset) state.log = [];
    state.log = state.log.concat(part.log);
    state.offset = part.offset; state.pending = part.state; state.hooked = part.hooked;
  }
  state.loaded = id;
  const session = data.session;
  note("load", data.error);
  note("draw", "");
  setModels(session && typeof session === "object" ? session : null);
  $("#replay").disabled = !(state.model && state.model.timed);
  cache.findings = null;
}

async function refresh(reset) {
  if (state.loading) { state.dirty = true; return; }
  state.loading = true;
  try {
    const changed = await loadEngagements();
    await loadEngagement(reset || changed);
  } catch (error) {
    console.error(error);
  } finally {
    state.loading = false;
    if (state.dirty) { state.dirty = false; refresh(false); }
  }
}

// Every theme gets its own model of the same records: the facts are identical, but each theme paces them by how long
// its own actors need to get about, so the times at which things are shown differ.
function deal(count, seed) { const rnd = mulberry(kit.vary(seed)), out = Array.from({ length: count }, (v, i) => i); for (let i = count - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }
function setModels(session) {
  state.session = session;
  const hues = deal(8, 31), fills = deal(6, 57);
  for (const [name, theme] of Object.entries(THEMES)) {
    state.models[name] = session ? buildModel(session, state.log, state.pending, state.hooked, theme.pace) : null;
    // Which colour and which hatching a route has is dealt afresh for every viewing, the same in every theme.
    if (state.models[name]) for (const route of state.models[name].routes) if (route.color >= 0) { route.color = hues[route.color]; route.pattern = fills[route.pattern]; }
    theme.setModel(state.models[name]);
  }
  state.model = state.models[state.theme] || null;
}

// Each engagement is drawn in one theme, picked by its id: the same audit always looks the same, another may not.
function themeFor(id) {
  let h = 2166136261;
  for (const ch of String(id)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  const names = Object.keys(THEMES);
  return names[Math.floor(mulberry(h >>> 0)() * names.length)];
}
function setTheme(name) {
  scene = THEMES[name];
  state.theme = name; state.model = state.models[name] || null;
  cache.findings = null; cache.place = null;
}

function setReplay(on) {
  if (on) { kit.reroll(); if (state.session) setModels(state.session); }
  state.replay = on ? performance.now() : null;
  const button = $("#replay");
  button.textContent = on ? "Stop replay" : "Replay";
  button.setAttribute("aria-pressed", String(on));
}

// A replay runs at the recorded pace but keeps at most QUIET seconds of any stretch in which nothing was recorded.
function replayTime(M, played) {
  if (!M.cuts) {
    const times = M.EV.map((e) => e.t).concat(M.CALLS.map((e) => e.t)).sort((a, b) => a - b);
    let last = 0;
    M.cuts = [];
    for (const t of times) { if (t - last > QUIET) M.cuts.push({ at: last + QUIET / 2, skip: t - last - QUIET }); last = Math.max(last, t); }
  }
  let t = played;
  for (const cut of M.cuts) { if (t <= cut.at) break; t += cut.skip; }
  return t;
}

function playhead(M) {
  if (!M.timed) return M.end;
  const now = Math.max(0, (Date.now() + (state.skew || 0)) / 1000 - M.origin + LEAD - BUFFER), live = M.session.phase === "closed" ? Math.min(M.end, now) : now;
  if (state.replay == null) return live;
  const t = replayTime(M, (performance.now() - state.replay) / 1000);
  if (t < live) return t;
  setReplay(false);
  return live;
}

function frame() {
  requestAnimationFrame(frame);
  const M = state.model;
  if (!M) { place(scene.draw(null, 0)); return; }
  const t = playhead(M), S = stateAt(M, t);
  try {
    place(scene.draw(S, t));
  } catch (error) {
    setModels(null);
    kit.resize();
    note("draw", "This session could not be drawn: " + error.message);
    console.error(error);
    return;
  }
  let key = (state.open || "") + "|" + (SINGLE.matches ? "s" : "w") + "|" + S.cands.map((c) => (c.out === "verified" ? c.sev || "?" : "")).join(",");
  if (scene === skirmish) key += "|" + S.phase + "|" + callsBefore(M, t) + "|" + S.units.reduce((n, u) => n + u.cov.size, 0) + "|" + S.cands.map((c) => (c.raised < 0 ? "" : c.out || "-")).join(",");
  if (cache.findings !== key) { cache.findings = key; renderFindings(M, S, t); }
}

function place(layout) {
  const panel = $("#findings"), key = layout.p2 <= 0.001 ? "hidden" : Math.round(layout.find.y) + ":" + Math.round(layout.find.h) + ":" + layout.p2.toFixed(3);
  if (cache.place === key) return;
  cache.place = key;
  panel.hidden = key === "hidden";
  if (panel.hidden) return;
  panel.style.top = layout.find.y + "px";
  panel.style.height = layout.find.h + "px";
  panel.style.opacity = String(layout.p2);
}

function detail(term, value) { return typeof value === "string" && value ? [el("dt", { text: term }), el("dd", { text: value })] : []; }

function findingBack(M, cand, withLocation) {
  const raw = cand.raw;
  return el("div", { class: "spec-back" }, [
    el("dl", {}, [
      ...(withLocation ? detail("Location", typeof raw.location === "string" ? raw.location : "") : []),
      ...detail("Summary", raw.summary),
      ...detail("Found by", cand.owner >= 0 ? bare(M.routes[cand.owner].skill) : raw.owner_skill),
      ...detail("PoC", raw.poc_status === "executed" ? "executed" + (typeof raw.poc_ref === "string" && raw.poc_ref ? " · " + raw.poc_ref : "") : raw.poc_status === "pending_poc" ? "pending" : ""),
      ...detail("Report", raw.report_ref),
    ]),
    cand.unit >= 0 ? el("div", { class: "spec-act" }, el("button", { type: "button", text: scene === skirmish ? "Locate on field" : scene === factory ? "Locate on line" : scene === dungeon ? "Locate on map" : "Locate on wall", onclick: () => scene.locateUnit(cand.unit) })) : null,
  ]);
}

// The gates a finding went through, drawn the way its theme drew them. Wall: the path of the ball through the shells
// of the brick, each one broken open once its gate passed and riveted if it is the PoC, to the gem at the core.
// Skirmish: the gate lines its hero crossed on the way into the far base. Factory: the stations along the line, to
// the crate at its end. Dungeon: the doors along the passage, to the chest at its end. The gem, the beacon, the crate
// or the chest is in the severity colour.
function gates(M, S, found) {
  const style = scene === skirmish ? "lane" : scene === factory ? "belt" : scene === dungeon ? "door" : "brick", cand = found.cand, done = S.cands[cand.i].els, y = 16, x0 = 8, x1 = 404, span = (x1 - 40 - x0) / cand.els.length;
  const tone = cand.owner >= 0 && M.routes[cand.owner].color >= 0 ? `var(--r${M.routes[cand.owner].color})` : "var(--ink)", parts = [];
  cand.els.forEach((e, k) => {
    const x = x0 + 16 + span * (k + 0.5), ok = Boolean(done[k] && done[k].pass === true), tick = (cy) => svg("path", { d: `M${x - 3.4} ${cy}l2.4 2.5 4.4 -5`, stroke: tone });
    if (style === "belt") {
      parts.push(svg("path", { d: `M${x - 7} ${y}V${y - 13}H${x + 7}V${y}`, stroke: ok ? tone : "var(--muted)" }));
      parts.push(ok ? tick(y - 6.5) : svg("text", { x, y: y - 4, "text-anchor": "middle" }, "?"));
    } else if (style === "door") {
      parts.push(svg("path", { d: ok ? `M${x} ${y - 9}V${y - 6}M${x} ${y + 6}V${y + 9}M${x} ${y - 6}L${x + 9} ${y - 2.5}` : `M${x - 1.8} ${y - 8}H${x + 1.8}V${y + 8}H${x - 1.8}Z`, stroke: ok ? tone : "var(--muted)", fill: ok ? "none" : "var(--bg)" }));
    } else if (style === "lane") {
      parts.push(svg("path", { d: `M${x} ${y - 8}V${y + 7}`, stroke: "var(--muted)", "stroke-dasharray": "2 3" }));
      parts.push(ok ? svg("path", { d: `M${x - 3.6} ${y - 12.5}l2.6 2.6 4.6 -5.2`, stroke: tone }) : svg("text", { x, y: y - 10, "text-anchor": "middle" }, "?"));
    } else {
      parts.push(svg("path", { d: ok ? `M${x - 7} ${y - 4}V${y - 8}H${x - 3}M${x + 3} ${y - 8}H${x + 7}V${y - 4}M${x + 7} ${y + 4}V${y + 8}H${x + 3}M${x - 3} ${y + 8}H${x - 7}V${y + 4}` : `M${x - 7} ${y - 8}H${x + 7}V${y + 8}H${x - 7}Z`, stroke: ok ? tone : "var(--muted)", fill: ok ? "none" : "var(--bg)" }));
      if (e.kind === "poc") for (const [dx, dy] of [[-4.6, -5.6], [4.6, -5.6], [-4.6, 5.6], [4.6, 5.6]]) parts.push(svg("circle", { cx: x + dx, cy: y + dy, r: 0.9, stroke: ok ? tone : "var(--muted)" }));
    }
    parts.push(svg("text", { x, y: y + 17, "text-anchor": "middle" }, e.label + (ok || (style !== "brick" && style !== "door") ? "" : " ?")));
  });
  const track = `M${x0 + 3} ${y}H${x1 - 10}`, rays = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => { const a = (deg + (style === "brick" ? 22.5 : 0)) * Math.PI / 180, at = (r) => (x1 + Math.cos(a) * r).toFixed(1) + " " + (y + Math.sin(a) * r).toFixed(1); return `M${at(style === "lane" ? 9.5 : 11.5)}L${at(style === "lane" ? 13 : 15)}`; });
  const walls = style === "door" ? svg("path", { d: `M${x0 + 3} ${y - 6}H${x1 - 12}M${x0 + 3} ${y + 6}H${x1 - 12}`, stroke: "var(--muted)" }) : null;
  const end = style === "door" ? `M${x1 - 7} ${y - 1}h14v7.5h-14zM${x1 - 7} ${y - 1}l-1.6 -6h13.2l2.4 6M${x1} ${y - 9}l2.6 2.2 -2.6 3.4 -2.6 -3.4z` : style === "belt" ? `M${x1 - 6.5} ${y - 6.5}h13v13h-13zM${x1} ${y - 3}v3.6M${x1} ${y + 2.6}v0.4` : style === "lane" ? `M${x1 + 6.5} ${y}a6.5 6.5 0 1 1 -13 0a6.5 6.5 0 1 1 13 0` : `M${x1} ${y - 8.5}L${x1 + 7} ${y - 2.5}L${x1} ${y + 8.5}L${x1 - 7} ${y - 2.5}ZM${x1 - 7} ${y - 2.5}H${x1 + 7}`;
  return svg("svg", { class: "gates", viewBox: "0 0 420 40", role: "img", "aria-label": "Gates: " + cand.els.map((e, k) => e.label + (done[k] && done[k].pass === true ? " passed" : " not recorded")).join(", ") }, [
    walls,
    svg("path", style === "belt" ? { d: track, stroke: tone, "stroke-width": 1.5 } : { d: track, stroke: tone, "stroke-width": 1.4, "stroke-dasharray": style === "lane" ? "1 5" : style === "door" ? "1 4" : "2 4" }),
    style === "belt" ? svg("path", { d: `M${x0 + 3} ${y + 4}H${x1 - 10}`, stroke: "var(--muted)", "stroke-dasharray": "1 4" }) : null,
    svg("circle", { cx: x0, cy: y, r: 3.2, stroke: tone }), svg("circle", { cx: x0, cy: y, r: 1.2, fill: tone, stroke: "none" }),
    ...parts,
    style === "lane" ? svg("circle", { cx: x1, cy: y, r: 1.6, fill: "var(--c)", stroke: "none" }) : null,
    svg("path", { d: end + rays.join(""), stroke: "var(--c)" }),
  ]);
}

// The picked finding in full, shown beside the list in both themes.
function dossier(M, S, found) {
  const cand = found.cand, page = el("article", { class: "dossier" }, [
    el("div", { class: "dossier-top" }, [el("b", { text: found.severity }), el("i", { text: cand.id })]),
    el("h3", { text: cand.title }),
    cand.location ? el("p", { class: "dossier-at", text: cand.location }) : null,
    gates(M, S, found),
    findingBack(M, cand, false),
  ]);
  page.style.setProperty("--c", found.tone);
  return page;
}

// One finding as a row that can be picked: severity, id, title. `more` is what opens under it, if anything.
function findRow(found, open, more, mark, pick) {
  const cand = found.cand;
  const box = el("div", { class: "find-box" + (open ? " open" : "") + (found.fresh ? " in" : "") }, [
    el("button", { class: "find", type: "button", [more === undefined ? "aria-pressed" : "aria-expanded"]: String(open), onclick: pick },
      [el("b", { text: found.severity }), el("i", { text: cand.id }), el("span", { class: "t", text: cand.title }), el("span", { class: "at", text: cand.location }), el("span", { class: "go", "aria-hidden": "true", text: mark })]),
    more ? el("div", { class: "find-more" }, more) : null,
  ]);
  box.style.setProperty("--c", found.tone);
  return box;
}

// Both themes end the same way: findings on the left, the picked one in full on the right, the most severe picked
// to begin with. On a narrow page there is one column and a finding opens in place. This builds one row.
function pickRow(M, S, found, chosen, single) {
  const id = found.cand.id, open = single ? state.open === id : found === chosen;
  return findRow(found, open, single ? (open ? [gates(M, S, found), findingBack(M, found.cand, true)] : null) : undefined, single && open ? "▾" : "▸", () => { state.open = single && open ? null : id; });
}

// The skirmish theme ends on a scoreboard, read top down: one block per domain auditor with its findings as rows
// that open in place, then the fp-check side. Every number is counted
// from the records up to the playhead.
function scoreboard(M, S, t, found, chosen, single) {
  const blank = (route, name) => ({ route, name, calls: 0, files: 0, done: 0, raised: 0, fp: 0, noted: 0, found: [] });
  const rows = M.routes.filter((r) => r.wall).map((r) => blank(r, bare(r.skill))), byRoute = new Map(rows.map((row) => [row.route.i, row]));
  let other = null, beams = 0, decided = 0;
  for (let i = callsBefore(M, t) - 1; i >= 0; i--) { const a = M.CALLS[i].a; if (a === VERIFY_SIDE) beams++; else if (byRoute.has(a)) byRoute.get(a).calls++; }
  M.units.forEach((U) => U.req.forEach((a) => { const row = byRoute.get(a); if (row) { row.files++; if (S.units[U.i].cov.has(a)) row.done++; } }));
  const rowOf = (cand) => byRoute.get(cand.owner) || (other ||= blank(null, "unattributed"));
  M.cands.forEach((cand, ci) => {
    const cs = S.cands[ci];
    if (cs.raised < 0) return;
    const row = rowOf(cand);
    row.raised++;
    if (cs.verdict >= 0) decided++;
    if (cs.out === "false_positive") row.fp++; else if (cs.out === "observation" || cs.out === "residual_risk") row.noted++;
  });
  for (const f of found) rowOf(f.cand).found.push(f);
  if (other) rows.push(other);
  const sum = (key) => rows.reduce((n, row) => n + row[key], 0);
  const icon = (path) => svg("svg", { viewBox: "-8 -7 18 14", "aria-hidden": "true" }, svg("path", { d: path }));
  const squad = (tone, mark, key, name, score, scoreKey, meta, finds) => {
    const node = el("section", { class: "squad" + (finds.length ? "" : " idle") }, [
      el("div", { class: "squad-head" }, [
        el("span", { class: "crest" }, mark),
        el("span", { class: "who" }, [key ? el("b", { text: key }) : null, el("span", { text: name })]),
        el("span", { class: "meta", text: meta }),
        el("span", { class: "kda" }, [el("b", { text: String(score[0]) }), el("i", { text: "/" }), el("span", { text: String(score[1]) }), el("i", { text: "/" }), el("span", { text: String(score[2]) })]),
        el("span", { class: "kda-key", text: scoreKey }),
      ]),
      ...finds,
    ]);
    node.style.setProperty("--c", tone);
    return node;
  };
  const finding = (f) => pickRow(M, S, f, chosen, single);
  const out = [];
  out.push(el("h3", { class: "side", text: "Auditors" }));
  rows.sort((x, y) => (y.found.length > 0) - (x.found.length > 0));
  for (const row of rows) {
    out.push(squad(row.route && row.route.color >= 0 ? `var(--r${row.route.color})` : "var(--muted)", row.route ? icon(skirmish.laneIcon(row.route.i)) : null, row.route && row.route.key, row.name,
      [row.found.length, row.fp, row.noted], "verified / false pos / noted", row.calls + " calls · " + row.done + "/" + row.files + " towers · " + row.raised + " raised", row.found.map(finding)));
  }
  out.push(el("h3", { class: "side", text: "FP-check" }));
  out.push(squad("var(--ink)", icon("M0 -6L4 0L0 6L-4 0ZM-4 0H4"), null, "crypto-fp-check", [found.length, sum("fp"), sum("noted")], "passed / destroyed / noted", beams + " beams · " + decided + "/" + sum("raised") + " decided", []));
  return out;
}

function renderFindings(M, S, t) {
  const found = [], seen = new Set(), counts = {};
  M.cands.forEach((cand, ci) => {
    const cs = S.cands[ci];
    if (cs.out !== "verified") return;
    const rank = SEVERITIES.indexOf(cs.sev), severity = rank < 0 ? "Unrated" : cs.sev;
    counts[severity] = (counts[severity] || 0) + 1;
    seen.add(cand.id);
    found.push({ cand, severity, rank: rank < 0 ? SEVERITIES.length : rank, tone: `var(--s-${rank >= 0 && rank < 4 ? cs.sev.toLowerCase() : "note"})`, fresh: !state.seen.has(cand.id) });
  });
  found.sort((x, y) => x.rank - y.rank);
  state.seen = seen;
  const board = scene === skirmish, listNode = $("#find-list"), single = SINGLE.matches, chosen = single ? null : found.find((f) => f.cand.id === state.open) || found[0];
  let summary = found.length ? found.length + " verified · " + SEVERITIES.concat("Unrated").filter((s) => counts[s]).map((s) => counts[s] + " " + s.toLowerCase()).join(" · ") : "";
  let left;
  if (board) {
    const spent = Math.round(clamp(t, LEAD, Math.max(LEAD, M.lastActivity)) - LEAD), two = (n) => String(n).padStart(2, "0");
    summary = (summary || "no verified findings") + " · " + callsBefore(M, t) + " calls · " + (spent >= 3600 ? Math.floor(spent / 3600) + ":" : "") + two(Math.floor(spent / 60) % 60) + ":" + two(spent % 60);
    left = el("div", { class: "squads" }, scoreboard(M, S, t, found, chosen, single));
  } else if (found.length) {
    left = el("div", { class: "cases" }, found.map((f, i) => { const row = pickRow(M, S, f, chosen, single); row.style.animationDelay = Math.round(i * Math.min(90, 900 / found.length)) + "ms"; return row; }));
  }
  listNode.className = "finds " + (single ? "single" : "split");
  listNode.replaceChildren(...[left, chosen ? dossier(M, S, chosen) : null].filter(Boolean));
  setText("find-title", board ? (S.phase >= 5 ? "Audit complete" : "Scoreboard") : "Findings");
  $("#find-empty").hidden = board || found.length > 0;
  setText("find-count", summary);
}

function connect() {
  const stream = new EventSource("/api/stream");
  stream.addEventListener("open", () => note("link", ""));
  stream.addEventListener("error", () => note("link", "Disconnected from the dashboard server."));
  stream.addEventListener("change", () => refresh(false));
}

$("#replay").addEventListener("click", () => setReplay(state.replay == null));
const canvas = $("#cv"), tip = $("#tip");
canvas.addEventListener("pointermove", (event) => {
  const box = canvas.getBoundingClientRect(), found = kit.tipAt(event.clientX - box.left, event.clientY - box.top);
  tip.hidden = !found;
  if (found) { tip.textContent = found.text; tip.style.left = found.x + "px"; tip.style.top = found.y + "px"; }
});
canvas.addEventListener("pointerleave", () => { tip.hidden = true; });
new ResizeObserver(() => kit.resize()).observe($("#stage"));
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => kit.refreshTokens());

kit.init(canvas, $("#stage"));
kit.setEffects(!matchMedia("(prefers-reduced-motion: reduce)").matches);
refresh(true).then(() => { connect(); requestAnimationFrame(frame); });
