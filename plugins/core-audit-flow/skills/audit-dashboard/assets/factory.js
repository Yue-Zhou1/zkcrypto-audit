// The factory theme: the audit as a quality control line.
//
// One roller conveyor per domain auditor. A file in scope is a part that waits in the queue, rolls under the gantry
// when its review starts and rolls on to the passed stack when the review is recorded. The gantry probe comes down
// once per recorded tool call. A candidate is a tagged crate that leaves the floor for the inspection line, stops at
// one station per verification gate and ends in a bin. What happens is fixed by the record; only the gliding between
// places is simulated: a decided crate rolls to the end of the line, slides down to a pad, and an overhead claw
// carries it into the truck for its verdict.
import { PHASE_LABEL, OUT_LABEL, VERIFY_SIDE, FLOW_SIDE, mulberry, recent, activeCandidate, callsBefore, bare } from "./model.js";
import { ctx, C, W, H, DISP, TOP_H, NARROW, STALE, lerp, clamp, smooth, backOut, progress, FX, hits, text, fit, pen, line, brackets, streaks, ring, echo, floatText, shakeAt, drawBanner, burst, vary } from "./kit.js";

const TAU = Math.PI * 2, FLOOR_W = 0.44, REACH = 0.9;
// Where the stops stand along a conveyor, as fractions of its length: end of the queue, the two ends of the
// inspection zone, start of the passed stack.
const Q0 = 0.3, W0 = 0.36, W1 = 0.66, P0 = 0.72;
const STATIONS = ["claim", "trigger", "impact", "poc", "severity"], STATION_LABEL = ["CLAIM", "TRIGGER", "IMPACT", "POC", "SEVERITY"];
const BINS = ["VERIFIED", "NOTED", "FALSE POSITIVE"], BIN_TIP = ["confirmed as real findings", "kept as an observation or a residual risk", "rejected as false positives"], ROLL = 0, SLIDE = 1, READY = 2, CARRIED = 3, LOADED = 4;

let M = null, HOLD = null, locate = null, FL = null, LB = null, kinds = [0, 1, 2, 3, 4, 5];
let lanes = [], laneOf = new Map(), laneUnits = new Map(), contact = new Map(), routeEnd = [], longest = 0;
const sim = { parts: new Map(), heads: new Map(), tokens: new Map(), spin: new Map(), spots: new Map(), pad: [], claw: { state: "idle", u: 1, h: 0, k: 0, id: null, want: null, from: 0, to: 0, time: 0 }, lab: { ph: 0, v: 0 }, busy: -1, over: [], binOver: [], last: null, clock: 0 };

export function setModel(model) {
  if (!model) sim.last = null;
  M = model;
  if (!M) return;
  routeEnd = M.routes.map(() => -Infinity);
  contact = new Map();
  for (const e of M.EV) {
    if (e.type === "end") routeEnd[e.a] = Math.max(routeEnd[e.a], e.t);
    else if ((e.type === "tap" || e.type === "cover") && !contact.has(e.a + ":" + e.u)) contact.set(e.a + ":" + e.u, e.t);
  }
  // By the draw of this viewing: which auditor's line runs where on the floor.
  lanes = deal(M.routes.filter((r) => r.wall).map((r) => r.i), 6007);
  // and which kind of part each line carries: one kind to a line
  kinds = deal([0, 1, 2, 3, 4, 5], 6011);
  laneOf = new Map(lanes.map((a, k) => [a, k]));
  laneUnits = new Map(); longest = 0;
  for (const a of lanes) {
    // Parts queue in the order the route first touched their files, so the queue drains from its head.
    const met = (U) => contact.get(a + ":" + U.i) ?? Infinity;
    laneUnits.set(a, M.units.filter((U) => U.req.includes(a)).sort((p, q) => (met(p) === met(q) ? p.i - q.i : met(p) - met(q))));
    longest = Math.max(longest, laneUnits.get(a).length);
  }
}
export function locateUnit(u) { locate = { id: M.units[u].id, at: performance.now() }; }
// The gantry needs a moment to lift and travel before its probe can come down again.
export const pace = { route: (a, from, to) => (from === to ? 0.45 : 0.8), verify: (from, to) => (from && from.c === to.c && from.k === to.k ? 0.4 : 0.7) };

function deal(list, seed) { const rnd = mulberry(vary(seed)), out = list.slice(); for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }
const routeColor = (a) => (a >= 0 && M.routes[a].color >= 0 ? C.route[M.routes[a].color] : C.ink);
const shortName = (skill) => bare(skill).replace(/-(auditor|checker)$/, "");
const stationOf = (el) => (el.kind === "poc" ? 3 : Math.max(0, STATIONS.indexOf(el.gate)));

function regions(p1, p2) {
  if (W >= NARROW) {
    const ww = lerp(W, W * FLOOR_W, p1), hh = lerp(H, H * TOP_H, p2);
    return { floor: { x: 0, y: 0, w: ww, h: hh }, lab: { x: ww, y: 0, w: W - ww, h: hh }, find: { x: 0, y: hh, w: W, h: H - hh } };
  }
  const fh = lerp(lerp(H, H * 0.42, p1), H * 0.22, p2), bottom = lerp(H, H * 0.52, p2);
  return { floor: { x: 0, y: 0, w: W, h: fh }, lab: { x: 0, y: fh, w: W, h: bottom - fh }, find: { x: 0, y: bottom, w: W, h: H - bottom } };
}

function floorLayout(R) {
  const pad = lerp(14, 22, clamp((R.w - 320) / 600, 0, 1)), x0 = R.x + pad, x1 = R.x + R.w - pad, y0 = R.y + 40, y1 = R.y + R.h - 10, legend = R.h > 300 && R.w > 760 ? 18 : 0;
  const n = Math.max(1, lanes.length), room = Math.max(40, y1 - y0 - 20 - legend), laneH = Math.min(room / n, 150), top = y0 + 14 + (room - laneH * n) / 2;
  const q = clamp(Math.min(laneH / 104, (x1 - x0) / 560), 0.42, 1.1), bx0 = x0 + 30 * q, bx1 = x1 - 6 * q, len = Math.max(40, bx1 - bx0);
  FL = { R, x0, x1, y0, y1, legend, n, laneH, top, q, bx0, bx1, len, X: (f) => bx0 + f * len, laneTop: (k) => top + k * laneH, beltY: (k) => top + (k + 0.76) * laneH, railY: (k) => top + k * laneH + Math.max(6, 0.76 * laneH - Math.max(0.46 * laneH, 62 * q)) };
}
function labLayout(B) {
  const q = clamp(Math.min(B.h / 400, B.w / 640), 0.5, 1.3), focusH = B.h > 280 && B.w > 300 ? 44 : 0, top = B.y + 32 + focusH, bottom = B.y + B.h - 10, x0 = B.x + 18, x1 = B.x + B.w - 18, ts = clamp(24 * q, 9, 30);
  // Under the line hangs the crane rail, and under that stand the trucks; the gap between them clears a carried crate.
  const drop = ts + 44, avail = bottom - top, instH = clamp(avail * 0.36, 30, 112 * q), binH = clamp(avail - instH - 18 - drop, ts + 40, ts * 2 + 64);
  const by = top + 14 + instH + Math.max(0, (avail - instH - 18 - drop - binH) / 2), rr = clamp(3.6 * q, 1.8, 4), rail = by + rr * 2 + 14, binY = by + drop, padY = binY + 6, wheel = clamp(7 * q, 4, 9);
  // A run-in where crates wait, then the five stations, then a short run-out that ends in a slide down to the pad.
  const s0 = x0 + (x1 - x0) * 0.24, cw = (x1 - 40 * q - s0) / 5, hw = clamp(cw * 0.3, 11, 34 * q), bx1 = x1 + 2, slope = clamp(ts * 1.6, 28, 56), px = x1 - slope - ts / 2 - 2;
  const sx = bx1 - (px + ts / 2 + 5), sy = by - padY, sl = Math.hypot(sx, sy), share = [0.5, 0.22, 0.28], gap = 12, room = px - ts / 2 - 18 - x0 - gap * 2, bins = [];
  let x = x0;
  // In which order the three trucks stand is drawn afresh for every viewing.
  for (const i of deal([0, 1, 2], 6101)) { const f = share[i], cab = clamp(room * f * 0.2, 14, 38 * q); bins[i] = { x, y: binY, w: room * f - cab - 4, h: binH - wheel * 2 - 5, cab }; x += room * f + gap; }
  LB = { B, q, focusH, top, bottom, x0, x1, cw, hw, ts, instH, by, rr, rail, padY, px, bx1, wheel, ground: binY + binH, rx0: x0 + 8, rx1: px, ux: sx / sl, uy: sy / sl, bins, labels: q > 0.72, sx: (j) => s0 + (j + 0.5) * cw };
}
const rectOf = (space) => (space === "lab" ? LB.B : FL.R);
const partSize = () => clamp(Math.min(FL.laneH * 0.23, (W1 - W0) * FL.len / Math.max(3, longest) * 0.85), 3, 30 * FL.q);
const partPos = (p) => { const s = partSize(p.a); return { x: FL.X(p.f), y: FL.beltY(laneOf.get(p.a)) - s / 2 - 1, s }; };

function segAt(a, t) {
  const segs = M.PLAN[a];
  let lo = 0, hi = segs.length - 1, found = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (segs[m].t0 <= t) { found = m; lo = m + 1; } else hi = m - 1; }
  return found >= 0 && t <= segs[found].t1 ? found : -1;
}

// Each zone of a conveyor accumulates against its stop: the part that got there first stands nearest to it.
function partTargets(S, t) {
  const want = new Map();
  for (const a of lanes) {
    const sf = partSize(a) / FL.len, queue = [], work = [], done = [];
    for (const U of laneUnits.get(a)) {
      const us = S.units[U.i], met = contact.get(a + ":" + U.i) ?? Infinity;
      if (!us.cells.has(a)) continue;
      if (us.cov.has(a)) done.push({ U, at: us.cov.get(a) });
      else if (met - REACH <= t) work.push({ U, at: met });
      else queue.push({ U, at: 0 });
    }
    done.sort((p, q) => p.at - q.at); work.sort((p, q) => p.at - q.at);
    const put = (list, zone, stop, room, spread) => {
      const pitch = Math.min(sf * spread, room / Math.max(1, list.length));
      list.forEach((p, j) => want.set(a + ":" + p.U.id, { a, U: p.U, zone, pitch, f: stop - (j + 0.5) * pitch }));
    };
    put(queue, 0, Q0, Q0, 1.18); put(work, 1, W1, W1 - W0, 1.7); put(done, 2, 1, 1 - P0, 1.18);
  }
  return want;
}
function stepParts(S, t, dt, snap) {
  const want = partTargets(S, t);
  for (const key of [...sim.parts.keys()]) if (!want.has(key)) sim.parts.delete(key);
  for (const [key, w] of want) {
    let p = sim.parts.get(key);
    if (!p) sim.parts.set(key, p = { f: snap ? w.f : -0.03 });
    const d = w.f - p.f;
    p.f = snap ? w.f : p.f + Math.sign(d) * Math.min(Math.abs(d), dt * Math.min(0.55, 0.03 + Math.abs(d) * 7));
    p.a = w.a; p.U = w.U; p.zone = w.zone; p.pitch = w.pitch;
  }
}
// The gantry head follows the plan the model built from the record: it travels to a part, comes down so that the
// probe lands at the moment the call or the review was recorded, and lifts again.
function stepHeads(t, snap) {
  for (const a of lanes) {
    let h = sim.heads.get(a);
    if (!h) sim.heads.set(a, h = { f: W0 + 0.03, f0: W0 + 0.03, n: -1, d: 0, active: false });
    const i = segAt(a, t), s = i < 0 ? null : M.PLAN[a][i];
    h.active = Boolean(s); h.d = 0;
    if (!s || s.kind === "ride") { h.n = -1; continue; }
    const p = sim.parts.get(a + ":" + M.units[s.u].id), pf = clamp(p ? p.f : h.f, W0, W1), k = clamp((t - s.t0) / Math.max(0.001, s.t1 - s.t0), 0, 1);
    if (snap) { h.f = pf; h.n = i; h.f0 = pf; continue; }
    if (s.kind === "up") {
      if (h.n !== i) { h.n = i; h.f0 = h.f; }
      h.f = lerp(h.f0, pf, smooth(clamp(k / 0.7, 0, 1))); h.d = k < 0.66 ? 0 : Math.pow((k - 0.66) / 0.34, 2);
    } else { h.f = pf; h.d = 1 - smooth(clamp(k * 1.6, 0, 1)); }
  }
}

function tokenLane(c) {
  if (laneOf.has(c.owner)) return c.owner;
  return c.unit >= 0 ? M.units[c.unit].req.find((a) => laneOf.has(a)) ?? null : null;
}
function tokenTargets(S, t, act) {
  const want = new Map(), raised = [], L = LB, q = FL.q;
  M.cands.forEach((c, ci) => { if (S.cands[ci].raised >= 0) raised.push(ci); });
  raised.sort((x, y) => S.cands[x].raised - S.cands[y].raised || x - y);
  const stagger = Math.min(0.12, 2 / Math.max(1, raised.length)), at = STATIONS.map(() => []), out = [], bin = BINS.map(() => []), onPart = new Map();
  raised.forEach((ci, order) => {
    const c = M.cands[ci], cs = S.cands[ci], id = c.raw.id;
    if (!(cs.verdict >= 0 || cs.els.some(Boolean) || t >= M.tBench + 0.5 + order * stagger)) {
      // Still on the floor: the crate rides above the part it was raised on.
      const a = tokenLane(c), p = a != null && c.unit >= 0 ? sim.parts.get(a + ":" + M.units[c.unit].id) : null, size = clamp((a != null ? partSize(a) : 20) * 0.62, 7, 17);
      const key = p ? a + ":" + c.unit : "none:" + (a ?? -1), slot = onPart.get(key) || 0;
      onPart.set(key, slot + 1);
      if (p) { const pos = partPos(p); want.set(id, { sp: "floor", x: pos.x + slot * (size + 3), y: pos.y - pos.s / 2 - size / 2 - 5 * q, size }); }
      else { const k = a != null ? laneOf.get(a) : 0; want.set(id, { sp: "floor", x: FL.X(0.5) + slot * (size + 3), y: FL.railY(k) + size, size }); }
      return;
    }
    if (cs.verdict >= 0 && cs.out !== "open") { bin[cs.out === "verified" ? 0 : cs.out === "false_positive" ? 2 : 1].push(ci); return; }
    const next = cs.els.findIndex((x) => !(x && x.pass === true));
    if (next < 0) out.push(ci); else at[stationOf(c.els[next])].push(ci);
  });
  sim.busy = -1; sim.over = STATIONS.map(() => 0); sim.binOver = BINS.map(() => 0);
  const pitch = L.ts + 4, onLine = L.by - L.ts / 2 - 1;
  at.forEach((list, j) => {
    // Only the candidate under verification stands in the station. The rest wait before it, stacked two high.
    const right = L.sx(j) - L.hw - 5, left = j === 0 ? L.x0 + 2 : L.sx(j - 1) + L.hw + 5, cols = Math.max(1, Math.floor((right - left) / pitch));
    let r = 0;
    for (const ci of list) {
      const id = M.cands[ci].raw.id;
      if (ci === act) { want.set(id, { sp: "lab", x: L.sx(j), y: onLine, size: L.ts, station: true }); sim.busy = j; }
      else if (r >= cols * 2) { want.set(id, { sp: "lab", x: right - L.ts / 2, y: onLine, size: L.ts, hidden: true }); sim.over[j]++; }
      else { want.set(id, { sp: "lab", x: right - L.ts / 2 - (r % cols) * pitch, y: onLine - Math.floor(r / cols) * (L.ts + 2), size: L.ts }); r++; }
    }
  });
  out.forEach((ci, j) => want.set(M.cands[ci].raw.id, { sp: "lab", x: L.sx(4) + L.hw + 6 + L.ts / 2, y: onLine - j * (L.ts + 2), size: L.ts }));
  bin.forEach((list, b) => {
    const box = L.bins[b];
    list.sort((x, y) => S.cands[x].verdict - S.cands[y].verdict || x - y);
    let size = L.ts, cols = 1, lines = 1, row = size + 6, label = false;
    for (const sc of [1, 0.8, 0.64, 0.5]) {
      size = L.ts * sc; label = L.labels && sc === 1 && b === 0; row = size + (label ? 14 : 5);
      cols = Math.max(1, Math.floor((box.w - 10) / (size + 8))); lines = Math.max(1, Math.floor((box.h - 14) / row));
      if (cols * lines >= list.length) break;
    }
    list.forEach((ci, r) => {
      const hidden = r >= cols * lines;
      if (hidden) sim.binOver[b]++;
      want.set(M.cands[ci].raw.id, { sp: "lab", bin: b, x: box.x + 9 + size / 2 + (r % cols) * (size + 8), y: box.y + box.h - (label ? 13 : 3) - size / 2 - Math.floor(hidden ? 0 : r / cols) * row, size, label, hidden });
    });
  });
  return want;
}
function stepTokens(S, t, dt, snap, act) {
  const want = tokenTargets(S, t, act), L = LB;
  for (const id of [...sim.tokens.keys()]) if (!want.has(id)) sim.tokens.delete(id);
  sim.pad = snap ? [] : sim.pad.filter((id) => { const tk = sim.tokens.get(id); return tk && (tk.stage === SLIDE || tk.stage === READY) && want.get(id).bin != null; });
  for (const [id, w] of want) {
    const R = rectOf(w.sp), fresh = !sim.tokens.has(id);
    if (fresh) sim.tokens.set(id, { sp: w.sp, nx: (w.x - R.x) / R.w, ny: (w.y - R.y) / R.h, size: w.size, stage: null, spot: null });
    const tk = sim.tokens.get(id), from = rectOf(tk.sp);
    let x = from.x + tk.nx * from.w, y = from.y + tk.ny * from.h;
    // A decided crate rolls to the end of the line, slides down to the pad and waits
    // there for the claw. `spot` is where it stood when it was decided; the verdict is announced there.
    if (w.bin == null) { tk.stage = null; tk.spot = null; }
    else if (snap || fresh) tk.stage = LOADED;
    else if (tk.stage == null) { tk.stage = ROLL; tk.spot = { sp: tk.sp, nx: tk.nx, ny: tk.ny }; }
    let goal = w, speed = 0;
    if (tk.stage === ROLL) { goal = { x: L.bx1 - L.ts / 2 - 5, y: L.by - L.ts / 2 - 1, size: L.ts }; speed = 430; }
    else if (tk.stage === SLIDE || tk.stage === READY) { const far = sim.pad.indexOf(id) * (L.ts + 3); goal = { x: L.px + L.ux * far, y: L.padY - L.ts / 2 + L.uy * far, size: L.ts }; speed = 520; }
    if (snap) { x = w.x; y = w.y; tk.size = w.size; }
    else if (tk.stage !== CARRIED) {
      const dx = goal.x - x, dy = goal.y - y, d = Math.hypot(dx, dy);
      if (d > 0.01) { const step = Math.min(d, dt * (speed || Math.min(560, 50 + d * 6))); x += dx / d * step; y += dy / d * step; }
      if (tk.stage === ROLL && d < 1.5) { tk.stage = SLIDE; sim.pad.push(id); }
      else if (tk.stage === SLIDE && d < 1.5 && sim.pad[0] === id) tk.stage = READY;
    }
    if (!snap) tk.size += (goal.size - tk.size) * (1 - Math.exp(-dt * 8));
    const settled = w.bin == null || tk.stage === LOADED;
    Object.assign(tk, { sp: w.sp, nx: (x - R.x) / R.w, ny: (y - R.y) / R.h, x, y, slot: w, hidden: Boolean(w.hidden) && settled, label: Boolean(w.label) && settled, station: Boolean(w.station) });
  }
  stepClaw(dt, snap);
}
// The claw runs on the rail under the line: down to the pad, up with the crate, along to the truck, down, release,
// and back. One crate at a time; the others wait on the slide.
function stepClaw(dt, snap) {
  const c = sim.claw, L = LB, span = L.rx1 - L.rx0, held = c.id != null ? sim.tokens.get(c.id) : null;
  if (snap || (c.id != null && (!held || held.stage !== CARRIED))) Object.assign(c, { state: "idle", u: 1, h: 0, k: 0, id: null, want: null, time: 0 });
  if (snap) return;
  c.k += dt;
  const go = (state, from, to, time) => Object.assign(c, { state, from, to, time, k: 0 }), at = c.time ? lerp(c.from, c.to, smooth(clamp(c.k / c.time, 0, 1))) : c.to, done = c.k >= c.time;
  const reach = (y, size) => y - size / 2 - 2 - (L.rail + 10);
  if (c.state === "idle") {
    const next = sim.pad[0] != null ? sim.tokens.get(sim.pad[0]) : null;
    if (next && next.stage === READY) { c.want = sim.pad[0]; go("reach", 0, reach(L.padY - L.ts / 2, L.ts), 0.22); }
  } else if (c.state === "reach") {
    c.h = at;
    const tk = sim.tokens.get(c.want);
    if (!tk || tk.stage !== READY) go("raise", c.h, 0, 0.2);
    else if (done) { tk.stage = CARRIED; c.id = c.want; sim.pad.shift(); go("lift", c.h, 0, 0.22); }
  } else if (c.state === "lift") { c.h = at; if (done) { const to = clamp((held.slot.x - L.rx0) / span, 0, 1); go("carry", c.u, to, Math.max(0.3, Math.abs(to - c.u) * span / 650)); } }
  else if (c.state === "carry") { c.u = at; if (done) go("lower", 0, reach(held.slot.y, held.size), 0.26); }
  else if (c.state === "lower") { c.h = at; if (done) { held.stage = LOADED; c.id = null; go("raise", c.h, 0, 0.2); } }
  else if (c.state === "raise") { c.h = at; if (done) go("back", c.u, 1, Math.max(0.25, (1 - c.u) * span / 900)); }
  else if (c.state === "back") { c.u = at; if (done) Object.assign(c, { state: "idle", time: 0 }); }
  const tk = c.id != null ? sim.tokens.get(c.id) : null;
  if (tk) { const R = L.B; tk.x = L.rx0 + c.u * span; tk.y = L.rail + 10 + c.h + 2 + tk.size / 2; tk.nx = (tk.x - R.x) / R.w; tk.ny = (tk.y - R.y) / R.h; }
}
function drawClaw() {
  const c = sim.claw, L = LB, g = L.q, x = L.rx0 + c.u * (L.rx1 - L.rx0), bar = L.rail + 10 + c.h, tk = c.id != null ? sim.tokens.get(c.id) : null, size = tk ? tk.size : L.ts, w = size / 2 + 3, len = size * 0.66;
  pen(C.ink, 1.2); line(x - 2.5 * g, L.rail + 4 * g, x - 2.5 * g, bar - 4 * g); line(x + 2.5 * g, L.rail + 4 * g, x + 2.5 * g, bar - 4 * g);
  ctx.fillStyle = C.bg; ctx.beginPath(); ctx.rect(x - 10 * g, L.rail - 4.5 * g, 20 * g, 9 * g); ctx.fill(); pen(C.ink, 1.6); ctx.stroke();
  pen(C.ink, 1.1); for (const sx of [-5.5, 5.5]) { ctx.beginPath(); ctx.arc(x + sx * g, L.rail - 4.5 * g, 2 * g, 0, TAU); ctx.fill(); ctx.stroke(); }
  // The head is one of three makes: two fingers, three prongs, or a magnet. Fingers hang open until they hold a crate.
  const make = vary(5) % 3;
  ctx.beginPath(); ctx.rect(x - 5 * g, bar - 4 * g, 10 * g, 4 * g); ctx.fill(); pen(C.ink, 1.4); ctx.stroke();
  if (make === 2) { ctx.beginPath(); ctx.rect(x - w, bar, 2 * w, 3.5 * g); ctx.fill(); pen(C.ink, 1.6); ctx.stroke(); pen(C.ink, 1.1); if (!tk) for (const o of [-0.5, 0, 0.5]) line(x + o * w, bar + 3.5 * g, x + o * w, bar + 6 * g); return; }
  pen(C.ink, 1.9); line(x - w, bar, x + w, bar);
  for (const side of make === 1 ? [-1, 0, 1] : [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + side * w, bar);
    if (side === 0) ctx.lineTo(x, bar + (tk ? 3 : len * 0.8));
    else if (tk) { ctx.lineTo(x + side * w, bar + len); ctx.lineTo(x + side * (w - 4.5), bar + len); }
    else { ctx.lineTo(x + side * (w + 5), bar + len * 0.6); ctx.lineTo(x + side * (w + 1.5), bar + len); }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x + side * w, bar, 1.8, 0, TAU); ctx.fill(); pen(C.ink, 1.2); ctx.stroke(); pen(C.ink, 1.9);
  }
}
function advance(S, t, act) {
  const now = performance.now() / 1000, snap = !FX() || sim.last == null || t < sim.last - 0.001 || t - sim.last > 3;
  const dt = HOLD || snap ? 0 : Math.min(0.05, t - sim.last), wall = Math.min(0.05, Math.max(0, now - sim.clock)), ease = 1 - Math.exp(-wall * 3);
  sim.last = t; sim.clock = now;
  if (snap || sim.spots.size > 400) sim.spots.clear();
  stepParts(S, t, dt, snap);
  stepHeads(t, snap);
  stepTokens(S, t, dt, snap, act);
  // Rollers turn while the route is reviewing and coast to a stop when it is not, or when the audit is held.
  for (const a of lanes) {
    let sp = sim.spin.get(a);
    if (!sp) sim.spin.set(a, sp = { ph: 0, v: 0 });
    sp.v += ((!HOLD && FX() && segAt(a, t) >= 0 ? 1 : 0) - sp.v) * ease; sp.ph += wall * sp.v * 60;
  }
  sim.lab.v += ((!HOLD && FX() && S.phase === 2 && act >= 0 ? 1 : 0) - sim.lab.v) * ease; sim.lab.ph += wall * sim.lab.v * 60;
}

function conveyor(x0, x1, y, rr, travel) {
  const bed = y + rr * 2 + 2.4, cy = y + rr + 1.2, step = Math.max(16, rr * 6.8), ang = travel / rr;
  pen(C.ink, 1.3); line(x0, y, x1, y);
  pen(C.muted, 1, 0.55); ctx.beginPath();
  for (let x = x0 + rr + 1; x < x1 - rr; x += step) { ctx.moveTo(x + rr, cy); ctx.arc(x, cy, rr, 0, TAU); }
  ctx.stroke(); ctx.globalAlpha = 1;
  pen(C.muted, 1.1); ctx.beginPath();
  for (let x = x0 + rr + 1; x < x1 - rr; x += step) { ctx.moveTo(x - Math.cos(ang) * rr, cy - Math.sin(ang) * rr); ctx.lineTo(x + Math.cos(ang) * rr, cy + Math.sin(ang) * rr); }
  ctx.stroke();
  pen(C.muted, 1, 0.8); ctx.setLineDash([9, 5]); ctx.lineDashOffset = -(travel % 14); line(x0, bed, x1, bed); ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.globalAlpha = 1;
  return bed;
}
// One outline per conveyor, in turn, so that a part shows which line it belongs to.
function partPath(kind, s) {
  const h = s / 2;
  ctx.beginPath();
  if (kind === 0) ctx.rect(-h, -h * 0.72, s, s * 0.72 + h * 0.28);
  else if (kind === 1) { for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * h * 1.1, Math.sin(a) * h * 1.02); } ctx.closePath(); }
  else if (kind === 2) ctx.arc(0, 0, h, 0, TAU);
  else if (kind === 3) ctx.rect(-h * 0.8, -h * 0.8, s * 0.8, s * 0.9);
  else if (kind === 4) ctx.roundRect(-h * 0.72, -h, s * 0.72, s, h * 0.35);
  else { ctx.moveTo(-h, h); ctx.lineTo(-h * 0.45, -h * 0.8); ctx.lineTo(h * 0.45, -h * 0.8); ctx.lineTo(h, h); ctx.closePath(); }
}
function partDetail(kind, s) {
  const h = s / 2;
  ctx.beginPath();
  if (kind === 0) for (const sx of [-1, 1]) { ctx.moveTo(sx * h * 0.5 + h * 0.16, -h * 0.2); ctx.arc(sx * h * 0.5, -h * 0.2, h * 0.16, 0, TAU); }
  else if (kind === 1) { ctx.moveTo(h * 0.45, 0); ctx.arc(0, 0, h * 0.45, 0, TAU); }
  else if (kind === 2) for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3; ctx.moveTo(Math.cos(a) * h * 0.35, Math.sin(a) * h * 0.35); ctx.lineTo(Math.cos(a) * h * 0.7, Math.sin(a) * h * 0.7); }
  else if (kind === 3) for (const sx of [-1, 1]) for (const o of [-0.45, 0, 0.45]) { ctx.moveTo(sx * h * 0.8, o * h); ctx.lineTo(sx * h * 1.15, o * h); }
  else if (kind === 4) { ctx.moveTo(-h * 0.72, -h * 0.5); ctx.lineTo(h * 0.72, -h * 0.5); }
  else { ctx.moveTo(-h * 0.36, 0.1 * h); ctx.lineTo(h * 0.36, 0.1 * h); }
  ctx.stroke();
}

function drawFloor(S, t, pulse) {
  const { x0, x1, y0, y1 } = FL;
  pen(C.ink, 1 + pulse * 2.2); ctx.strokeRect(x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 6);
  pen(C.muted, 1); ctx.beginPath();
  for (let x = x0; x <= x1 + 0.5; x += 14) { ctx.moveTo(x, y0 - 6); ctx.lineTo(x, y0 - 6 - (Math.round((x - x0) / 14) % 4 === 0 ? 6 : 3)); }
  ctx.stroke();
  if (!lanes.length) { text("No review routes recorded yet", (x0 + x1) / 2, (y0 + y1) / 2, { align: "center", size: 11 }); return; }
  if (FL.laneH > 56 && FL.len > 360) for (const [label, f0, f1] of [["QUEUE", 0, Q0], ["INSPECTION", W0, W1], ["PASSED", P0, 1]]) {
    const a = FL.X(f0), b = FL.X(f1), y = y0 + 5, half = label.length * 2.7 + 7;
    text(label, (a + b) / 2, y, { size: 8, align: "center" });
    pen(C.hair, 1); line(a, y, (a + b) / 2 - half, y); line((a + b) / 2 + half, y, b, y); line(a, y - 2.5, a, y + 2.5); line(b, y - 2.5, b, y + 2.5);
  }
  lanes.forEach((a, k) => drawLane(a, k, S, t));
}
function drawLane(a, k, S, t) {
  const route = M.routes[a], col = routeColor(a), q = FL.q, yb = FL.beltY(k), yr = FL.railY(k), top = FL.laneTop(k), rr = clamp(3.6 * q, 1.8, 4);
  const active = segAt(a, t) >= 0, done = !active && routeEnd[a] > -Infinity && routeEnd[a] <= t, mine = laneUnits.get(a), got = mine.filter((U) => S.units[U.i].cov.has(a)).length;
  if (k > 0) { pen(C.faint, 1); line(FL.x0, top, FL.x1, top); }
  const bed = conveyor(FL.bx0 - 5, FL.bx1, yb, rr, sim.spin.get(a).ph);
  pen(C.muted, 1.2); for (const f of [Q0, W1]) { const x = FL.X(f) + 2; line(x, yb - 1, x, yb - 8 * q); line(x - 2.5, yb - 8 * q, x + 2.5, yb - 8 * q); }
  pen(C.ink, 1.3); line(FL.bx1, yb - 9 * q, FL.bx1, bed + 4 * q);
  pen(C.hair, 1); for (const f of [0.02, 0.34, 0.66, 0.98]) { const x = FL.X(f); line(x, bed, x, bed + 5 * q); }
  // The gantry frame over the inspection zone.
  const gx0 = FL.X(W0) - 7 * q, gx1 = FL.X(W1) + 7 * q;
  pen(C.muted, 1.1); line(gx0, yr, gx0, yb); line(gx1, yr, gx1, yb);
  pen(C.ink, 1.3); line(gx0 - 4, yr, gx1 + 4, yr); pen(C.hair, 1); line(gx0, yr + 3.5 * q, gx1, yr + 3.5 * q);
  pen(C.muted, 1.1); for (const [x, d] of [[gx0, 1], [gx1, -1]]) line(x, yr + 12 * q, x + d * 12 * q, yr);
  // The lane's signal lamp: dashed before the route starts, lit while it reviews, ticked when it is done.
  const lx = FL.x0 + 11 * q, lw = 8 * q, lh = 11 * q, ly = yb - 12 * q - lh;
  pen(C.muted, 1.1); line(lx, bed + 4 * q, lx, ly + lh); line(lx - 4 * q, bed + 4 * q, lx + 4 * q, bed + 4 * q);
  ctx.fillStyle = C.bg; ctx.beginPath(); ctx.roundRect(lx - lw / 2, ly, lw, lh, 2); ctx.fill();
  pen(col, 1.5, active || done ? 1 : 0.6); if (!active && !done) ctx.setLineDash([2, 3]);
  ctx.stroke(); ctx.setLineDash([]);
  if (active) { line(lx - lw / 2, ly + lh * 0.5, lx + lw / 2, ly + lh * 0.5); if (!HOLD) for (let i = 0; i < 5; i++) { const ang = -Math.PI + (i + 0.5) * Math.PI / 5, r0 = lh * 0.75, l = (3 + (FX() ? 1.5 * Math.sin(t * 5 + i * 1.7) : 0)) * q; line(lx + Math.cos(ang) * r0, ly + lh * 0.4 + Math.sin(ang) * r0, lx + Math.cos(ang) * (r0 + l), ly + lh * 0.4 + Math.sin(ang) * (r0 + l)); } }
  if (done) { ctx.beginPath(); ctx.moveTo(lx - 2.6 * q, ly + lh * 0.5); ctx.lineTo(lx - 0.6 * q, ly + lh * 0.5 + 2.2 * q); ctx.lineTo(lx + 2.8 * q, ly + lh * 0.5 - 2.4 * q); ctx.stroke(); }
  ctx.globalAlpha = 1;
  if (FL.laneH > 34) {
    const size = clamp(9.5 * q, 7.5, 10), wide = FL.len > 440;
    text(route.key, FL.x0 + 2, top + 10 * q + 1, { size, w: 600, color: col });
    text((wide ? shortName(route.skill) + "  " : "") + got + "/" + mine.length + (done ? " ✓" : ""), FL.x0 + 2 + size * 1.9, top + 10 * q + 1, { size: size - 0.5, color: active ? C.ink : C.muted });
  }
  hits.push({ rect: { x: FL.x0, y: ly - 4, w: FL.bx0 - FL.x0, h: bed - ly + 12 }, r: 30, tip: bare(route.skill) + "\n" + (active ? "reviewing" : done ? "done" : "not started") + "\n" + got + " of " + mine.length + " files reviewed" });
}
function drawParts(S, t) {
  const latest = new Map();
  for (const p of sim.parts.values()) { const tap = S.units[p.U.i].taps.get(p.a), best = latest.get(p.a); if (tap && p.zone === 1 && (!best || tap.t > best.t)) latest.set(p.a, { t: tap.t, U: p.U }); }
  for (const p of sim.parts.values()) {
    const U = p.U, a = p.a, k = laneOf.get(a), us = S.units[U.i], pos = partPos(p), col = routeColor(a), kind = kinds[k % 6], size = 0.8 + 0.2 * (vary(U.i * 53 + a * 7) % 100) / 100, s = pos.s * size, passed = us.cov.has(a), tap = us.taps.get(a), hot = tap && !passed && t - tap.t < 2.5;
    let dx = 0;
    if (FX() && tap && !passed && t - tap.t < 0.2) { const g = t - tap.t; dx = Math.sin(g * 70) * 2.2 * (1 - g / 0.2); }
    hits.push({ rect: { x: pos.x - s / 2 - 2, y: pos.y - s / 2 - 2, w: s + 4, h: s + 4 }, r: s / 2 + 2, tip: U.id.replace(/^@/, "") + "\n" + M.routes[a].key + " · " + (passed ? "reviewed · passed" : p.zone === 0 ? "in the queue" : "under inspection · " + (tap ? tap.n : 0) + (tap && tap.n === 1 ? " probe" : " probes")) });
    // A line carries one kind of part, dealt afresh for every viewing; no two parts are quite the same size.
    ctx.save(); ctx.translate(pos.x + dx, pos.y + (pos.s - s) / 2);
    partPath(kind, s); ctx.fillStyle = C.bg; ctx.fill();
    if (passed) {
      pen(col, 1.1, 0.75); ctx.setLineDash([2, 2.5]); ctx.stroke(); ctx.setLineDash([]);
      if (s >= 6) { const m = s * 0.2; pen(col, 1.3); ctx.beginPath(); ctx.moveTo(-m * 1.3, 0); ctx.lineTo(-m * 0.3, m); ctx.lineTo(m * 1.4, -m); ctx.stroke(); }
    } else {
      pen(us.reopen >= 0 ? C.sev.High : p.zone === 0 ? C.muted : C.ink, hot && t - tap.t < 0.12 ? 2.2 : 1.3); ctx.stroke();
      // Hatching spreads across the part with every probe and never covers it until the review is recorded.
      if (tap) {
        const prog = (n) => 1 - Math.exp(-n / 5), g = FX() ? smooth(clamp((t - tap.t) / 0.3, 0, 1)) : 1, P = lerp(prog(Math.max(0, tap.n - 1)), prog(tap.n), g), x0 = -s * 0.62, wide = s * 1.24, front = x0 + wide * P;
        ctx.save(); partPath(kind, s); ctx.clip();
        ctx.save(); ctx.beginPath(); ctx.rect(x0, x0, wide * P, wide); ctx.clip();
        pen(col, 1, 0.85); ctx.beginPath();
        for (let i = -wide; i < wide; i += 4.5) { ctx.moveTo(x0 + i, -x0); ctx.lineTo(x0 + i + wide, x0); }
        ctx.stroke(); ctx.restore();
        pen(col, 1.5); line(front, x0, front, -x0);
        ctx.restore(); ctx.globalAlpha = 1;
      }
      if (s >= 7) { pen(p.zone === 0 ? C.hair : C.ink, 1); partDetail(kind, s); }
    }
    ctx.restore(); ctx.globalAlpha = 1;
    const named = hot && latest.get(a).U === U;
    if (p.zone === 1 && !passed && FL.q > 0.6 && (named || (!latest.has(a) || t - latest.get(a).t > 2.5) && p.pitch * FL.len >= 66)) text(fit(U.label, named ? 130 : p.pitch * FL.len - 6, { size: 8.5 }), pos.x, FL.beltY(k) + clamp(3.6 * FL.q, 1.8, 4) * 2 + 11 * FL.q, { size: 8.5, align: "center", color: named ? C.ink : C.muted });
  }
}
function drawHeads(t) {
  lanes.forEach((a, k) => {
    const h = sim.heads.get(a), s = partSize(a), g = Math.max(FL.q, s / 19), yr = FL.railY(k), col = routeColor(a), tone = h.active ? col : C.muted, x = FL.X(h.f), tipY = lerp(yr + 17 * g, FL.beltY(k) - s - 3, h.d);
    pen(tone, 1.3); line(x - 1.6 * g, yr + 5 * g, x - 1.6 * g, tipY - 4 * g); line(x + 1.6 * g, yr + 5 * g, x + 1.6 * g, tipY - 4 * g);
    ctx.fillStyle = C.bg;
    ctx.beginPath(); ctx.rect(x - 8 * g, yr - 4 * g, 16 * g, 9 * g); ctx.fill(); pen(tone, 1.6); ctx.stroke();
    ctx.beginPath(); ctx.rect(x - 3.2 * g, yr + 5 * g, 6.4 * g, 6 * g); ctx.fill(); pen(tone, 1.3); ctx.stroke();
    // The tip of the probe is the line's own: a nozzle, a ring, a fork or a chisel.
    const tip = vary(a * 23 + 9) % 4;
    ctx.beginPath();
    if (tip === 1) ctx.arc(x, tipY - 3.4 * g, 3.4 * g, 0, TAU);
    else if (tip === 2) { ctx.moveTo(x - 3.6 * g, tipY); ctx.lineTo(x - 3.6 * g, tipY - 4.6 * g); ctx.lineTo(x + 3.6 * g, tipY - 4.6 * g); ctx.lineTo(x + 3.6 * g, tipY); }
    else if (tip === 3) { ctx.moveTo(x - 2.6 * g, tipY - 4.6 * g); ctx.lineTo(x + 2.6 * g, tipY - 4.6 * g); ctx.lineTo(x + 2.6 * g, tipY - 1.8 * g); ctx.lineTo(x - 2.6 * g, tipY); ctx.closePath(); }
    else { ctx.moveTo(x - 4.4 * g, tipY - 4.4 * g); ctx.lineTo(x + 4.4 * g, tipY - 4.4 * g); ctx.lineTo(x, tipY); ctx.closePath(); }
    if (tip !== 2) ctx.fill(); pen(tone, 1.6); ctx.stroke();
    pen(tone, 1.1); for (const sx of [-4.5, 4.5]) { ctx.beginPath(); ctx.arc(x + sx * g, yr - 4 * g, 1.7 * g, 0, TAU); ctx.fill(); ctx.stroke(); }
    line(x - 4 * g, yr + 0.5 * g, x + 4 * g, yr + 0.5 * g);
  });
  // A call that touched no file in scope still shows: a pulse at the carriage of the route that made it.
  for (let i = callsBefore(M, t) - 1; i >= 0 && t - M.CALLS[i].t < 0.5; i--) {
    const e = M.CALLS[i], k = laneOf.get(e.a);
    if (k == null || e.u >= 0) continue;
    ring(FL.X(sim.heads.get(e.a).f), FL.railY(k) + FL.q, t - e.t, 0.5, 4, 17 * FL.q, routeColor(e.a), 1.1);
  }
}
function drawFloorFx(t) {
  for (const e of recent(M, t, 1.15)) {
    if (e.type !== "tap" && e.type !== "cover" && e.type !== "reopen") continue;
    const U = M.units[e.u], p = sim.parts.get(e.a + ":" + U.id), age = t - e.t, col = routeColor(e.a), q = FL.q;
    if (!p) continue;
    // Each effect stays where its event happened, in lane coordinates, while the part it belongs to rolls on.
    let spot = sim.spots.get(e.i);
    if (!spot) sim.spots.set(e.i, spot = { f: p.f });
    const s = partSize(), x = FL.X(spot.f), y = FL.beltY(laneOf.get(e.a)) - s / 2 - 1, top = y - s / 2, box = { x: x - s / 2, y: y - s / 2, w: s, h: s };
    if (e.type === "tap") {
      streaks(x, top, age, col, e.i, 6, 0.4, 150 * q, 120); ring(x, top, age, 0.22, 2, 11, col, 1);
      if (e.n > 1) floatText("×" + e.n, x + s * 0.5 + 12, top + 6, age, 0.55, col, 9);
    } else if (e.type === "cover") {
      ring(x, y, age, 0.4, 3, 30 * q, col, 1.5); burst(x, top, age, col, e.i, e.broke ? 24 : 12, 0.6, (e.broke ? 320 : 220) * q, 140);
      if (e.broke) { echo(box, age, 0.45, C.ink, 1.4); echo(box, age - 0.07, 0.5, col, 2.2); }
      floatText(e.broke ? fit(U.label, 100, { size: 10 }) + " CLEARED" : M.routes[e.a].key + " ✓", x, top - 12 * q, age, e.broke ? 1.0 : 0.75, e.broke ? C.ink : col, e.broke ? 10 : 9.5);
    } else { echo({ x: box.x - s, y: box.y - s, w: s * 3, h: s * 3 }, age, 0.5, C.sev.High, -0.44); floatText("REOPENED", x, top - 12 * q, age, 1.1, C.sev.High, 10); }
  }
}
function drawMarks() {
  if (!locate) return;
  const age = (performance.now() - locate.at) / 1000, k = (age * 1.5) % 1, g = 5 + 14 * k;
  let found = false;
  for (const p of sim.parts.values()) {
    if (p.U.id !== locate.id) continue;
    const pos = partPos(p), s = pos.s + 8;
    found = true;
    pen(C.ink, 1.6, 1 - k); ctx.strokeRect(pos.x - s / 2 - g, pos.y - s / 2 - g, s + 2 * g, s + 2 * g); pen(C.ink, 1.8); brackets(pos.x - s / 2, pos.y - s / 2, s, s, 5); ctx.globalAlpha = 1;
  }
  if (age > 4 || !found) locate = null;
}

// One instrument per gate, hung from the station frame. It works only while the candidate in the station is the one
// under verification.
function instrument(j, x, top, room, u, busy, T, col) {
  const cy = top + room * 0.56;
  pen(col, busy ? 1.5 : 1.1);
  if (j === 0) {
    const cx = x + (busy ? Math.sin(T * 3) * u * 0.6 : 0);
    line(cx + u * 0.57, cy - u * 0.57, x + u * 1.1, top);
    ctx.beginPath(); ctx.arc(cx, cy, u * 0.8, 0, TAU); ctx.stroke(); line(cx - u * 0.35, cy, cx + u * 0.35, cy); line(cx, cy - u * 0.35, cx, cy + u * 0.35);
  } else if (j === 1) {
    const py = top + room * (0.34 + 0.52 * (busy ? Math.abs(Math.sin(T * 4)) : 0));
    line(x, top, x, py); line(x - u, py, x + u, py); line(x - u * 0.45, top + 3, x + u * 0.45, top + 3); line(x - u * 0.45, top + 6, x + u * 0.45, top + 6);
  } else if (j === 2) {
    const by = cy + u * 0.45, ang = -Math.PI / 2 + (busy ? Math.sin(T * 5) * 0.95 : -0.8);
    line(x, top, x, by - u);
    ctx.beginPath(); ctx.arc(x, by, u, Math.PI, TAU); ctx.closePath(); ctx.stroke(); line(x, by, x + Math.cos(ang) * u * 0.78, by + Math.sin(ang) * u * 0.78);
  } else if (j === 3) {
    for (const sx of [-1, 1]) { line(x + sx * u * 0.62, top, x + sx * u * 0.62, cy); ctx.beginPath(); ctx.arc(x + sx * u * 0.62, cy + 2, 2, 0, TAU); ctx.stroke(); }
    if (busy) { const rnd = Math.floor(T * 14); ctx.beginPath(); ctx.moveTo(x - u * 0.62, cy + 2); for (let i = 1; i < 5; i++) ctx.lineTo(x - u * 0.62 + u * 1.24 * i / 5, cy + 2 + Math.sin(rnd * 12.9 + i * 7.7) * u * 0.45); ctx.lineTo(x + u * 0.62, cy + 2); ctx.stroke(); }
  } else {
    const px = x + (busy ? Math.sin(T * 2.2) : -0.6) * u * 0.85;
    line(x - u, top, x - u, cy); line(x + u, top, x + u, cy); line(x - u, cy, x + u, cy);
    for (let i = 0; i <= 4; i++) { const tx = x - u + i * u / 2; line(tx, cy, tx, cy - (i % 2 ? 2.5 : 4.5)); }
    ctx.beginPath(); ctx.moveTo(px, cy + 2); ctx.lineTo(px - 3, cy + 7); ctx.lineTo(px + 3, cy + 7); ctx.closePath(); ctx.stroke();
  }
}
function drawLab(S, t, act, now) {
  const L = LB, B = L.B, on = S.phase >= 2 || t >= M.tBench, T = HOLD ? HOLD.since : t, rr = clamp(3.6 * L.q, 1.8, 4), raised = S.cands.filter((c) => c.raised >= 0);
  ctx.save(); ctx.beginPath(); ctx.rect(now.x, now.y, now.w, now.h); ctx.clip();
  text("INSPECTION LINE", B.x + 14, B.y + 18, { size: 9.5 });
  pen(C.hair, 1); line(B.x + 124, B.y + 18, B.x + B.w - 14, B.y + 18);
  if (!raised.length) text("No candidates were raised", B.x + B.w / 2, B.y + B.h / 2, { align: "center", size: 11 });
  if (L.focusH) {
    const x = B.x + 14, w = B.w - 28, y = B.y + 42;
    if (act >= 0) {
      const c = M.cands[act], cs = S.cands[act], k = cs.els.findIndex((el) => !el);
      text(fit(c.id + "  " + c.title, w, { font: DISP, w: 600, size: 14 }), x, y, { font: DISP, w: 600, size: 14, color: C.ink });
      text(fit("▸ at " + (k >= 0 ? c.els[k].label : "verdict") + (c.owner >= 0 ? " · raised by " + bare(M.routes[c.owner].skill) : "") + (c.location ? " · " + c.location : ""), w, { size: 9.5 }), x, y + 17, { size: 9.5, color: routeColor(c.owner) });
    } else if (raised.length) {
      const by = (o) => raised.filter((c) => c.out === o).length;
      text(raised.filter((c) => c.verdict >= 0).length + " of " + raised.length + " decided", x, y, { font: DISP, w: 600, size: 14, color: C.ink });
      text(fit(by("verified") + " verified · " + (by("observation") + by("residual_risk")) + " noted · " + by("false_positive") + " false positive · " + by("open") + " unverified", w, { size: 9.5 }), x, y + 17, { size: 9.5 });
    }
  }
  const bx0 = L.x0 - 6, bx1 = L.bx1, bed = conveyor(bx0, bx1, L.by, rr, sim.lab.ph), half = L.ts / 2 + 5;
  pen(C.ink, 1.3); line(bx0, L.by - 9 * L.q, bx0, bed + 4 * L.q);
  if (L.cw > 46) text("INTAKE" + (sim.over[0] ? "  +" + sim.over[0] + " more" : ""), L.x0 - 4, L.by - L.instH - 4, { size: 8.5, color: on ? C.muted : C.hair });
  // The crane rail hangs from the conveyor. The line ends in a slide that turns back under it to the pad.
  pen(C.muted, 1); for (const f of [0.02, 0.34, 0.66, 0.98]) { const x = lerp(L.rx0 - 6, L.rx1 + 6, f); line(x, bed, x, L.rail); }
  pen(C.ink, 1.3); line(L.rx0 - 10, L.rail, L.rx1 + 12, L.rail); line(L.rx0 - 10, L.rail - 4, L.rx0 - 10, L.rail + 5); line(L.rx1 + 12, L.rail - 4, L.rx1 + 12, L.rail + 5);
  pen(C.hair, 1); line(L.rx0 - 10, L.rail + 3, L.rx1 + 12, L.rail + 3);
  pen(C.ink, 1.3); ctx.beginPath(); ctx.moveTo(bx1, L.by); ctx.lineTo(L.px + half, L.padY); ctx.lineTo(L.px - half, L.padY); ctx.lineTo(L.px - half, L.padY - 6); ctx.stroke();
  pen(C.muted, 1); line(bx1, bed, L.px + half + 6, L.padY + 5); line(L.px, L.padY, L.px, L.ground); line(L.px - 9, L.ground, L.px + 9, L.ground);
  pen(C.hair, 1); line(L.x0 - 6, L.ground, L.px - half - 8, L.ground);
  STATIONS.forEach((g, j) => {
    const x = L.sx(j), top = L.by - L.instH, hw = L.hw, busy = sim.busy === j && !HOLD && S.phase === 2, col = busy ? C.ink : on ? C.muted : C.hair, room = Math.max(8, L.instH - L.ts - 9);
    pen(col, busy ? 1.6 : 1.1); ctx.beginPath(); ctx.moveTo(x - hw, L.by); ctx.lineTo(x - hw, top); ctx.lineTo(x + hw, top); ctx.lineTo(x + hw, L.by); ctx.stroke();
    pen(col, 1); line(x - hw, top + 4, x + hw, top + 4);
    if (L.cw > 46) text(STATION_LABEL[j], x, top - 8, { size: 8.5, align: "center", color: busy ? C.ink : C.muted });
    instrument(j, x, top + 4, room, clamp(Math.min(room * 0.3, hw * 0.62), 4, 24), busy && FX(), T, col);
    if (j > 0 && sim.over[j]) text("+" + sim.over[j], x - hw - 5, top + 6, { size: 8, align: "right" });
    hits.push({ rect: { x: x - hw, y: top - 12, w: hw * 2, h: L.instH + 12 }, r: 60, tip: STATION_LABEL[j] + " gate\none probe per verification call" });
  });
  // Three trucks, one per kind of verdict, each with an open-top box that the claw loads from above.
  L.bins.forEach((b, i) => {
    const n = raised.filter((c) => (i === 0 ? c.out === "verified" : i === 2 ? c.out === "false_positive" : c.out === "observation" || c.out === "residual_risk")).length;
    const tone = n ? C.ink : C.muted, floor = b.y + b.h, r = L.wheel, axle = floor + 4, cx = b.x + b.w + 4, ch = Math.min(b.h * 0.82, 48 * L.q);
    const make = vary(i * 41 + 3), ribs = 6 + make % 6;
    pen(C.faint, 1); ctx.beginPath(); for (let x = b.x + 7; x < b.x + b.w - 4; x += ribs) { ctx.moveTo(x, b.y + 15); ctx.lineTo(x, floor - 2); } ctx.stroke();
    pen(tone, 1.4); ctx.beginPath(); ctx.moveTo(b.x - 3, b.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x, floor); ctx.lineTo(b.x + b.w, floor); ctx.lineTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w + 3, b.y); ctx.stroke();
    pen(tone, 1.2); line(b.x - 3, axle, cx + b.cab + 2, axle);
    // Two makes of truck: a sloping nose, or a flat one with a square window.
    if (make & 64) {
      ctx.beginPath(); ctx.moveTo(cx, axle); ctx.lineTo(cx, floor - ch); ctx.lineTo(cx + b.cab, floor - ch); ctx.lineTo(cx + b.cab, axle); ctx.stroke();
      pen(tone, 1); ctx.strokeRect(cx + b.cab * 0.28, floor - ch * 0.86, b.cab * 0.56, ch * 0.36);
    } else {
      ctx.beginPath(); ctx.moveTo(cx, axle); ctx.lineTo(cx, floor - ch); ctx.lineTo(cx + b.cab * 0.5, floor - ch); ctx.lineTo(cx + b.cab, floor - ch * 0.48); ctx.lineTo(cx + b.cab, axle); ctx.stroke();
      pen(tone, 1); ctx.beginPath(); ctx.moveTo(cx + b.cab * 0.5, floor - ch); ctx.lineTo(cx + b.cab * 0.5, floor - ch * 0.48); ctx.lineTo(cx + b.cab, floor - ch * 0.48); ctx.stroke();
    }
    ctx.fillStyle = C.bg;
    for (const wx of [b.x + r + 5, b.x + r * 3.3 + 5, cx + b.cab * 0.55]) { pen(tone, 1.3); ctx.beginPath(); ctx.arc(wx, axle + r, r, 0, TAU); ctx.fill(); ctx.stroke(); pen(tone, 1); ctx.beginPath(); ctx.arc(wx, axle + r, r * 0.34, 0, TAU); ctx.stroke(); }
    text(fit(BINS[i] + (n ? "  " + n : ""), b.w - 12, { size: 8.5 }), b.x + 7, b.y + 8, { size: 8.5, color: tone });
    if (sim.binOver[i]) text("+" + sim.binOver[i], b.x + b.w - 6, b.y + 8, { size: 8, align: "right" });
    hits.push({ rect: { x: b.x, y: b.y, w: b.w + b.cab + 4, h: b.h + r * 2 + 5 }, r: 400, tip: BINS[i].toLowerCase() + "\n" + n + " " + BIN_TIP[i] });
  });
  ctx.restore();
}
function tokenTip(c, cs, S, active) {
  const status = cs.verdict >= 0 ? (cs.out === "verified" ? cs.sev || "verified" : OUT_LABEL[cs.out]).toLowerCase() : active ? "under verification" : S.phase >= 2 ? "queued" : "awaiting verification";
  return c.id + " · " + c.title + (c.owner >= 0 ? "\nraised by " + bare(M.routes[c.owner].skill) : "") + (c.location ? "\n" + c.location : "") + "\n" + c.els.map((e, k) => e.label + " " + (!cs.els[k] ? "·" : cs.els[k].pass === true ? "✓" : cs.els[k].pass === false ? "✗" : "?")).join("  ") + "\n" + status;
}
function drawToken(c, cs, tk, S, t, active) {
  if (tk.hidden) return;
  const x = tk.x, y = tk.y, born = t - cs.raised, sz = tk.size * (FX() ? backOut(clamp(born / 0.3, 0, 1)) : 1), h = sz / 2, col = routeColor(c.owner), decided = cs.verdict >= 0, age = t - cs.verdict;
  hits.push({ rect: { x: x - h - 3, y: y - h - 3, w: sz + 6, h: sz + 6 }, r: h, tip: tokenTip(c, cs, S, active) });
  const crate = () => { ctx.beginPath(); ctx.roundRect(x - h, y - h, sz, sz, Math.min(3, sz * 0.2)); };
  // The verdict is announced where the crate stood when it was decided, not along its way to the truck.
  const spot = tk.spot ? { x: rectOf(tk.spot.sp).x + tk.spot.nx * rectOf(tk.spot.sp).w, y: rectOf(tk.spot.sp).y + tk.spot.ny * rectOf(tk.spot.sp).h } : { x, y };
  if (decided && cs.out === "false_positive") {
    streaks(spot.x, spot.y, age, C.muted, c.i + 900, 16, 0.6, 230, 160); ring(spot.x, spot.y, age, 0.45, 4, 40, C.muted, 1.3);
    floatText(c.id + " · " + OUT_LABEL[cs.out], spot.x, spot.y - h - 8, age, 1.4, C.muted, 10.5);
    crate(); ctx.fillStyle = C.bg; ctx.fill(); pen(C.muted, 1.1, 0.85); ctx.setLineDash([1.5, 2.5]); ctx.stroke(); ctx.setLineDash([]); line(x - h * 0.6, y + h * 0.6, x + h * 0.6, y - h * 0.6); ctx.globalAlpha = 1;
    return;
  }
  const lit = decided && cs.out === "verified", noted = decided && (cs.out === "observation" || cs.out === "residual_risk"), open = decided && cs.out === "open", vcol = lit ? C.sev[cs.sev] || C.ink : noted ? C.sev.note : col;
  if (active && !decided) { pen(col, 1.4); brackets(x - h - 5, y - h - 5, sz + 10, sz + 10, 5); }
  crate(); ctx.fillStyle = C.bg; ctx.fill(); pen(vcol, lit ? 1.9 : 1.4); if (open) ctx.setLineDash([3, 3]);
  ctx.stroke(); ctx.setLineDash([]);
  // how a crate is packed is its own: plain, strapped, or with corner pieces
  const pack = sz >= 14 ? vary(c.i * 43 + 2) % 3 : 0;
  pen(vcol, 1, 0.6);
  if (pack === 1) { line(x - h * 0.55, y - h, x - h * 0.55, y + h); line(x + h * 0.55, y - h, x + h * 0.55, y + h); }
  else if (pack === 2) for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(x + sx * h, y + sy * (h - 4)); ctx.lineTo(x + sx * (h - 4), y + sy * (h - 4)); ctx.lineTo(x + sx * (h - 4), y + sy * h); ctx.stroke(); }
  ctx.globalAlpha = 1;
  if (lit) { pen(vcol, 1); ctx.strokeRect(x - h - 2.5, y - h - 2.5, sz + 5, sz + 5); }
  const marks = !lit && !noted && sz >= 12;
  if (sz >= 8) text(lit ? (cs.sev || "V")[0] : noted ? "i" : open ? "?" : "!", x, y + (marks ? -1.5 : 0.5), { align: "center", size: sz * (marks ? 0.56 : 0.64), w: 600, color: lit || noted ? vcol : C.ink });
  if (!lit && !noted) {
    // One dash per gate along the foot of the crate.
    const n = c.els.length, pw = (sz - 5) / n, py = y + h - 3.2;
    c.els.forEach((el, k) => {
      const s = cs.els[k];
      if (marks) { pen(!s ? C.hair : s.pass === true ? col : s.pass === false ? C.sev.Critical : C.muted, s ? 2 : 1.2); line(x - h + 2.5 + k * pw + 0.8, py, x - h + 2.5 + (k + 1) * pw - 0.8, py); }
      if (!s || s.pass === null) return;
      const ga = t - s.t;
      ring(x, y, ga, 0.5, h + 3, h + 30, s.pass ? col : C.sev.Critical, 1.5); floatText(el.label + (s.pass ? " ✓" : " ✗"), x, y - h - 12, ga, 0.9, s.pass ? col : C.sev.Critical, 10);
      if (!s.pass) streaks(x, y, ga, C.sev.Critical, c.i * 13 + k, 12, 0.45, 190, 60);
    });
  }
  if (tk.label && born > 1.1) text(fit(c.id, sz + 12, { size: 8 }), x, y + h + 7.5, { align: "center", size: 8, color: lit ? vcol : C.muted });
  ring(x, y, born, 0.4, 3, 28, col, 1.3);
  floatText(fit(c.id, 90, { size: 10.5 }) + " raised", x, y - h - 10, born, 1.1, col, 10.5);
  if (lit) { burst(spot.x, spot.y, age, vcol, c.i + 700, 28, 0.8, 340, 100); ring(spot.x, spot.y, age, 0.55, 8, 90, vcol, 1.7); ring(spot.x, spot.y, age - 0.09, 0.55, 8, 56, C.ink, 1); floatText(c.id + " · " + (cs.sev || "verified").toUpperCase(), spot.x - 20, spot.y - h - 16, age, 1.5, vcol, 13); }
  else if (noted) { ring(spot.x, spot.y, age, 0.45, 5, 38, vcol, 1.2); floatText(c.id + " · " + OUT_LABEL[cs.out], spot.x - 20, spot.y - h - 10, age, 1.4, vcol, 10); }
  ctx.globalAlpha = 1;
}
function drawTokens(S, t, act) {
  M.cands.forEach((c, ci) => { const tk = sim.tokens.get(c.raw.id); if (tk) drawToken(c, S.cands[ci], tk, S, t, act === ci); });
  // A verification call is one probe from the station onto the crate that stands in it.
  const tk = act >= 0 ? sim.tokens.get(M.cands[act].raw.id) : null;
  if (!tk || !tk.station || !FX()) return;
  for (let i = callsBefore(M, t) - 1; i >= 0 && t - M.CALLS[i].t < 0.35; i--) {
    if (M.CALLS[i].a !== VERIFY_SIDE) continue;
    const age = t - M.CALLS[i].t, top = LB.by - LB.instH;
    pen(C.ink, 1.6, 1 - age / 0.35); line(tk.x, top + 4, tk.x, tk.y - tk.size / 2 - 6); ctx.globalAlpha = 1;
    ring(tk.x, tk.y, age, 0.35, tk.size / 2, tk.size / 2 + 14, C.ink, 1.2); streaks(tk.x, tk.y - tk.size / 2, age, C.ink, i, 6, 0.35, 140, 80);
  }
}

// The signal tower beside the phase name: top lamp while the audit waits for the user, middle while it runs, bottom
// while no session is running.
function drawHud(S, t) {
  const y = FL.R.y + 18, label = PHASE_LABEL[S.phase].toUpperCase(), total = M.units.length, cleared = S.units.filter((u) => u.broken >= 0).length, calls = callsBefore(M, t), wide = FL.x1 - FL.x0 > 420;
  text(label, FL.x0 - 6, y, { font: DISP, w: 600, size: 15, color: S.regress ? C.sev.High : C.ink });
  ctx.font = "600 15px " + DISP;
  const gx = FL.x0 + 12 + ctx.measureText(label).width, lit = HOLD ? (HOLD.mode === "wait" ? 0 : 2) : S.phase >= 5 ? 2 : 1, tone = [C.sev.High, C.ink, C.muted][lit];
  for (let i = 0; i < 3; i++) {
    const cy = y - 8 + i * 8;
    pen(i === lit ? tone : C.muted, i === lit ? 1.8 : 1, i === lit ? 1 : 0.7); ctx.strokeRect(gx, cy - 3.5, 14, 7);
    if (i === lit) { line(gx + 3, cy - 1, gx + 11, cy - 1); line(gx + 3, cy + 1, gx + 11, cy + 1); }
  }
  ctx.globalAlpha = 1;
  if (lit === 0 && FX()) for (const shift of [0, 0.5]) { const k = (t / 1.6 + shift) % 1; pen(tone, 1.2, 1 - k); ctx.beginPath(); ctx.arc(gx + 7, y - 8, 9 + 12 * k, 0, TAU); ctx.stroke(); }
  if (lit === 1 && FX()) for (const side of [-1, 1]) for (const o of [-2.5, 0, 2.5]) { const l = 3 + 1.4 * Math.sin(t * 5 + side + o); pen(tone, 1.1); line(gx + 7 + side * 10.5, y + o, gx + 7 + side * (10.5 + l), y + o * 1.6); }
  ctx.globalAlpha = 1;
  if (HOLD && wide) text(HOLD.mode === "wait" ? "LINE STOPPED · WAITING FOR THE USER" : "LINE STOPPED · NO SESSION RUNNING", gx + 30, y, { size: 9.5, color: tone });
  // A call made outside every route, by the flow itself, pulses at the tower.
  for (let i = calls - 1; i >= 0 && t - M.CALLS[i].t < 0.5; i--) if (M.CALLS[i].a === FLOW_SIDE) ring(gx + 7, y, t - M.CALLS[i].t, 0.5, 8, 20, C.ink, 1);
  text((wide && calls ? calls + " CALLS · " : "") + String(cleared).padStart(2, "0") + " / " + total + (wide ? " CLEARED" : ""), FL.x1 + 6, y, { align: "right", size: 10.5, color: C.ink });
}
function drawLegend() {
  if (!FL.legend) return;
  const y = FL.y1 - 11, mark = [
    (x) => { ctx.beginPath(); ctx.moveTo(x + 3, y - 4.5); ctx.lineTo(x + 10, y - 4.5); ctx.lineTo(x + 6.5, y + 1); ctx.closePath(); ctx.stroke(); line(x + 6.5, y - 8, x + 6.5, y - 4.5); },
    (x) => { ctx.strokeRect(x + 2.5, y - 4, 8, 8); },
    (x) => { ctx.beginPath(); ctx.roundRect(x + 2, y - 4.5, 9, 9, 2); ctx.stroke(); line(x + 6.5, y - 2, x + 6.5, y + 1); },
    (x) => { ctx.beginPath(); ctx.moveTo(x + 2, y + 4.5); ctx.lineTo(x + 2, y - 4.5); ctx.lineTo(x + 11, y - 4.5); ctx.lineTo(x + 11, y + 4.5); ctx.stroke(); },
  ];
  let x = FL.x0 + 2;
  ["PROBE = ONE TOOL CALL", "PART = FILE IN SCOPE", "TAGGED CRATE = CANDIDATE FINDING", "STATION = VERIFICATION GATE"].forEach((label, i) => {
    pen(C.muted, 1.2); mark[i](x);
    text(label, x + 17, y + 0.5, { size: 8.5 });
    x += 34 + label.length * 5.2;
  });
}

export function draw(S, t) {
  hits.length = 0;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  if (!M || !S) { text("No session recorded for this engagement", W / 2, H / 2, { align: "center", size: 11 }); return { p2: 0, find: { x: 0, y: H, w: W, h: 0 } }; }
  const p1 = progress(t, M.tBench), p2 = progress(t, M.tResults), Rg = regions(p1, p2), rest = regions(1, p2).lab, sh = shakeAt(M, t), act = activeCandidate(M, S);
  const stale = M.hooked && M.session.phase !== "closed" && t - M.lastActivity > STALE;
  HOLD = S.hold ? { mode: S.hold, since: S.holdAt } : stale ? { mode: "pause", since: M.lastActivity + STALE } : null;
  floorLayout(Rg.floor);
  // The inspection line is laid out at its full size and slides in from the edge the floor gives up.
  labLayout({ x: Rg.lab.x, y: Rg.lab.y, w: rest.w, h: rest.h });
  advance(S, t, act);
  ctx.save(); ctx.translate(sh.x, sh.y);
  drawFloor(S, t, sh.pulse);
  if (lanes.length) { drawParts(S, t); drawMarks(); drawHeads(t); drawFloorFx(t); }
  if (Rg.lab.w > 4 && Rg.lab.h > 4) drawLab(S, t, act, Rg.lab);
  drawTokens(S, t, act);
  if (Rg.lab.w > 4 && Rg.lab.h > 4) drawClaw();
  if (HOLD) { ctx.fillStyle = C.bg; ctx.globalAlpha = 0.5 * (FX() ? clamp((t - HOLD.since) / 0.4, 0, 1) : 1); ctx.fillRect(-20, -20, W + 40, Rg.find.y + 20); ctx.globalAlpha = 1; }
  drawHud(S, t);
  drawLegend();
  ctx.restore();
  drawBanner(M, t, Rg.floor);
  return { p2, find: Rg.find };
}
