import { LEAD, SEVERITIES, buildModel, stateAt, bare } from "./model.js";
import * as scene from "./scene.js";

const BUFFER = 2.5;
const SVG = "http://www.w3.org/2000/svg";

const state = { id: null, loaded: null, log: [], offset: 0, pending: [], hooked: false, model: null, open: null, loading: false, dirty: false, seen: new Set() };
const cache = {};

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
function setText(id, value) { if (cache[id] !== value) { cache[id] = value; document.getElementById(id).textContent = value; } }

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

async function loadEngagements() {
  const index = await getJSON("/api/engagements");
  const select = $("#engagement"), previous = state.id;
  const options = index.engagements.map((e) => [e.id, e.id + (e.has_session ? "" : " (no session)") + (e.id === index.active ? " · active" : "")]);
  if (cache.options !== JSON.stringify(options)) {
    cache.options = JSON.stringify(options);
    select.replaceChildren(...options.map(([value, label]) => el("option", { value, text: label })));
  }
  const ids = index.engagements.map((e) => e.id);
  state.id = ids.includes(previous) ? previous : (index.active || ids[0] || null);
  if (state.id) select.value = state.id;
  const notice = $("#notice");
  notice.hidden = ids.length > 0;
  notice.textContent = ids.length ? "" : `No engagements found in ${index.root}`;
  return state.id !== previous;
}

async function loadEngagement(reset) {
  if (!state.id) return;
  if (reset || state.loaded !== state.id) {
    Object.assign(state, { log: [], offset: 0, pending: [], model: null, open: null, seen: new Set() });
    scene.setModel(null);
  }
  const id = state.id, base = `/api/engagements/${encodeURIComponent(id)}`;
  const data = await getJSON(base);
  let more = true;
  while (more) {
    const part = await getJSON(`${base}/timeline?offset=${state.offset}`);
    if (id !== state.id) return;
    more = part.log.length > 0 && part.offset > state.offset;
    if (part.offset < state.offset) state.log = [];
    state.log = state.log.concat(part.log);
    state.offset = part.offset; state.pending = part.state; state.hooked = part.hooked;
  }
  state.loaded = id;
  const session = data.session, notice = $("#notice");
  notice.hidden = !data.error;
  notice.textContent = data.error || "";
  state.model = session && typeof session === "object" ? buildModel(session, state.log, state.pending, state.hooked) : null;
  scene.setModel(state.model);
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

function playhead(M) {
  if (!M.timed) return M.end;
  const now = Math.max(0, Date.now() / 1000 - M.origin + LEAD - BUFFER);
  return M.session.phase === "closed" ? Math.min(M.end, now) : now;
}

function frame() {
  requestAnimationFrame(frame);
  const M = state.model;
  if (!M) { place(scene.draw(null, 0)); return; }
  const t = playhead(M), S = stateAt(M, t);
  try {
    place(scene.draw(S, t));
  } catch (error) {
    state.model = null;
    scene.setModel(null);
    scene.resize();
    const notice = $("#notice");
    notice.hidden = false;
    notice.textContent = "This session could not be drawn: " + error.message;
    console.error(error);
    return;
  }
  const key = (state.open || "") + "|" + S.cands.map((c) => (c.out === "verified" ? c.sev || "?" : "")).join(",");
  if (cache.findings !== key) { cache.findings = key; renderFindings(M, S); }
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

function bulbIcon() {
  const rays = [0, 45, 90, 135, 225, 270, 315].map((d) => {
    const a = d * Math.PI / 180;
    return svg("path", { d: `M${(16 + Math.cos(a) * 11).toFixed(1)} ${(15 + Math.sin(a) * 11).toFixed(1)}L${(16 + Math.cos(a) * 14).toFixed(1)} ${(15 + Math.sin(a) * 14).toFixed(1)}` });
  });
  return svg("svg", { class: "ico", viewBox: "0 0 32 30", "aria-hidden": "true" }, [
    svg("g", { stroke: "var(--c)" }, [svg("circle", { cx: 16, cy: 15, r: 8 }), svg("path", { d: "M8 15h4l2-3.4 2.4 6.4 2.2-6.4 1.8 3.4" }), ...rays]),
    svg("path", { stroke: "var(--ink)", d: "M3 11.6h5v6.8H3zM5.6 11.6v6.8" }),
  ]);
}

function detail(term, value) { return typeof value === "string" && value ? [el("dt", { text: term }), el("dd", { text: value })] : []; }

function renderFindings(M, S) {
  const cards = [], seen = new Set(), counts = {};
  M.cands.forEach((cand, ci) => {
    const cs = S.cands[ci];
    if (cs.out !== "verified") return;
    const raw = cand.raw, open = state.open === cand.id, rank = SEVERITIES.indexOf(cs.sev), severity = rank < 0 ? "Unrated" : cs.sev;
    counts[severity] = (counts[severity] || 0) + 1;
    seen.add(cand.id);
    const card = el("article", { class: "spec" + (open ? " open" : "") + (!state.seen.has(cand.id) ? " in" : "") });
    card.dataset.rank = String(rank < 0 ? SEVERITIES.length : rank);
    card.style.setProperty("--c", `var(--s-${rank >= 0 && rank < 4 ? cs.sev.toLowerCase() : "note"})`);
    card.append(el("button", { class: "spec-face", type: "button", "aria-expanded": String(open), onclick: () => { state.open = open ? null : cand.id; } }, [
      bulbIcon(),
      el("span", { class: "spec-top" }, [el("b", { text: severity }), el("i", { text: cand.id })]),
      el("span", { class: "spec-title", text: cand.title }),
      cand.location ? el("span", { class: "spec-meta", text: cand.location }) : null,
    ]));
    if (open) {
      card.append(el("div", { class: "spec-back" }, [
        el("dl", {}, [
          ...detail("Location", typeof raw.location === "string" ? raw.location : ""),
          ...detail("Summary", raw.summary),
          ...detail("Found by", cand.owner >= 0 ? bare(M.routes[cand.owner].skill) : raw.owner_skill),
          ...detail("PoC", raw.poc_status === "executed" ? "executed" + (typeof raw.poc_ref === "string" && raw.poc_ref ? " · " + raw.poc_ref : "") : raw.poc_status === "pending_poc" ? "pending" : ""),
          ...detail("Report", raw.report_ref),
        ]),
        cand.unit >= 0 ? el("div", { class: "spec-act" }, el("button", { type: "button", text: "Locate on wall", onclick: () => scene.locateUnit(cand.unit) })) : null,
      ]));
    }
    cards.push(card);
  });
  state.seen = seen;
  const listNode = $("#find-list");
  listNode.className = "find-grid" + (cards.length > 24 ? " list" : cards.length > 8 ? " dense" : "");
  cards.sort((x, y) => Number(x.dataset.rank) - Number(y.dataset.rank));
  cards.forEach((card, i) => { card.style.animationDelay = Math.round(i * Math.min(90, 900 / cards.length)) + "ms"; });
  listNode.replaceChildren(...cards);
  $("#find-empty").hidden = cards.length > 0;
  setText("find-count", cards.length ? cards.length + " verified · " + SEVERITIES.concat("Unrated").filter((s) => counts[s]).map((s) => counts[s] + " " + s.toLowerCase()).join(" · ") : "");
}

function connect() {
  const live = $("#live"), stream = new EventSource("/api/stream");
  stream.addEventListener("open", () => { live.textContent = "connected"; live.className = "pill on"; });
  stream.addEventListener("error", () => { live.textContent = "disconnected"; live.className = "pill off"; });
  stream.addEventListener("change", () => refresh(false));
}

$("#engagement").addEventListener("change", (event) => { state.id = event.target.value; refresh(true); });
const canvas = $("#cv"), tip = $("#tip");
canvas.addEventListener("pointermove", (event) => {
  const box = canvas.getBoundingClientRect(), found = scene.tipAt(event.clientX - box.left, event.clientY - box.top);
  tip.hidden = !found;
  if (found) { tip.textContent = found.text; tip.style.left = found.x + "px"; tip.style.top = found.y + "px"; }
});
canvas.addEventListener("pointerleave", () => { tip.hidden = true; });
new ResizeObserver(() => scene.resize()).observe($("#stage"));
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => scene.refreshTokens());

scene.init(canvas, $("#stage"));
scene.setEffects(!matchMedia("(prefers-reduced-motion: reduce)").matches);
refresh(true).then(() => { connect(); requestAnimationFrame(frame); });
