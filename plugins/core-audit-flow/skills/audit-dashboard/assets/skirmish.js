import { PHASE_LABEL, OUT_LABEL, VERIFY_SIDE, mulberry, recent, segmentAt, activeCandidate, callsBefore, bare } from "./model.js";
import { ctx, C, W, H, DISP, TOP_H, NARROW, STALE, lerp, clamp, backOut, progress, FX, setLineScale, hits, text, fit, pen, line, brackets, streaks, ring, echo, lineShards, rectEdges, floatText, shakeAt, drawBanner, vary } from "./kit.js";

// Two bases and one lane per domain auditor. What happens is fixed by the record: a unit exists because a tool call
// was logged, and a tower falls, a hero dies or a finding enters the far base only when session.json says so. How
// units move is simulated and unseeded, so no two views of the same audit draw the same paths.
const AHEAD = 1.4, MAX_UNITS = 220, TAU = Math.PI * 2, GATES = ["claim", "trigger", "impact", "poc", "severity"], GATE_LABEL = ["CLAIM", "TRIGGER", "IMPACT", "POC", "SEVERITY"];
const rnd = mulberry((Math.random() * 0x100000000) >>> 0);
const pick = (list) => list[Math.floor(rnd() * list.length)];
// One kind of unit per lane, in turn: how its single strike is drawn, how far from the tower it stops, and how long
// the strike takes to land. The outline that goes with each is in unitPath().
const KINDS = [
  { strike: "slash", reach: [8, 14], flight: 0.1, icon: "M6 0L-4 3.8L-1.8 0L-4 -3.8Z" },
  { strike: "arrow", reach: [44, 66], flight: 0.26, icon: "M-6 0H6M2 -3.6L6 0L2 3.6M-6.5 -2.6L-4 0L-6.5 2.6" },
  { strike: "bolt", reach: [32, 52], flight: 0.08, icon: "M5.4 0L0 4.2L-5.4 0L0 -4.2ZM1.5 0A1.5 1.5 0 1 1 -1.5 0A1.5 1.5 0 1 1 1.5 0" },
  { strike: "shell", reach: [54, 80], flight: 0.42, icon: "M-5 -3.6H3V3.6H-5ZM3 0H8.4" },
  { strike: "burst", reach: [20, 32], flight: 0.18, icon: "M4.6 -3.3L-3.6 -0.8V-5.8ZM4.6 3.3L-3.6 5.8V0.8Z" },
  { strike: "pierce", reach: [12, 20], flight: 0.1, icon: "M9.5 0L-3 2.3L-6.5 0L-3 -2.3Z" },
];

let M = null, G = null, F = null, NOW = null, HOLD = null, locate = null;
let lanes = [], laneOf = new Map(), laneUnits = new Map(), slotOf = new Map(), contact = new Map(), unitIndex = new Map(), candIndex = new Map(), routeEnd = [];
const sim = { units: [], shots: [], beams: [], heroes: new Map(), pulses: [], nextCall: 0, last: null, size: "" };

export function setModel(model) {
  if (!model) sim.last = null;
  M = model;
  if (!M) return;
  unitIndex = new Map(M.units.map((U) => [U.id, U.i]));
  candIndex = new Map(M.cands.map((c) => [c.raw.id, c.i]));
  routeEnd = M.routes.map(() => -Infinity);
  contact = new Map();
  for (const e of M.EV) {
    if (e.type === "end") routeEnd[e.a] = Math.max(routeEnd[e.a], e.t);
    else if ((e.type === "tap" || e.type === "cover") && !contact.has(e.a + ":" + e.u)) contact.set(e.a + ":" + e.u, e.t);
  }
  // By the draw of this viewing: which auditor takes which lane, and which kind of unit each lane sends.
  const deal = (list, seed) => { const rng = mulberry(vary(seed)), out = list.slice(); for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };
  lanes = deal(M.routes.filter((r) => r.wall).map((r) => r.i), 4241);
  kinds = deal(KINDS.map((k, i) => i), 911);
  laneOf = new Map(lanes.map((a, k) => [a, k]));
  laneUnits = new Map(); slotOf = new Map();
  for (const a of lanes) {
    // Towers stand in the order the route first touched their files, so the lane is pushed from left to right.
    const met = (U) => contact.get(a + ":" + U.i) ?? Infinity, list = M.units.filter((U) => U.req.includes(a)).sort((p, q) => (met(p) === met(q) ? p.i - q.i : met(p) - met(q)));
    laneUnits.set(a, list);
    list.forEach((U, i) => slotOf.set(a + ":" + U.id, { i, m: list.length }));
  }
}
export function locateUnit(u) { locate = { id: M.units[u].id, at: performance.now() }; }
// The outline of the unit that the route's lane sends, as an SVG path, for the scoreboard.
let kinds = KINDS.map((k, i) => i);
const kindOf = (k) => KINDS[kinds[k % KINDS.length]];
export function laneIcon(a) { const k = laneOf.get(a); return k == null ? "" : kindOf(k).icon; }

const routeColor = (a) => (a >= 0 && M.routes[a].color >= 0 ? C.route[M.routes[a].color] : C.ink);
const shortName = (skill) => bare(skill).replace(/-(auditor|checker)$/, "");

function frameOf(R) {
  const pad = lerp(14, 22, clamp((R.w - 320) / 600, 0, 1)), x0 = R.x + pad, x1 = R.x + R.w - pad, y0 = R.y + 40, y1 = R.y + R.h - 10, legend = R.h > 300 && R.w > 760 ? 18 : 0;
  return { R, x0, x1, y0, y1, legend, z: { x: x0 + 2, y: y0 + 4, w: Math.max(40, x1 - x0 - 4), h: Math.max(40, y1 - y0 - 8 - legend) } };
}
function layout(p1) {
  const z = frameOf({ x: 0, y: 0, w: W, h: H }).z, n = Math.max(1, lanes.length), laneH = Math.min(z.h / n, 150), ls = clamp(laneH / 118, 0.5, 1.12), baseW = clamp(z.w * 0.075, 40, 84), x0 = baseW + 14, x1 = z.w - baseW - 14;
  const t0 = x0 + 40 * ls, t1 = lerp(x1 - 26, x0 + (x1 - x0) * 0.46, p1), top = (z.h - laneH * n) / 2;
  F = { VW: z.w, VH: z.h, n, laneH, ls, baseW, x0, x1, t0, t1, v0: t1 + 30 * ls, v1: x1 - 22 * ls, top, laneY: (k) => top + (k + 0.5) * laneH };
  F.gateX = (j) => lerp(F.v0, F.v1, (j + 0.7) / 5);
  F.turret = { x: z.w - baseW, y: top + Math.max(1, Math.round(n / 2)) * laneH };
}
function geometry(R) {
  const fr = frameOf(R), z = fr.z, ss = Math.min(1, z.w / F.VW, z.h / F.VH);
  G = { ...fr, ss, q: 0.6 + 0.4 * ss, x: (v) => z.x + v / F.VW * z.w, y: (v) => z.y + v / F.VH * z.h };
}
const at = (p) => ({ x: G.x(p.x), y: G.y(p.y) });
// The turret shrinks with the lanes when the field is squeezed, so it never reaches into the lanes beside it.
const turretScale = () => F.ls * Math.min(G.q, G.z.h / F.VH * 1.15);
const crystal = () => { const b = at(F.turret); return { x: b.x, y: b.y - 27 * turretScale() }; };
function tower(a, id) {
  const s = slotOf.get(a + ":" + id), k = laneOf.get(a);
  if (!s || k == null) return null;
  // A tower stands near its mark, not on it: a little along the lane, to one side of it or the other, taller or shorter.
  const pitch = (F.t1 - F.t0) / s.m, w = clamp(pitch * 0.46, 5, 22 * F.ls), h = vary((unitIndex.get(id) || 0) * 61 + a * 17), loose = w >= 9;
  return { x: F.t0 + (s.i + 0.5) * pitch + (loose ? ((h % 100) / 100 - 0.5) * pitch * 0.34 : 0), y: F.laneY(k) + (loose ? (s.i % 2 ? 1 : -1) * F.laneH * (0.04 + ((h >> 8) % 100) / 100 * 0.09) : 0), w, h: Math.min(w * 1.4, 30 * F.ls) * (loose ? 0.85 + ((h >> 16) % 100) / 100 * 0.35 : 1), pitch };
}
function frontX(a) {
  for (const U of laneUnits.get(a) || []) if (!NOW.units[U.i].cov.has(a)) { const T = tower(a, U.id); return T.x - T.w / 2; }
  return F.t1;
}
const pending = (a, id, t) => sim.units.reduce((n, u) => n + (u.side === a && u.uid === id && u.et <= t && (u.mode === "march" || (u.mode === "struck" && t < u.landAt)) ? 1 : 0), 0);

function chooseCandidate(e) {
  const open = [];
  M.cands.forEach((c, ci) => { if (NOW.cands[ci].raised >= 0 && NOW.cands[ci].verdict < 0 && sim.heroes.has(c.raw.id)) open.push(ci); });
  if (!open.length) return null;
  const same = e.near >= 0 ? open.filter((ci) => M.cands[ci].unit === e.near) : [], act = activeCandidate(M, NOW);
  return M.cands[same.length ? pick(same) : open.includes(act) && rnd() < 0.75 ? act : pick(open)].raw.id;
}
function spawn(e, t) {
  const seed = Math.floor(rnd() * 1e6);
  if (e.a === VERIFY_SIDE) {
    // A verification call is one beam from the turret, landing at the moment the call was recorded.
    const cid = chooseCandidate(e);
    if (cid == null) sim.pulses.push({ x: F.turret.x, y: F.turret.y - 27 * F.ls, t: e.t });
    else sim.beams.push({ cid, fire: Math.max(e.t, t + 0.05), failed: e.failed, seed });
    return;
  }
  if (!laneOf.has(e.a)) return;
  const k = laneOf.get(e.a), kind = kindOf(k);
  sim.units.push({ side: e.a, k, kind, size: 0.8 + rnd() * 0.45, failed: e.failed, et: e.t, uid: e.u >= 0 ? M.units[e.u].id : null, mode: "march", born: t, speed: 0,
    x: F.x0 - 8, y: F.laneY(k) + (rnd() - 0.5) * F.laneH * 0.3, vx: 110, vy: (rnd() - 0.5) * 90, hd: 0,
    off: (rnd() - 0.5) * F.laneH * 0.38, ang: Math.PI + (rnd() - 0.5) * 2.5, reach: lerp(kind.reach[0], kind.reach[1], rnd()) * F.ls, failAt: 34 + rnd() * 50, wa: rnd() * TAU, wr: 0.5 + rnd(), sx: 0, sy: 0,
    struckAt: -1, landAt: Infinity, boltAt: Infinity, dieAt: Infinity, bolted: false, endAt: -1, seed });
}
function mark(u) {
  if (u.uid != null) { const T = tower(u.side, u.uid); return T ? { x: T.x, y: T.y, r: T.w / 2 + Math.min(u.reach, T.pitch * 0.7) } : null; }
  return { x: frontX(u.side) - 16, y: F.laneY(u.k) + u.off * 0.7, r: 0 };
}
function spent(u, S) {
  const ui = u.uid == null ? null : unitIndex.get(u.uid);
  return u.uid != null && (ui == null || S.units[ui].cov.has(u.side));
}
function stepUnits(S, t, dt) {
  const units = sim.units;
  for (const u of units) { u.sx = 0; u.sy = 0; }
  for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
    const p = units[i], q = units[j], dx = p.x - q.x, dy = p.y - q.y;
    if (p.endAt >= 0 || q.endAt >= 0 || Math.abs(dx) > 15 || Math.abs(dy) > 15) continue;
    const d = Math.hypot(dx, dy) || 0.01;
    if (d >= 15) continue;
    const f = (15 - d) / 15 * 160 / d;
    p.sx += dx * f; p.sy += dy * f; q.sx -= dx * f; q.sy -= dy * f;
  }
  for (const u of units) {
    if (u.endAt >= 0) continue;
    const m = mark(u);
    if (!m || (u.mode === "march" && spent(u, S))) { u.mode = "fade"; u.endAt = t; continue; }
    const px = m.x + Math.cos(u.ang) * m.r, py = m.y + Math.sin(u.ang) * m.r * 0.9, dx = px - u.x, dy = py - u.y, d = Math.hypot(dx, dy) || 0.01;
    if (!u.speed) u.speed = Math.max(90, d / Math.max(u.et - t + 0.1, clamp(d / 210, 1, 2.8)));
    if (u.mode === "march") {
      const ty = d > 90 ? F.laneY(u.k) + u.off - u.y : dy, len = Math.hypot(dx, ty) || 0.01, k = 1 - Math.exp(-dt * 6);
      u.wa += (rnd() - 0.5) * u.wr * 16 * dt;
      u.vx += (dx / len * u.speed + Math.cos(u.wa) * u.speed * 0.22 + u.sx - u.vx) * k;
      u.vy += (ty / len * u.speed + Math.sin(u.wa) * u.speed * 0.26 + u.sy - u.vy) * k;
      u.x += u.vx * dt; u.y = clamp(u.y + u.vy * dt, F.laneY(u.k) - F.laneH * 0.46, F.laneY(u.k) + F.laneH * 0.46);
      u.hd = Math.atan2(u.vy, u.vx);
      if (u.failed && d < u.failAt) { u.mode = "struck"; u.boltAt = t; u.dieAt = t + 0.14; }
      else if (d < 8 || t > u.born + 5) {
        if (u.uid == null) { sim.pulses.push({ x: u.x, y: u.y, t, a: u.side }); u.mode = "fade"; u.endAt = t; continue; }
        u.mode = "struck"; u.struckAt = t; u.landAt = t + u.kind.flight; u.boltAt = u.landAt + 0.2 + rnd() * 0.8; u.dieAt = u.boltAt + 0.13;
        sim.shots.push({ kind: u.kind.strike, x0: u.x, y0: u.y, x1: m.x, y1: m.y, t0: t, t1: u.landAt, side: u.side, seed: u.seed });
      }
    } else {
      u.x += (u.sx * 0.2 + Math.cos(u.wa) * 6) * dt; u.y += (u.sy * 0.2 + Math.sin(u.wa) * 6) * dt;
      u.hd = Math.atan2(m.y - u.y, m.x - u.x);
    }
    if (t >= u.boltAt && !u.bolted) { u.bolted = true; sim.shots.push({ kind: "tracer", x0: m.x, y0: m.y, x1: u.x, y1: u.y, t0: t, t1: u.dieAt, side: VERIFY_SIDE, seed: u.seed + 1 }); }
    if (t >= u.dieAt) { u.mode = "dead"; u.endAt = t; }
  }
  sim.units = units.filter((u) => u.endAt < 0 || t - u.endAt < (u.mode === "dead" ? 0.8 : 0.45));
  if (sim.units.length > MAX_UNITS) sim.units.splice(0, sim.units.length - MAX_UNITS);
}

const gateOf = (el) => (el.kind === "poc" ? 3 : Math.max(0, GATES.indexOf(el.gate)));
function heroLane(c) {
  if (laneOf.has(c.owner)) return laneOf.get(c.owner);
  const via = c.unit >= 0 ? M.units[c.unit].req.find((a) => laneOf.has(a)) : null;
  return via == null ? 0 : laneOf.get(via);
}
function heroGoal(c, cs, h, S, t) {
  const y = F.laneY(h.k), mates = M.cands.filter((x) => heroLane(x) === h.k), row = mates.indexOf(c);
  if (cs.out === "verified") {
    const won = mates.filter((x) => S.cands[x.i].out === "verified").sort((p, q) => S.cands[p.i].verdict - S.cands[q.i].verdict || p.i - q.i), j = won.indexOf(c), room = F.baseW * 0.84 / won.length;
    if (h.x < F.x1 - 4 && Math.abs(h.y - y) > 8) return { x: F.x1 - 10, y };
    return { x: F.VW - F.baseW * 0.92 + (j + 0.5) * room, y, fit: clamp(room / (30 * F.ls), 0.45, 1) };
  }
  const lineUp = { x: -Math.floor(row / 3) * 22 * F.ls, y: ((row % 3) - 1) * F.laneH * 0.21 };
  if (!(S.phase >= 2 || t >= M.tBench || cs.verdict >= 0 || cs.els.some(Boolean))) {
    const a = lanes[h.k], T = c.unit >= 0 && a != null ? tower(a, M.units[c.unit].id) : null, same = mates.filter((x) => x.unit === c.unit);
    return { x: (T ? T.x : F.x0 + 30) + same.indexOf(c) * 18 * F.ls, y: y - F.laneH * 0.3 };
  }
  const next = cs.els.findIndex((x) => !(x && x.pass === true));
  return { x: (next < 0 ? F.v1 : F.gateX(gateOf(c.els[next])) - 15 * F.ls) + lineUp.x, y: y + lineUp.y };
}
function syncHeroes(S, t, dt) {
  for (const id of [...sim.heroes.keys()]) { const ci = candIndex.get(id); if (ci == null || S.cands[ci].raised < 0) sim.heroes.delete(id); }
  const live = [];
  M.cands.forEach((c, ci) => {
    const cs = S.cands[ci], id = c.raw.id;
    if (cs.raised < 0) return;
    let h = sim.heroes.get(id);
    if (!h) {
      h = { k: heroLane(c), x: Infinity, y: 0, vx: 0, vy: 0, sx: 0, sy: 0, fit: 1, wa: rnd() * TAU };
      const p = heroGoal(c, cs, h, S, FX() && t - cs.raised < 1.2 ? -Infinity : t);
      h.x = p.x; h.y = p.y;
      sim.heroes.set(id, h);
    }
    h.goal = heroGoal(c, cs, h, S, t);
    h.out = cs.out; h.sx = 0; h.sy = 0; h.fit = h.goal.fit || 1;
    if (!FX()) { h.x = h.goal.x; h.y = h.goal.y; }
    else if (cs.verdict < 0 || cs.out === "verified") live.push(h);
  });
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const p = live[i], q = live[j], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 0.01, min = 26 * F.ls;
    if (d >= min) continue;
    const f = (min - d) / min * 70 / d;
    p.sx += dx * f; p.sy += dy * f; q.sx -= dx * f; q.sy -= dy * f;
  }
  for (const h of live) {
    const dx = h.goal.x - h.x, dy = h.goal.y - h.y, d = Math.hypot(dx, dy) || 0.01, top = h.out === "verified" ? 300 : 130, slow = Math.min(1, d / 30), k = 1 - Math.exp(-dt * 3.5);
    h.wa += (rnd() - 0.5) * 9 * dt;
    h.vx += (dx / d * top * slow + Math.cos(h.wa) * 7 + h.sx - h.vx) * k;
    h.vy += (dy / d * top * slow + Math.sin(h.wa) * 7 + h.sy - h.vy) * k;
    h.x += h.vx * dt; h.y += h.vy * dt;
  }
}
function advance(S, t) {
  const calls = M.CALLS, size = W + "x" + H;
  if (sim.last == null || size !== sim.size || t < sim.last - 0.001 || t - sim.last > 3 || sim.nextCall > calls.length) {
    sim.units = []; sim.shots = []; sim.beams = []; sim.pulses = []; sim.heroes.clear();
    sim.nextCall = callsBefore(M, t - 0.2); sim.size = size;
  }
  const dt = HOLD || !FX() ? 0 : Math.min(0.05, Math.max(0, t - (sim.last ?? t)));
  sim.last = t;
  syncHeroes(S, t, dt);
  if (!FX()) { sim.units = []; sim.shots = []; sim.beams = []; sim.pulses = []; sim.nextCall = calls.length; return; }
  for (; sim.nextCall < calls.length && calls[sim.nextCall].t <= t + AHEAD; sim.nextCall++) if (calls[sim.nextCall].t >= t - 0.2) spawn(calls[sim.nextCall], t);
  if (dt > 0) stepUnits(S, t, dt);
  sim.shots = sim.shots.filter((s) => t < s.t1 + 0.5);
  sim.beams = sim.beams.filter((b) => t < b.fire + 0.5);
  sim.pulses = sim.pulses.filter((p) => t < p.t + 0.7);
}

function pennant(x, y, col, age, alpha, s) {
  const up = 11 * s * (FX() ? backOut(clamp(age / 0.35, 0, 1)) : 1);
  if (up <= 0.5) return;
  pen(col, 1.4, alpha); line(x, y, x, y - up);
  ctx.beginPath(); ctx.moveTo(x, y - up); ctx.lineTo(x + 7 * s, y - up + 2.8 * s); ctx.lineTo(x, y - up + 5.6 * s); ctx.stroke();
}
function drawGround(pulse) {
  const { x0, x1, y0, y1 } = G;
  pen(C.ink, 1 + pulse * 2.2); ctx.strokeRect(x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 6);
  pen(C.muted, 1); ctx.beginPath();
  for (let x = x0; x <= x1 + 0.5; x += 14) { ctx.moveTo(x, y0 - 6); ctx.lineTo(x, y0 - 6 - (Math.round((x - x0) / 14) % 4 === 0 ? 6 : 3)); }
  ctx.stroke();
  if (!lanes.length) { text("No review routes recorded yet", (x0 + x1) / 2, (y0 + y1) / 2, { align: "center", size: 11 }); return; }
  // Scenery, set out afresh for every viewing along the edges of the lanes, where nothing marches: bushes, rocks,
  // tufts of grass, trees.
  const rng = mulberry(vary(5501)), s = F.ls * G.q, per = clamp(Math.round(F.VW / 190), 3, 9);
  pen(C.hair, 1);
  for (let edge = 0; edge <= F.n; edge++) for (let i = 0; i < per; i++) {
    const kind = Math.floor(rng() * 4), vx = lerp(F.x0 + 20, F.x1 - 20, (i + rng()) / per), vy = F.top + edge * F.laneH + (rng() - 0.5) * F.laneH * 0.16, big = 0.8 + rng() * 0.6;
    if (rng() < 0.25 || vy < 6 || vy > F.VH - 6) continue;
    const x = G.x(vx), y = G.y(vy), u = s * big;
    ctx.beginPath();
    if (kind === 0) { ctx.arc(x - 3.2 * u, y, 2.6 * u, Math.PI, 0); ctx.arc(x, y - 1.2 * u, 3.2 * u, Math.PI, 0); ctx.arc(x + 3.4 * u, y, 2.6 * u, Math.PI, 0); ctx.moveTo(x - 6 * u, y); ctx.lineTo(x + 6 * u, y); }
    else if (kind === 1) { ctx.moveTo(x - 4 * u, y + 2 * u); ctx.lineTo(x - 2.6 * u, y - 2 * u); ctx.lineTo(x + 1.6 * u, y - 2.8 * u); ctx.lineTo(x + 4.2 * u, y + 2 * u); ctx.closePath(); ctx.moveTo(x - 0.6 * u, y - 2.4 * u); ctx.lineTo(x + 0.4 * u, y + 2 * u); }
    else if (kind === 2) for (const o of [-2.4, 0, 2.4]) { ctx.moveTo(x + o * u, y + 2 * u); ctx.lineTo(x + o * 1.7 * u, y - 2.4 * u); }
    else { ctx.moveTo(x, y + 4 * u); ctx.lineTo(x, y - 1 * u); ctx.moveTo(x + 3.6 * u, y - 3.4 * u); ctx.arc(x, y - 3.4 * u, 3.6 * u, 0, TAU); }
    ctx.stroke();
  }
}
function drawWall(vx, facing, col, label) {
  const x = G.x(vx), top = G.y(F.top), bot = G.y(F.top + F.laneH * F.n), gap = 11 * F.ls * G.q;
  pen(col, 1.4); ctx.beginPath();
  let y = top;
  for (let k = 0; k < F.n; k++) { const gy = G.y(F.laneY(k)); ctx.moveTo(x, y); ctx.lineTo(x, gy - gap); y = gy + gap; }
  ctx.moveTo(x, y); ctx.lineTo(x, bot);
  for (let ty = top + 5; ty < bot - 6; ty += 11) {
    let open = false;
    for (let k = 0; k < F.n; k++) if (Math.abs(ty + 2.5 - G.y(F.laneY(k))) < gap + 5) open = true;
    if (!open) { ctx.moveTo(x, ty); ctx.lineTo(x + facing * 4, ty); ctx.lineTo(x + facing * 4, ty + 5); ctx.lineTo(x, ty + 5); }
  }
  ctx.stroke();
  for (let k = 0; k < F.n; k++) for (const s of [-1, 1]) { const gy = G.y(F.laneY(k)) + s * gap; ctx.fillStyle = C.bg; ctx.fillRect(x - 3, gy - 3, 6, 6); ctx.strokeRect(x - 3, gy - 3, 6, 6); }
  if (G.ss > 0.6 && F.baseW / F.VW * G.z.w > 50) text(label, G.x(vx - facing * F.baseW * 0.5), top + 7, { size: 8, color: col, align: "center" });
}
function drawLanes(S, t, p1) {
  const on = S.phase >= 2 || t >= M.tBench, r = clamp(F.baseW * 0.2, 7, 12) * F.ls * G.q, size = clamp(9 * F.ls, 7.5, 10), wide = G.x1 - G.x0 > 520;
  drawWall(F.baseW, 1, C.ink, "AUDITORS");
  drawWall(F.VW - F.baseW, -1, on ? C.ink : C.hair, "FP-CHECK");
  if (p1 > 0.02) GATES.forEach((g, j) => {
    const x = G.x(F.gateX(j));
    pen(C.muted, 1, 0.7 * p1); ctx.setLineDash([2, 5]); line(x, G.y(F.top) + 12, x, G.y(F.top + F.laneH * F.n) - 2); ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (G.x(F.v1) - G.x(F.v0) > 300) text(GATE_LABEL[j], x, G.y(F.top) + 5, { size: 8, align: "center", alpha: p1 });
  });
  lanes.forEach((a, k) => {
    const route = M.routes[a], col = routeColor(a), y = G.y(F.laneY(k)), p = { x: G.x(F.baseW * 0.5), y }, active = segmentAt(M, a, t) != null, done = !active && routeEnd[a] > -Infinity && routeEnd[a] <= t;
    const mine = laneUnits.get(a), got = mine.filter((U) => S.units[U.i].cov.has(a)).length, lx = G.x(F.x0) + 4, ly = G.y(F.laneY(k) - F.laneH / 2) + 9;
    pen(C.hair, 1, 0.9); ctx.setLineDash([1, 6]); line(G.x(F.x0), y, G.x(F.x1), y); ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (k > 0) { pen(C.faint, 1); line(G.x(F.baseW), G.y(F.laneY(k) - F.laneH / 2), G.x(F.VW - F.baseW), G.y(F.laneY(k) - F.laneH / 2)); }
    ctx.fillStyle = C.bg; ctx.beginPath(); ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + r, p.y + r * 0.8); ctx.lineTo(p.x - r, p.y + r * 0.8); ctx.closePath(); ctx.fill();
    pen(col, 1.5, active || done ? 1 : 0.6); if (!active && !done) ctx.setLineDash([2, 3]);
    ctx.stroke(); ctx.setLineDash([]);
    if (active && !HOLD) { const rot = FX() ? t * 1.2 : 0; pen(col, 1, 0.8); ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.8, rot, rot + TAU); ctx.stroke(); ctx.setLineDash([]); }
    if (done) { pen(col, 1.4); ctx.beginPath(); ctx.moveTo(p.x - 3, p.y + r * 0.2); ctx.lineTo(p.x - 0.8, p.y + r * 0.2 + 2.2); ctx.lineTo(p.x + 3, p.y + r * 0.2 - 2.4); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (G.ss > 0.5) {
      text(route.key, lx, ly, { size, w: 600, color: col });
      text((wide ? shortName(route.skill) + "  " : "") + got + "/" + mine.length + (done ? " ✓" : ""), lx + size * 1.9, ly, { size: size - 0.5, color: active ? C.ink : C.muted });
    }
    hits.push({ rect: { x: G.x(0), y: y - r * 2, w: G.x(F.baseW) - G.x(0), h: r * 4 }, r: r * 2, tip: bare(route.skill) + "\n" + (active ? "reviewing" : done ? "done" : "not started") + "\n" + got + " of " + mine.length + " files reviewed" });
  });
  drawTurret(S, t);
  const raised = S.cands.filter((c) => c.raised >= 0), by = (o) => raised.filter((c) => c.out === o).length, bx = G.x(F.VW - F.baseW);
  hits.push({ rect: { x: bx, y: G.y(0), w: G.x(F.VW) - bx, h: G.y(F.VH) - G.y(0) }, r: 1e4, tip: "crypto-fp-check\n" + raised.filter((c) => c.verdict >= 0).length + " of " + raised.length + " candidates decided\n" + by("verified") + " verified · " + by("false_positive") + " false positive" });
}
// The turret stands in the far wall between two lanes, eighty units tall, with the crystal that fires on top.
function drawTurret(S, t) {
  const on = S.phase >= 2 || t >= M.tBench, live = on && FX() && !HOLD, col = on ? C.ink : C.hair, b = at(F.turret), s = turretScale(), x = b.x, foot = b.y + 40 * s, c = crystal();
  const shape = (pts) => { ctx.beginPath(); pts.forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](x + px * s, foot - py * s)); ctx.closePath(); ctx.fillStyle = C.bg; ctx.fill(); ctx.stroke(); };
  pen(col, 1.6);
  shape([[-19, 0], [19, 0], [15, 9], [-15, 9]]);
  shape([[-12, 9], [12, 9], [8, 44], [-8, 44]]);
  shape([[-14, 44], [14, 44], [14, 51], [9.5, 51], [9.5, 47.5], [4.5, 47.5], [4.5, 51], [-4.5, 51], [-4.5, 47.5], [-9.5, 47.5], [-9.5, 51], [-14, 51]]);
  pen(col, 1); line(x - 10.7 * s, foot - 20 * s, x + 10.7 * s, foot - 20 * s); line(x - 9.4 * s, foot - 32 * s, x + 9.4 * s, foot - 32 * s);
  const cy = c.y + (live ? Math.sin(t * 2.4) * 1.6 * s : 0), w = 8.5 * s, h = 13 * s;
  // The crystal, in the cut drawn for this viewing: a diamond, a hexagon or an orb.
  const cut = vary(77) % 3;
  ctx.beginPath();
  if (cut === 1) for (let i = 0; i < 6; i++) ctx[i ? "lineTo" : "moveTo"](x + Math.sin(i * Math.PI / 3) * w * 1.05, cy - Math.cos(i * Math.PI / 3) * h * 0.92);
  else if (cut === 2) ctx.arc(x, cy, w * 1.15, 0, TAU);
  else { ctx.moveTo(x, cy - h); ctx.lineTo(x + w, cy); ctx.lineTo(x, cy + h); ctx.lineTo(x - w, cy); }
  ctx.closePath(); ctx.fillStyle = C.bg; ctx.fill(); pen(col, 1.8); ctx.stroke();
  pen(col, 1);
  if (cut === 2) { ctx.beginPath(); ctx.arc(x, cy, w * 0.6, -2.4, -0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(x, cy, w * 0.6, 0.9, 2.2); ctx.stroke(); }
  else { line(x - w * (cut ? 0.9 : 1), cy, x + w * (cut ? 0.9 : 1), cy); for (const side of [-1, 1]) { line(x, cy - h * (cut ? 0.92 : 1), x + side * w * 0.42, cy); line(x, cy + h * (cut ? 0.92 : 1), x + side * w * 0.42, cy); } }
  if (on) {
    pen(col, 1.2); ctx.beginPath(); ctx.ellipse(x, cy, 15 * s, 4.6 * s, live ? Math.sin(t * 0.9) * 0.4 : 0.25, 0, TAU); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + (live ? t * 0.8 : 0.3), r0 = 19 * s, l = (3.5 + (live ? 1.6 * Math.sin(t * 5 + i * 1.9) : 0)) * s; line(x + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.9, x + Math.cos(a) * (r0 + l), cy + Math.sin(a) * (r0 + l) * 0.9); }
  }
  hits.push({ rect: { x: x - 19 * s, y: b.y - 42 * s, w: 38 * s, h: 82 * s }, r: 30 * s, tip: "crypto-fp-check turret\none beam per verification call" });
}
function drawTower(a, U, s, t) {
  const T = s.cells.has(a) ? tower(a, U.id) : null;
  if (!T) return;
  const p = at(T), sc = G.ss, w = T.w * sc, h = T.h * sc, x = p.x - w / 2, y = p.y - h / 2, col = routeColor(a), key = a + ":" + U.i, pitch = T.pitch / F.VW * G.z.w, wide = pitch >= 62 && G.ss > 0.7;
  const fallen = s.cov.has(a), met = fallen || (contact.get(key) ?? Infinity) <= t, tap = s.taps.get(a), taken = Math.max(0, (tap ? tap.n : 0) - pending(a, U.id, t)), hot = tap && t - tap.t < 2.5 && !fallen;
  const state = fallen ? "reviewed · tower down" : !met ? "not reached yet" : "under attack · " + taken + (taken === 1 ? " hit" : " hits");
  hits.push({ rect: { x: x - 3, y: y - 8, w: w + 6, h: h + 20 }, r: Math.max(w, h) / 2 + 4, tip: U.id.replace(/^@/, "") + "\n" + M.routes[a].key + " · " + state });
  if (!met) { pen(C.hair, 1); ctx.setLineDash([2, 3]); ctx.strokeRect(x + w * 0.15, y + h * 0.25, w * 0.7, h * 0.75); ctx.setLineDash([]); return; }
  const name = (alpha) => text(fit(U.label, wide ? pitch - 6 : 110, { size: 8.5 }), p.x, y + h + 8, { size: 8.5, align: "center", color: C.ink, alpha });
  if (fallen) {
    pen(C.hair, 1.1); ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + h * 0.62); ctx.lineTo(x + w * 0.4, y + h * 0.78); ctx.lineTo(x + w * 0.7, y + h * 0.55); ctx.lineTo(x + w, y + h * 0.7); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    pennant(p.x, y + h * 0.66, col, t - s.cov.get(a), 1, sc * F.ls);
    if (wide) name(0.45);
    return;
  }
  let dx = 0;
  if (FX() && tap && t - tap.t < 0.2) { const k = t - tap.t; dx = Math.sin(k * 70) * 2.2 * (1 - k / 0.2); }
  const m = Math.min(4 * sc, h * 0.22), b = w / 5, edge = s.reopen >= 0 ? C.sev.High : C.ink;
  ctx.save(); ctx.translate(dx, 0);
  // Towers come in five builds: battlements, a pointed roof, a round top, a flat top with a flag, a stepped keep.
  const build = w >= 9 ? vary(U.i * 97 + a * 13) % 5 : 0;
  ctx.beginPath(); ctx.moveTo(x, y + h);
  if (build === 1) { ctx.lineTo(x, y + m * 1.3); ctx.lineTo(x + w / 2, y - m * 0.9); ctx.lineTo(x + w, y + m * 1.3); }
  else if (build === 2) { ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); }
  else if (build === 3) { ctx.lineTo(x, y); ctx.lineTo(x + w, y); }
  else if (build === 4) { ctx.lineTo(x, y + h * 0.45); ctx.lineTo(x + w * 0.2, y + h * 0.45); ctx.lineTo(x + w * 0.2, y); ctx.lineTo(x + w * 0.8, y); ctx.lineTo(x + w * 0.8, y + h * 0.45); ctx.lineTo(x + w, y + h * 0.45); }
  else { ctx.lineTo(x, y); if (w >= 9) for (let j = 0; j < 2; j++) { ctx.lineTo(x + b * (2 * j + 1), y); ctx.lineTo(x + b * (2 * j + 1), y + m); ctx.lineTo(x + b * (2 * j + 2), y + m); ctx.lineTo(x + b * (2 * j + 2), y); } ctx.lineTo(x + w, y); }
  ctx.lineTo(x + w, y + h); ctx.closePath();
  ctx.fillStyle = C.bg; ctx.fill(); pen(edge, hot ? 1.8 : 1.3); ctx.stroke();
  if (build === 3) { pen(col, 1.2); line(x + w * 0.5, y, x + w * 0.5, y - m * 2.2); ctx.beginPath(); ctx.moveTo(x + w * 0.5, y - m * 2.2); ctx.lineTo(x + w * 0.5 + m * 1.5, y - m * 1.6); ctx.lineTo(x + w * 0.5, y - m); ctx.stroke(); }
  if (taken > 0) {
    const rng = mulberry((U.i * 64 + a) * 131 + 17), n = Math.ceil((1 - Math.exp(-taken / 5)) * 7);
    pen(C.ink, 1.1); ctx.beginPath();
    for (let i = 0; i < n; i++) { const sx = x + 2 + rng() * Math.max(1, w - 4), sy = y + m + 2 + rng() * Math.max(1, h - m - 4), ang = rng() * Math.PI, len = 2 + rng() * 2.6; ctx.moveTo(sx - Math.cos(ang) * len, sy - Math.sin(ang) * len); ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len); }
    ctx.stroke();
  }
  // The bar shrinks with every hit and empties only when the file is recorded as reviewed.
  const bw = Math.max(w + 4, 12), left = Math.max(0.12, Math.exp(-taken / 6));
  pen(C.muted, 1); ctx.strokeRect(p.x - bw / 2, y - 7, bw, 3); pen(col, 2.2); line(p.x - bw / 2 + 1, y - 5.5, p.x - bw / 2 + 1 + (bw - 2) * left, y - 5.5);
  ctx.restore(); ctx.globalAlpha = 1;
  if (wide || hot) name(1);
}
function drawTowerFx(t) {
  for (const e of recent(M, t, 1.15)) {
    if (e.type !== "cover" && e.type !== "reopen") continue;
    const U = M.units[e.u], T = tower(e.a, U.id), age = t - e.t;
    if (!T) continue;
    const p = at(T), w = T.w * G.ss, h = T.h * G.ss, r = { x: p.x - w / 2, y: p.y - h / 2, w, h }, col = routeColor(e.a);
    if (e.type === "reopen") { echo({ x: r.x - w, y: r.y - h * 0.5, w: w * 3, h: h * 2 }, age, 0.5, C.sev.High, -0.44); floatText("REOPENED", p.x, r.y - 10, age, 1.1, C.sev.High, 10); continue; }
    lineShards(rectEdges(r), p.x, p.y, age, C.ink, e.i + 500, 1.0);
    ring(p.x, p.y, age, 0.45, 4, 40 * G.q, col, 1.5); streaks(p.x, p.y, age, col, e.i, 18, 0.6, 280 * G.q);
    floatText(fit(U.label, 110, { size: 9.5 }) + " ✓", p.x, r.y - 12, age, 1.0, col, 9.5);
  }
}
function drawMarks() {
  if (!locate) return;
  const a = (performance.now() - locate.at) / 1000, k = (a * 1.5) % 1, g = 5 + 14 * k;
  let found = false;
  for (const route of lanes) {
    const T = tower(route, locate.id);
    if (!T) continue;
    const p = at(T), w = T.w * G.ss + 8, h = T.h * G.ss + 8;
    found = true;
    pen(C.ink, 1.6, 1 - k); ctx.strokeRect(p.x - w / 2 - g, p.y - h / 2 - g, w + 2 * g, h + 2 * g); pen(C.ink, 1.8); brackets(p.x - w / 2, p.y - h / 2, w, h, 6); ctx.globalAlpha = 1;
  }
  if (a > 4 || !found) locate = null;
}
function zigzag(p0, p1, col, seed, alpha, width, sway) {
  const rng = mulberry(seed), dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy) || 1, n = Math.max(3, Math.round(d / 14));
  pen(col, width, alpha); ctx.beginPath(); ctx.moveTo(p0.x, p0.y);
  for (let i = 1; i < n; i++) { const o = (rng() - 0.5) * 2 * sway; ctx.lineTo(p0.x + dx * i / n - dy / d * o, p0.y + dy * i / n + dx / d * o); }
  ctx.lineTo(p1.x, p1.y); ctx.stroke(); ctx.globalAlpha = 1;
}
function drawShots(t) {
  const q = F.ls * G.q;
  for (const s of sim.shots) {
    const col = s.side >= 0 ? routeColor(s.side) : C.ink, p0 = at({ x: s.x0, y: s.y0 }), p1 = at({ x: s.x1, y: s.y1 }), age = t - s.t1, k = clamp((t - s.t0) / Math.max(0.01, s.t1 - s.t0), 0, 1);
    const dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy) || 1, along = (f, lift = 0) => ({ x: lerp(p0.x, p1.x, f), y: lerp(p0.y, p1.y, f) - Math.sin(Math.PI * f) * lift });
    if (age < 0) {
      if (s.kind === "arrow") { const a = along(Math.max(0, k - 0.18), 13 * q), b = along(k, 13 * q); pen(col, 1.9); line(a.x, a.y, b.x, b.y); }
      else if (s.kind === "shell") { const a = along(Math.max(0, k - 0.1), 28 * q), b = along(k, 28 * q); pen(col, 1, 0.5); line(a.x, a.y, b.x, b.y); pen(col, 1.7); ctx.beginPath(); ctx.arc(b.x, b.y, 2.8 * q, 0, TAU); ctx.stroke(); }
      else if (s.kind === "burst") for (let i = 0; i < 3; i++) { const f = k * 1.5 - i * 0.25; if (f <= 0 || f >= 1) continue; const a = along(Math.max(0, f - 0.2), (i - 1) * 8 * q), b = along(f, (i - 1) * 8 * q); pen(col, 1.6); line(a.x, a.y, b.x, b.y); }
      else if (s.kind === "tracer") { const a = along(Math.max(0, k - 0.5)), b = along(k); pen(col, 1.8, 0.95); line(a.x, a.y, b.x, b.y); }
    }
    if (s.kind === "bolt" && age > -0.08 && age < 0.16) { const a = 1 - Math.max(0, age) / 0.16; zigzag(p0, p1, col, s.seed + Math.floor(t * 30), a, 1.8, 5 * q); zigzag(p0, p1, col, s.seed + 9 + Math.floor(t * 30), a * 0.6, 1, 8 * q); }
    if (s.kind === "slash" && age >= 0 && age < 0.2) { const ang = Math.atan2(dy, dx), r = 12 * q; pen(col, 2.2, 1 - age / 0.2); ctx.beginPath(); ctx.arc(p1.x - dx / d * r * 0.9, p1.y - dy / d * r * 0.9, r, ang - 1.2 + age * 7, ang + 0.4 + age * 7); ctx.stroke(); }
    if (s.kind === "pierce" && age >= 0 && age < 0.2) { pen(col, 2.2, 1 - age / 0.2); line(p0.x, p0.y, p1.x + dx / d * 16 * q, p1.y + dy / d * 16 * q); }
    if (age >= 0 && s.kind !== "tracer") { const big = s.kind === "shell" ? 1.9 : 1; ring(p1.x, p1.y, age, 0.25 * big, 2, 13 * G.q * big, col, 1.2); streaks(p1.x, p1.y, age, col, s.seed, big > 1 ? 14 : 7, 0.4, 160 * G.q * big, 60); }
    ctx.globalAlpha = 1;
  }
  for (const p of sim.pulses) { const c = at(p), col = p.a != null ? routeColor(p.a) : C.ink; ring(c.x, c.y, t - p.t, 0.6, 3, 22 * G.q, col, 1); ring(c.x, c.y, t - p.t - 0.14, 0.5, 3, 14 * G.q, col, 1); }
}
function chevron(x, y, ang, size, width, alpha) {
  pen(C.ink, width, alpha); ctx.beginPath();
  ctx.moveTo(x - Math.cos(ang - 0.62) * size, y - Math.sin(ang - 0.62) * size); ctx.lineTo(x, y); ctx.lineTo(x - Math.cos(ang + 0.62) * size, y - Math.sin(ang + 0.62) * size); ctx.stroke();
}
function drawBeams(S, t, act) {
  const c = crystal(), q = F.ls * G.q, target = (id) => { const h = sim.heroes.get(id); return h ? at(h) : null; };
  // The turret keeps a faint line on the hero being verified.
  const aim = S.phase === 2 && act >= 0 && !HOLD ? target(M.cands[act].raw.id) : null;
  if (aim) { pen(C.ink, 1, 0.3); ctx.setLineDash([2, 6]); ctx.lineDashOffset = FX() ? -(t % 600) * 24 : 0; line(c.x, c.y, aim.x, aim.y); ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.globalAlpha = 1; }
  if (!FX()) return;
  // A shot leaves the crystal, travels to the hero and lands at `age` 0. It is a wedge that is wide at the turret
  // and closes on its head, with chevrons running along it away from the turret.
  const shoot = (p, age, heavy, failed, seed) => {
    const k = heavy ? 2 : 1, travel = heavy ? 0.28 : 0.2, after = heavy ? 0.42 : 0.28;
    if (age < -travel) { const g = clamp(1 + (age + travel) / 0.45, 0, 1); if (g > 0) { pen(C.ink, 1.4, 0.7 * g); ctx.beginPath(); ctx.arc(c.x, c.y, (14 + 12 * k) * (1 - 0.75 * g) * q + 4, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; } return; }
    if (age >= after) return;
    const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, ang = Math.atan2(dy, dx), reach = (failed ? d + 46 : d) * clamp(1 + age / travel, 0, 1);
    const head = { x: c.x + ux * reach, y: c.y + uy * reach }, fade = age < 0 ? 1 : 1 - age / after, half = 5 * k * q, step = 15 * q;
    pen(C.ink, 1.2, 0.85 * fade); ctx.beginPath(); ctx.moveTo(c.x - uy * half, c.y + ux * half); ctx.lineTo(head.x, head.y); ctx.lineTo(c.x + uy * half, c.y - ux * half); ctx.stroke();
    pen(C.ink, (1.4 + 1.6 * k) * fade + 0.5, fade); line(c.x, c.y, head.x, head.y);
    if (heavy) zigzag(c, head, C.ink, seed + Math.floor(t * 30), 0.8 * fade, 1.1, 7 * q);
    for (let run = (t * 280) % step + 10 * q; run < reach - 5; run += step) chevron(c.x + ux * run, c.y + uy * run, ang, (4 + 1.5 * k) * q, 1.3, 0.8 * fade);
    if (age < 0) chevron(head.x, head.y, ang, (8 + 3 * k) * q, 2.4, 1);
    ring(c.x, c.y, age + travel, 0.32, 4, (16 + 9 * k) * q, C.ink, 1.4);
    if (age >= 0 && !failed) { ring(p.x, p.y, age, after, 3, (16 + 10 * k) * q, C.ink, 1.4); streaks(p.x, p.y, age, C.ink, seed, heavy ? 16 : 9, 0.4, 180 * q, 60); }
    ctx.globalAlpha = 1;
  };
  for (const b of sim.beams) { const p = target(b.cid); if (p) shoot(p, t - b.fire, false, b.failed, b.seed); }
  // A false positive ends with one heavy shot.
  for (const e of recent(M, t + 0.8, 1.3)) {
    const p = e.type === "verdict" && e.out === "false_positive" ? target(M.cands[e.c].raw.id) : null;
    if (p) shoot(p, t - e.t, true, false, e.i * 13 + 5);
  }
}
function unitPath(strike, s) {
  ctx.beginPath();
  if (strike === "arrow") { ctx.moveTo(-6 * s, 0); ctx.lineTo(6 * s, 0); ctx.moveTo(2 * s, -3.6 * s); ctx.lineTo(6 * s, 0); ctx.lineTo(2 * s, 3.6 * s); ctx.moveTo(-6.5 * s, -2.6 * s); ctx.lineTo(-4 * s, 0); ctx.lineTo(-6.5 * s, 2.6 * s); }
  else if (strike === "bolt") { ctx.moveTo(5.4 * s, 0); ctx.lineTo(0, 4.2 * s); ctx.lineTo(-5.4 * s, 0); ctx.lineTo(0, -4.2 * s); ctx.closePath(); ctx.moveTo(1.5 * s, 0); ctx.arc(0, 0, 1.5 * s, 0, TAU); }
  else if (strike === "shell") { ctx.rect(-5 * s, -3.6 * s, 8 * s, 7.2 * s); ctx.moveTo(3 * s, 0); ctx.lineTo(8.4 * s, 0); }
  else if (strike === "burst") for (const o of [-3.3, 3.3]) { ctx.moveTo(4.6 * s, o * s); ctx.lineTo(-3.6 * s, (o + 2.5) * s); ctx.lineTo(-3.6 * s, (o - 2.5) * s); ctx.closePath(); }
  else if (strike === "pierce") { ctx.moveTo(9.5 * s, 0); ctx.lineTo(-3 * s, 2.3 * s); ctx.lineTo(-6.5 * s, 0); ctx.lineTo(-3 * s, -2.3 * s); ctx.closePath(); }
  else { ctx.moveTo(6 * s, 0); ctx.lineTo(-4 * s, 3.8 * s); ctx.lineTo(-1.8 * s, 0); ctx.lineTo(-4 * s, -3.8 * s); ctx.closePath(); }
}
function drawUnit(u, t) {
  const p = at(u), col = routeColor(u.side), s = 1.5 * F.ls * G.q * u.size, strike = u.kind.strike;
  if (u.mode === "dead") { const age = t - u.endAt; lineShards(rectEdges({ x: p.x - 5 * s, y: p.y - 5 * s, w: 10 * s, h: 10 * s }), p.x, p.y, age, col, u.seed, 0.75); ring(p.x, p.y, age, 0.3, 2, 16 * G.q, col, 1.1); return; }
  const a = clamp((t - u.born) / 0.2, 0, 1) * (u.mode === "fade" ? 1 - clamp((t - u.endAt) / 0.45, 0, 1) : 1), v = Math.hypot(u.vx, u.vy);
  // The two melee kinds throw themselves at the tower when they strike.
  const lunge = (strike === "slash" || strike === "pierce") && u.struckAt >= 0 && t - u.struckAt < 0.24 ? Math.sin(Math.PI * (t - u.struckAt) / 0.24) * (strike === "pierce" ? 17 : 9) * G.q : 0;
  if (u.mode === "march" && v > 120) { pen(col, 1, 0.45 * a); line(p.x, p.y, G.x(u.x - u.vx * 0.06), G.y(u.y - u.vy * 0.06)); }
  ctx.save(); ctx.translate(p.x + Math.cos(u.hd) * lunge, p.y + Math.sin(u.hd) * lunge); ctx.rotate(u.hd); unitPath(strike, s);
  ctx.globalAlpha = a; ctx.fillStyle = C.bg; ctx.fill(); pen(col, 1.5, a); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
}
function heroTip(c, cs, S, active) {
  const status = cs.verdict >= 0 ? (cs.out === "verified" ? cs.sev || "verified" : OUT_LABEL[cs.out]).toLowerCase() : active ? "under verification" : S.phase >= 2 ? "queued" : "awaiting verification";
  return c.id + " · " + c.title + (c.owner >= 0 ? "\nraised by " + bare(M.routes[c.owner].skill) : "") + (c.location ? "\n" + c.location : "") + "\n" + c.els.map((e, k) => e.label + " " + (!cs.els[k] ? "·" : cs.els[k].pass === true ? "✓" : cs.els[k].pass === false ? "✗" : "?")).join("  ") + "\n" + status;
}
function drawHero(c, cs, h, S, t, active) {
  const p = at(h), q = F.ls * G.q * h.fit, col = routeColor(c.owner), decided = cs.verdict >= 0, age = t - cs.verdict, born = t - cs.raised, R = 8.5 * q * (FX() ? backOut(clamp(born / 0.3, 0, 1)) : 1);
  // A beam that lands is felt: the hero is knocked back from the turret and shudders, its outline and the gate it is
  // being tried on flare, a guard flashes up on the side the beam came from, and sparks fly back along it.
  let hurt = 0;
  if (FX() && !decided) for (const b of sim.beams) if (b.cid === c.raw.id && !b.failed) { const a = t - b.fire; if (a >= 0 && a < 0.42) hurt = Math.max(hurt, 1 - a / 0.42); }
  const src = crystal(), away = Math.atan2(p.y - src.y, p.x - src.x), next = cs.els.findIndex((x) => !x);
  if (hurt) { const kick = 8 * q * hurt * hurt, jolt = Math.sin(t * 95) * 1.8 * q * hurt; p.x += Math.cos(away) * kick - Math.sin(away) * jolt; p.y += Math.sin(away) * kick + Math.cos(away) * jolt; }
  hits.push({ rect: { x: p.x - 16, y: p.y - 16, w: 32, h: 32 }, r: 14, tip: heroTip(c, cs, S, active) });
  const circle = (r) => { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); };
  if (decided && cs.out === "false_positive") {
    const hex = [0, 1, 2, 3, 4, 5].map((i) => [p.x + Math.cos(i * Math.PI / 3) * 11 * q, p.y + Math.sin(i * Math.PI / 3) * 11 * q, p.x + Math.cos((i + 1) * Math.PI / 3) * 11 * q, p.y + Math.sin((i + 1) * Math.PI / 3) * 11 * q]);
    lineShards(hex, p.x, p.y, age, col, c.i + 300, 0.9); streaks(p.x, p.y, age, C.muted, c.i + 900, 18, 0.6, 250 * q, 160); ring(p.x, p.y, age, 0.45, 4, 44 * q, C.muted, 1.3);
    floatText(c.id + " · " + OUT_LABEL[cs.out], p.x, p.y - 16, age, 1.4, C.muted, 10.5);
    pen(C.muted, 1.1, 0.85); ctx.setLineDash([1.5, 2.5]); circle(5 * q); ctx.stroke(); ctx.setLineDash([]);
    line(p.x - 3.5 * q, p.y + 3.5 * q, p.x + 3.5 * q, p.y - 3.5 * q); ctx.globalAlpha = 1;
    return;
  }
  const noted = decided && (cs.out === "observation" || cs.out === "residual_risk"), lit = decided && cs.out === "verified", vcol = lit ? C.sev[cs.sev] || C.ink : noted ? C.sev.note : C.ink;
  if (active && !decided) { pen(col, 1.4); brackets(p.x - 17 * q, p.y - 17 * q, 34 * q, 34 * q, 5); }
  ctx.fillStyle = C.bg; circle(noted ? R * 0.6 : R); ctx.fill();
  pen(vcol, (lit ? 1.8 : 1.5) + hurt * 1.8); if (decided && cs.out === "open") ctx.setLineDash([3, 3]);
  ctx.stroke(); ctx.setLineDash([]);
  // The mark at the hero's centre is its own: a dot, a triangle, a square or a cross.
  const mark = vary(c.i * 37 + 1) % 4, mq = 2.6 * q;
  ctx.fillStyle = lit || noted ? vcol : col; ctx.beginPath();
  if (mark === 1) { ctx.moveTo(p.x, p.y - mq * 1.2); ctx.lineTo(p.x + mq * 1.1, p.y + mq * 0.8); ctx.lineTo(p.x - mq * 1.1, p.y + mq * 0.8); ctx.closePath(); }
  else if (mark === 2) ctx.rect(p.x - mq * 0.85, p.y - mq * 0.85, mq * 1.7, mq * 1.7);
  else if (mark === 3) { ctx.rect(p.x - mq * 1.2, p.y - mq * 0.4, mq * 2.4, mq * 0.8); ctx.rect(p.x - mq * 0.4, p.y - mq * 1.2, mq * 0.8, mq * 2.4); }
  else ctx.arc(p.x, p.y, 2.2 * q, 0, TAU);
  ctx.fill();
  if (lit) { pen(vcol, 1.4); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r0 = R + 3 * h.fit, l = (3.5 + (FX() ? 1.6 * Math.sin(t * 5 + i * 1.7) : 0)) * h.fit; line(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0, p.x + Math.cos(a) * (r0 + l), p.y + Math.sin(a) * (r0 + l)); } }
  else if (!noted) {
    const n = c.els.length, span = TAU / n, rr = R + 4.5 * q;
    c.els.forEach((el, k) => {
      const s = cs.els[k], a0 = -Math.PI / 2 + k * span + 0.2, a1 = a0 + span - 0.4;
      const struck = hurt > 0 && k === next;
      pen(struck ? col : !s ? C.hair : s.pass === true ? col : s.pass === false ? C.sev.Critical : C.muted, struck ? 1.4 + 2.2 * hurt : s ? 2 : 1.2); if (!struck && (!s || s.pass === null)) ctx.setLineDash([1.5, 2.5]);
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, a0, a1); ctx.stroke(); ctx.setLineDash([]);
      if (!s) return;
      const ga = t - s.t, mx = p.x + Math.cos((a0 + a1) / 2) * rr, my = p.y + Math.sin((a0 + a1) / 2) * rr;
      if (s.pass === false) { pen(C.sev.Critical, 1.4); line(mx - 3, my - 3, mx + 3, my + 3); line(mx + 3, my - 3, mx - 3, my + 3); streaks(p.x, p.y, ga, C.sev.Critical, c.i * 13 + k, 12, 0.45, 190 * q, 60); }
      if (s.pass !== null) { ring(p.x, p.y, ga, 0.5, rr, rr + 36 * q, s.pass ? col : C.sev.Critical, 1.5); floatText(el.label + (s.pass ? " ✓" : " ✗"), p.x, p.y - rr - 14, ga, 0.9, s.pass ? col : C.sev.Critical, 10); }
    });
    if (decided) text("?", p.x + R + 9 * q, p.y, { align: "center", size: 10, color: C.ink });
  }
  if (hurt) {
    const face = away + Math.PI, guard = R + (5 + 5 * (1 - hurt)) * q, ix = p.x + Math.cos(face) * (R + 2 * q), iy = p.y + Math.sin(face) * (R + 2 * q);
    pen(C.ink, 1.2 + 1.6 * hurt, hurt); ctx.beginPath(); ctx.arc(p.x, p.y, guard, face - 1.05, face + 1.05); ctx.stroke();
    pen(C.ink, 1, hurt * 0.7); ctx.beginPath(); ctx.arc(p.x, p.y, guard + 3.5 * q, face - 0.6, face + 0.6); ctx.stroke();
    pen(col, 1.3, hurt); for (const o of [-0.75, -0.25, 0.25, 0.75]) { const len = (5 + 7 * (1 - hurt)) * q; line(ix + Math.cos(face + o) * 2 * q, iy + Math.sin(face + o) * 2 * q, ix + Math.cos(face + o) * (2 * q + len), iy + Math.sin(face + o) * (2 * q + len)); }
    ctx.globalAlpha = 1;
  }
  ring(p.x, p.y, born, 0.4, 3, 30 * q, col, 1.3);
  floatText(fit(c.id, 90, { size: 10.5 }) + " raised", p.x, p.y - R - 14, born, 1.1, col, 10.5);
  if (lit) { streaks(p.x, p.y, age, vcol, c.i + 700, 30, 0.8, 360 * q, 100); ring(p.x, p.y, age, 0.55, 8, 100 * q, vcol, 1.7); ring(p.x, p.y, age - 0.09, 0.55, 8, 62 * q, C.ink, 1); floatText(c.id + " · " + (cs.sev || "verified").toUpperCase(), p.x - 30, p.y - R - 22, age, 1.5, vcol, 13); }
  else if (noted) { ring(p.x, p.y, age, 0.45, 5, 40 * q, vcol, 1.2); floatText(c.id + " · " + OUT_LABEL[cs.out], p.x, p.y - 14, age, 1.4, vcol, 10); }
  if (G.ss > 0.55 && h.fit > 0.8 && born > 1.1) text(fit(c.id, 70, { size: 8.5 }), p.x, p.y + (noted ? 5 * q : R + (lit ? 8 : 5) * q) + 7, { align: "center", size: 8.5, color: lit ? vcol : noted ? C.muted : C.ink });
  ctx.globalAlpha = 1;
}
function drawHud(S, t) {
  const y = G.R.y + 18, label = PHASE_LABEL[S.phase].toUpperCase(), total = M.units.length, cleared = S.units.filter((u) => u.broken >= 0).length, calls = callsBefore(M, t), wide = G.x1 - G.x0 > 420;
  text(label, G.x0 - 6, y, { font: DISP, w: 600, size: 15, color: S.regress ? C.sev.High : C.ink });
  if (HOLD) {
    ctx.font = "600 15px " + DISP;
    const gx = G.x0 + 8 + ctx.measureText(label).width, col = HOLD.mode === "wait" ? C.sev.High : C.muted;
    pen(col, 2.4); line(gx, y - 5, gx, y + 5); line(gx + 6, y - 5, gx + 6, y + 5);
    if (HOLD.mode === "wait" && FX()) for (const shift of [0, 0.5]) { const k = (t / 1.6 + shift) % 1; pen(col, 1.2, 1 - k); ctx.beginPath(); ctx.arc(gx + 3, y, 9 + 11 * k, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  text((wide && calls ? calls + " CALLS · " : "") + String(cleared).padStart(2, "0") + " / " + total + (wide ? " CLEARED" : ""), G.x1 + 6, y, { align: "right", size: 10.5, color: C.ink });
}
function drawLegend() {
  if (!G.legend || G.ss < 0.75) return;
  const y = G.y1 - 11, mark = [
    (x) => { ctx.beginPath(); ctx.moveTo(x + 11, y); ctx.lineTo(x + 2, y + 3.4); ctx.lineTo(x + 4, y); ctx.lineTo(x + 2, y - 3.4); ctx.closePath(); ctx.stroke(); },
    (x) => { ctx.strokeRect(x + 3, y - 4.5, 7, 9); },
    (x) => { ctx.beginPath(); ctx.arc(x + 6.5, y, 4.2, 0, TAU); ctx.stroke(); },
    (x) => { ctx.beginPath(); ctx.moveTo(x + 5, y - 3.4); ctx.lineTo(x + 7.4, y); ctx.lineTo(x + 5, y + 3.4); ctx.lineTo(x + 2.6, y); ctx.closePath(); ctx.moveTo(x + 7.4, y); ctx.lineTo(x + 13, y); ctx.stroke(); },
  ];
  let x = G.x0 + 2;
  ["UNIT = ONE TOOL CALL", "TOWER = FILE IN SCOPE", "HERO = CANDIDATE FINDING", "BEAM = VERIFICATION CALL"].forEach((label, i) => {
    pen(i === 3 ? C.ink : C.muted, 1.2); mark[i](x);
    text(label, x + 17, y + 0.5, { size: 8.5 });
    x += 34 + label.length * 5.2;
  });
}

export function draw(S, t) {
  hits.length = 0;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  if (!M || !S) { text("No session recorded for this engagement", W / 2, H / 2, { align: "center", size: 11 }); return { p2: 0, find: { x: 0, y: H, w: W, h: 0 } }; }
  NOW = S;
  const p1 = progress(t, M.tBench), p2 = progress(t, M.tResults), hh = lerp(H, H * (W >= NARROW ? TOP_H : 0.52), p2), R = { x: 0, y: 0, w: W, h: hh }, sh = shakeAt(M, t), act = activeCandidate(M, S);
  const stale = M.hooked && M.session.phase !== "closed" && t - M.lastActivity > STALE;
  HOLD = S.hold ? { mode: S.hold, since: S.holdAt } : stale ? { mode: "pause", since: M.lastActivity + STALE } : null;
  layout(p1); geometry(R);
  advance(S, t);
  ctx.save(); ctx.translate(sh.x, sh.y);
  setLineScale(G.q);
  drawGround(sh.pulse);
  drawLanes(S, t, p1);
  for (const a of lanes) for (const U of laneUnits.get(a)) drawTower(a, U, S.units[U.i], t);
  drawMarks();
  drawShots(t);
  for (const u of sim.units) drawUnit(u, t);
  M.cands.forEach((c, ci) => { const h = sim.heroes.get(c.raw.id); if (h) drawHero(c, S.cands[ci], h, S, t, act === ci); });
  drawBeams(S, t, act);
  drawTowerFx(t);
  setLineScale(1);
  if (HOLD) { ctx.fillStyle = C.bg; ctx.globalAlpha = 0.5 * (FX() ? clamp((t - HOLD.since) / 0.4, 0, 1) : 1); ctx.fillRect(-20, -20, W + 40, hh + 20); ctx.globalAlpha = 1; }
  drawHud(S, t);
  drawLegend();
  ctx.restore();
  drawBanner(M, t, R);
  return { p2, find: { x: 0, y: hh, w: W, h: H - hh } };
}
