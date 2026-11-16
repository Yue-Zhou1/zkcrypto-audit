// The dungeon theme: the audit as the exploration of a dungeon.
//
// Level 1 is the map. A file in scope is a room, hatched over while it is unexplored, with one bay per route that
// must review it. Each domain auditor is a figure that walks the corridors from room to room; a recorded tool call is
// one search of the bay it stands in, which thins the hatching, and the bay clears only when the review is recorded.
// A candidate is a stairway found in a room. Level 2 is where the stairways lead: one passage per candidate, hatched
// the same way, closed by one door per verification gate, with a chest at the end. The crypto-fp-check figure walks
// there; a verification call is one blow on the door in front of it, the door opens only when its gate is recorded
// as passed, and what is in the chest is the verdict. Every figure walks the
// corridors at a walking pace, and what it does is shown when it gets there, which may be later than the record.
import { PHASE_LABEL, OUT_LABEL, FLOW_SIDE, mulberry, recent, activeCandidate, callsBefore, bare } from "./model.js";
import { ctx, C, W, H, DISP, TOP_H, NARROW, STALE, lerp, clamp, smooth, backOut, clock, progress, FX, hits, text, fit, pen, line, hatch, brackets, streaks, ring, echo, floatText, shakeAt, drawBanner, burst, vary } from "./kit.js";

const TAU = Math.PI * 2, MAP_W = 0.44, STAGGER = 0.1, WALK = 100, STRIDE = 5.2;

let M = null, HOLD = null, locate = null, D = null;
let lanes = [], laneOf = new Map(), order = [], walk = new Map(), routeEnd = [], V = [], NOMINAL = null;

export function setModel(model) {
  M = model;
  if (!M) return;
  lanes = M.routes.filter((r) => r.wall).map((r) => r.i);
  laneOf = new Map(lanes.map((a, k) => [a, k]));
  routeEnd = M.routes.map(() => -Infinity);
  walk = new Map(lanes.map((a) => [a, []]));
  for (const e of M.EV) {
    if (e.type === "end") routeEnd[e.a] = Math.max(routeEnd[e.a], e.t);
    else if ((e.type === "tap" || e.type === "cover") && !e.pre && walk.has(e.a)) { const list = walk.get(e.a), last = list[list.length - 1]; if (!last || last.u !== e.u || e.t - last.t > 0.05) list.push({ t: e.t, u: e.u }); }
  }
  // A route that has ended walks back out.
  for (const a of lanes) { const list = walk.get(a); if (list.length && routeEnd[a] > -Infinity) list.push({ t: Math.max(routeEnd[a], list[list.length - 1].t) + 1.6, u: -1 }); }
  // Rooms stand in path order, so the files of one directory are neighbours.
  order = inOrder(M.units);
  V = M.EV.filter((e) => !e.pre && ((e.type === "vtap" && e.c >= 0) || e.type === "gate" || e.type === "verdict")).map((e) => ({ t: e.t, c: e.c, k: e.type === "verdict" ? M.cands[e.c].els.length : e.k }));
}
const deal = (list, seed) => { const rnd = mulberry(vary(seed)), out = list.slice(); for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };
// Which room stands where is dealt afresh for every viewing.
const inOrder = (units) => deal(units.slice().sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0)), 7001);
// How long a figure needs between two places: the length of the way along the corridors at a walking pace. Measured
// on the map as it is laid out when the audit is loaded.
export const pace = {
  // The map is drawn before anyone sets out on it, and level 2 before the verifier comes down.
  settle: { map: 1.3, level: 4.6 },
  begin(draft) { const keep = [D, order]; order = inOrder(draft.units); layout({ x: 0, y: 0, w: W, h: H }); NOMINAL = { D, units: draft.units }; [D, order] = keep; },
  route(a, from, to) {
    if (from === to) return 0.45;
    const keep = D, N = NOMINAL;
    D = N.D;
    const place = (u) => (N.D.rooms[u] ? { room: N.D.rooms[u], spot: spotIn(a, N.units[u]), id: u } : { room: null, spot: { x: N.D.ox, y: N.D.oy }, id: -1 }), len = along(way(place(from), place(to)), 1).total;
    D = keep;
    return len / (WALK * N.D.tq) + 0.3;
  },
  // In level 2 the way from one passage to another is back out to the shaft and in again.
  verify: (from, to) => (!from ? 0.6 * (to.k + 1) + 0.35 * Math.min(6, to.c) + 0.8 : from.c === to.c ? 0.4 + 0.6 * Math.abs(from.k - to.k) : 0.6 * (from.k + to.k + 2) + 0.35 * Math.min(6, Math.abs(from.c - to.c)) + 0.4),
};
export function locateUnit(u) { locate = { u, at: performance.now() }; }

const routeColor = (a) => (a >= 0 && M.routes[a].color >= 0 ? C.route[M.routes[a].color] : C.ink);
const shortName = (skill) => bare(skill).replace(/-(auditor|checker)$/, "");

function regions(p1, p2) {
  if (W >= NARROW) {
    const ww = lerp(W, W * MAP_W, p1), hh = lerp(H, H * TOP_H, p2);
    return { map: { x: 0, y: 0, w: ww, h: hh }, vault: { x: ww, y: 0, w: W - ww, h: hh }, find: { x: 0, y: hh, w: W, h: H - hh } };
  }
  const mh = lerp(lerp(H, H * 0.42, p1), H * 0.22, p2), bottom = lerp(H, H * 0.52, p2);
  return { map: { x: 0, y: 0, w: W, h: mh }, vault: { x: 0, y: mh, w: W, h: bottom - mh }, find: { x: 0, y: bottom, w: W, h: H - bottom } };
}

// Level 1: a grid of cells with a corridor along every cell edge. A room sits somewhere inside its cell and opens
// through a door in its bottom wall onto the corridor under its row.
function layout(R) {
  const pad = lerp(14, 22, clamp((R.w - 320) / 600, 0, 1)), x0 = R.x + pad, x1 = R.x + R.w - pad, y0 = R.y + 40, y1 = R.y + R.h - 10, legend = R.h > 300 && R.w > 900 ? 18 : 0;
  const zone = { x: x0 + 12, y: y0 + 30, w: Math.max(40, x1 - x0 - 24), h: Math.max(40, y1 - y0 - 42 - legend) }, n = Math.max(1, order.length);
  const cols = clamp(Math.round(Math.sqrt(n * zone.w / zone.h / 1.45)), 1, n), rows = Math.ceil(n / cols), cw = Math.min(zone.w / cols, 270), ch = Math.min(zone.h / rows, 170);
  const ox = zone.x + (zone.w - cw * cols) / 2, oy = zone.y + (zone.h - ch * rows) / 2, gut = clamp(Math.min(cw, ch) * 0.2, 4, 26), q = clamp(Math.min(cw / 150, ch / 104), 0.28, 1.1);
  D = { R, x0, x1, y0, y1, legend, cols, rows, cw, ch, ox, oy, gut, q, tq: clamp(q * 1.35, 0.7, 1.5), names: cw >= 78 && ch >= 46, rooms: [] };
  // The grid usually has a few cells more than there are rooms; which ones stay empty is part of the deal.
  const cells = deal(Array.from({ length: cols * rows }, (v, i) => i), 7103).slice(0, order.length).sort((p, q) => p - q);
  order.forEach((U, s) => {
    const c = cells[s] % cols, r = Math.floor(cells[s] / cols), rnd = mulberry(vary(U.i * 613 + 29)), aw = cw - gut, ah = ch - gut, w = aw * (0.7 + 0.3 * rnd()), h = ah * (0.66 + 0.34 * rnd()), x = ox + c * cw + gut / 2 + (aw - w) * rnd(), y = oy + r * ch + gut / 2 + (ah - h) * rnd();
    const room = { x, y, w, h, head: D.names ? Math.min(13, h * 0.3) : 0, door: { x: x + w * (0.3 + 0.4 * rnd()), y: y + h }, lane: oy + (r + 1) * ch };
    D.rooms[U.i] = Object.assign(room, lookOf(room, rnd, Math.min(7 * D.tq, w * 0.2)));
  });
}
// No two rooms look alike. Each takes, from its own seed: a plan (plain, cut corners, rounded, a corner taken out,
// or a rough cave), a kind of wall, a floor, and a few things standing in it. The outline is a list of points that
// runs clockwise from the right side of the door round to its left side, so the gap between its ends is the door.
function lookOf(r, rnd, gap) {
  const { x, y, w, h } = r, x1 = x + w, y1 = y + h, m = Math.min(w, h), dl = r.door.x - gap / 2, dr = r.door.x + gap / 2, roll = rnd(), plan = m < 34 ? 0 : roll < 0.22 ? 0 : roll < 0.44 ? 1 : roll < 0.62 ? 2 : roll < 0.8 ? 3 : 4;
  const pts = [{ x: dr, y: y1 }], inset = [0, 0, 0, 0], centre = [[x1, y1, -1, -1], [x1, y, -1, 1], [x, y, 1, 1], [x, y1, 1, -1]], start = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];
  if (plan === 1 || plan === 2) {
    const lim = m * 0.26, room = [x1 - dr - 4, lim, lim, dl - x - 4];
    for (let i = 0; i < 4; i++) inset[i] = rnd() < (plan === 2 ? 0.85 : 0.6) ? Math.max(0, Math.min(lim * (0.45 + 0.55 * rnd()), room[i])) : 0;
    if (!inset.some((c) => c > 3)) inset[1] = lim * 0.7;
  }
  const corner = (i) => {
    const [cx, cy, sx, sy] = centre[i], c = inset[i];
    if (c < 1) { pts.push({ x: cx, y: cy }); return; }
    if (plan === 2) { for (let k = 0; k <= 5; k++) { const a = start[i] - k * Math.PI / 10; pts.push({ x: cx + sx * c + Math.cos(a) * c, y: cy + sy * c + Math.sin(a) * c }); } return; }
    if (i % 2 === 0) pts.push({ x: cx + sx * c, y: cy }, { x: cx, y: cy + sy * c }); else pts.push({ x: cx, y: cy + sy * c }, { x: cx + sx * c, y: cy });
  };
  if (plan === 3) {
    // a corner taken out at the bottom, on the side with more room beside the door
    const right = x1 - dr > dl - x, nw = Math.min(w * (0.16 + 0.12 * rnd()), (right ? x1 - dr : dl - x) - 6), nh = h * (0.22 + 0.16 * rnd());
    if (nw < 8) { corner(0); corner(1); corner(2); corner(3); }
    else if (right) { pts.push({ x: x1 - nw, y: y1 }, { x: x1 - nw, y: y1 - nh }, { x: x1, y: y1 - nh }); corner(1); corner(2); corner(3); }
    else { corner(0); corner(1); corner(2); pts.push({ x, y: y1 - nh }, { x: x + nw, y: y1 - nh }, { x: x + nw, y: y1 }); }
  } else if (plan === 4) {
    // a cave: the walls wander inwards a little all the way round, least along the top, where the name is
    const amp = Math.min(5.5, m * 0.06), side = (ax, ay, bx, by, nx, ny, most) => { const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / 26)); for (let k = 1; k <= n; k++) { const f = k / n, o = k === n ? 0 : most * (0.25 + 0.75 * rnd()); pts.push({ x: lerp(ax, bx, f) + nx * o, y: lerp(ay, by, f) + ny * o }); } };
    side(dr + 5, y1, x1, y1, 0, -1, amp); side(x1, y1, x1, y, -1, 0, amp); side(x1, y, x, y, 0, 1, Math.min(amp, 2.5)); side(x, y, x, y1, 1, 0, amp); side(x, y1, dl - 5, y1, 0, -1, amp);
    pts[pts.length - 1].y = y1;
  } else { corner(0); corner(1); corner(2); corner(3); }
  pts.push({ x: dl, y: y1 });
  // things in the room, kept clear of the middle, where the figures stand, and of the top right, where a stairway shows
  const things = [], count = w < 86 || h < 60 ? 0 : rnd() < 0.3 ? 0 : rnd() < 0.62 ? 1 : 2;
  for (let i = 0; i < count; i++) things.push(i === 0 ? { kind: Math.floor(rnd() * 8), fx: 0.14 + 0.44 * rnd(), fy: 0.2 + 0.1 * rnd() } : { kind: Math.floor(rnd() * 8), fx: rnd() < 0.5 ? 0.09 : 0.91, fy: 0.46 + 0.22 * rnd() });
  return { plan, pts, inset, wall: Math.floor(rnd() * 3), floor: m < 44 ? 0 : [0, 0, 1, 2, 3, 4][Math.floor(rnd() * 6)], step: 11 + 7 * rnd(), seed: Math.floor(rnd() * 1e6), things };
}
function tracePlan(r, close) { ctx.beginPath(); r.pts.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](p.x, p.y)); if (close) ctx.closePath(); }
// The floor of a room at x: the lowest point of its outline there.
function footAt(r, x) {
  let y = r.y + r.h * 0.5;
  for (let i = 0; i < r.pts.length; i++) { const p = r.pts[i], q = r.pts[(i + 1) % r.pts.length]; if ((p.x - x) * (q.x - x) <= 0 && Math.abs(q.x - p.x) > 1e-6) y = Math.max(y, lerp(p.y, q.y, (x - p.x) / (q.x - p.x))); }
  return y;
}
function drawFloor(r, top) {
  const st = r.step * D.tq, x = r.x, w = r.w, h = r.y + r.h - top;
  pen(C.faint, 1);
  if (r.floor === 1) { ctx.beginPath(); for (let a = st; a < w; a += st) { ctx.moveTo(x + a, top); ctx.lineTo(x + a, top + h); } for (let b = st; b < h; b += st) { ctx.moveTo(x, top + b); ctx.lineTo(x + w, top + b); } ctx.stroke(); }
  else if (r.floor === 2) { hatch(x, top, w, h, st * 1.5, 1); hatch(x, top, w, h, st * 1.5, -1); }
  else if (r.floor === 3) {
    // flagstones: courses with the joints staggered
    const rnd = mulberry(r.seed); ctx.beginPath();
    for (let b = 0, row = 0; b < h; b += st, row++) { if (b) { ctx.moveTo(x, top + b); ctx.lineTo(x + w, top + b); } for (let a = st * (0.6 + rnd()); a < w; a += st * (1.2 + rnd())) { ctx.moveTo(x + a, top + b); ctx.lineTo(x + a, Math.min(top + h, top + b + st)); } }
    ctx.stroke();
  } else if (r.floor === 4) { const g = Math.min(w, h) * 0.16; ctx.setLineDash([3, 3]); ctx.strokeRect(x + g, top + g * 0.7, w - 2 * g, h - g * 1.4); ctx.setLineDash([]); }
}
function drawThing(kind, x, y, s) {
  pen(C.muted, 1, 0.75); ctx.beginPath();
  if (kind === 0) { ctx.rect(x - 9 * s, y - 2.5 * s, 5 * s, 5 * s); ctx.rect(x + 4 * s, y - 2.5 * s, 5 * s, 5 * s); }
  else if (kind === 1) { ctx.arc(x, y, 4 * s, 0, TAU); ctx.moveTo(x - 4 * s, y); ctx.lineTo(x + 4 * s, y); }
  else if (kind === 2) { ctx.rect(x - 4 * s, y - 4 * s, 8 * s, 8 * s); ctx.moveTo(x - 4 * s, y - 4 * s); ctx.lineTo(x + 4 * s, y + 4 * s); }
  else if (kind === 3) { for (const [ox, oy, k] of [[-5, 1, 1], [1, 2, 1.3], [5, -1, 0.8]]) { ctx.moveTo(x + (ox - 2.5 * k) * s, y + (oy + 2 * k) * s); ctx.lineTo(x + ox * s, y + (oy - 2.4 * k) * s); ctx.lineTo(x + (ox + 2.5 * k) * s, y + (oy + 2 * k) * s); ctx.closePath(); } }
  else if (kind === 4) { ctx.rect(x - 6 * s, y - 3.5 * s, 12 * s, 7 * s); ctx.moveTo(x - 8.2 * s, y); ctx.arc(x - 10 * s, y, 1.8 * s, 0, TAU); ctx.moveTo(x + 11.8 * s, y); ctx.arc(x + 10 * s, y, 1.8 * s, 0, TAU); }
  else if (kind === 5) { ctx.ellipse(x, y, 9 * s, 4.5 * s, 0, 0, TAU); ctx.moveTo(x - 4 * s, y); ctx.quadraticCurveTo(x - 2 * s, y - 2 * s, x, y); ctx.quadraticCurveTo(x + 2 * s, y + 2 * s, x + 4 * s, y); }
  else if (kind === 6) { ctx.rect(x - 3.5 * s, y, 7 * s, 4 * s); ctx.moveTo(x + 3 * s, y - 3 * s); ctx.arc(x, y - 3 * s, 3 * s, 0, TAU); }
  else { ctx.moveTo(x - 5 * s, y - 3 * s); ctx.lineTo(x + 5 * s, y + 3 * s); ctx.moveTo(x - 5 * s, y + 3 * s); ctx.lineTo(x + 5 * s, y - 3 * s); for (const [ox, oy] of [[-5, -3], [5, 3], [-5, 3], [5, -3]]) { ctx.moveTo(x + ox * s + 1.3 * s, y + oy * s); ctx.arc(x + ox * s, y + oy * s, 1.3 * s, 0, TAU); } }
  ctx.stroke(); ctx.globalAlpha = 1;
}
// Where route a stands in a room: in its own bay.
function spotIn(a, U) {
  const r = D.rooms[U.i], n = U.req.length, i = Math.max(0, U.req.indexOf(a)), bw = r.w / n;
  return { x: r.x + bw * (i + 0.5), y: r.y + r.head + (r.h - r.head) * 0.56 };
}
const entrance = (a) => ({ x: D.ox, y: D.oy, wait: { x: D.ox + 18 * D.tq + (laneOf.get(a) || 0) * Math.min(13 * D.tq, (D.cols * D.cw - 30) / Math.max(1, lanes.length)), y: D.oy - 9 * D.tq } });
// The way along the corridors between two points that lie on them.
function lattice(p, q, seed) {
  if (Math.abs(p.y - q.y) < 0.5) return [p, q];
  // Down which corridor: the one beside the room it leaves or the one beside the room it goes to, by the draw.
  const from = (p.x - D.ox) / D.cw, to = (q.x - D.ox) / D.cw, near = q.x >= p.x ? Math.ceil(from - 1e-6) : Math.floor(from + 1e-6), far = q.x >= p.x ? Math.floor(to + 1e-6) : Math.ceil(to - 1e-6);
  const x = clamp(D.ox + (vary(seed) % 2 ? near : far) * D.cw, D.ox, D.ox + D.cols * D.cw);
  return [p, { x, y: p.y }, { x, y: q.y }, q];
}
function way(from, to) {
  const pts = [from.spot], a = from.room ? { x: from.room.door.x, y: from.room.lane } : { x: D.ox, y: D.oy }, b = to.room ? { x: to.room.door.x, y: to.room.lane } : { x: D.ox, y: D.oy };
  if (from.room) pts.push(from.room.door);
  pts.push(...lattice(a, b, (from.id ?? -1) * 131 + (to.id ?? -1) * 17 + 5));
  if (to.room) pts.push(to.room.door);
  pts.push(to.spot);
  return pts;
}
function along(pts, u) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  let left = total * clamp(u, 0, 1);
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (left <= len || i === pts.length - 1) { const k = len ? Math.min(1, left / len) : 1; return { x: lerp(pts[i - 1].x, pts[i].x, k), y: lerp(pts[i - 1].y, pts[i].y, k), dx: pts[i].x - pts[i - 1].x, total, done: total * clamp(u, 0, 1) }; }
    left -= len;
  }
  return { x: pts[0].x, y: pts[0].y, dx: 0, total, done: 0 };
}
// A figure is where it last did something, and leaves for the next place late enough to walk there at its own pace
// and arrive when that next thing is shown. The model has already left it the time the way takes; if the map has
// changed size since, it keeps to the time and lengthens or shortens its stride.
function walker(list, t, place, route, speed) {
  let lo = 0, hi = list.length - 1, i = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (list[m].t <= t) { i = m; lo = m + 1; } else hi = m - 1; }
  const here = place(i >= 0 ? list[i] : null), next = i + 1 < list.length ? list[i + 1] : null;
  if (next) {
    const pts = route(here, place(next)), full = along(pts, 1).total, gap = i >= 0 ? next.t - list[i].t - 0.25 : Infinity, dur = Math.min(full / speed, Math.max(0.15, gap));
    if (full > 1 && t >= next.t - dur) { const p = along(pts, (t - (next.t - dur)) / dur); return { x: p.x, y: p.y, walking: true, face: p.dx < -0.5 ? -1 : 1, stride: p.done, run: full / dur > speed * 1.5, at: i }; }
  }
  return { x: here.spot.x, y: here.spot.y, walking: false, face: 1, at: i, since: i >= 0 ? t - list[i].t : 0, home: !here.room && !here.G };
}
function partyAt(a, t) {
  const place = (c) => (c && c.u >= 0 ? { room: D.rooms[c.u], spot: spotIn(a, M.units[c.u]), id: c.u } : { room: null, spot: entrance(a).wait, id: -1 });
  const p = walker(walk.get(a), t, place, way, WALK * D.tq), list = walk.get(a), c = p.at >= 0 ? list[p.at] : null;
  return { ...p, unit: c && !p.walking ? c.u : -1, done: Boolean(c) && c.u < 0, out: !c };
}

// y is the ground under the figure. `stride` is how far it has walked on this way: the legs swing with the distance
// covered, not with the clock, so a foot stays where it was put down.
function figure(x, y, col, s, mode, t, face = 1, stride = 0, run = false, hat = 0) {
  ctx.fillStyle = C.bg;
  if (mode === "camp") {
    pen(col, 1.5); ctx.beginPath(); ctx.moveTo(x - 6.5 * s, y); ctx.lineTo(x, y - 11 * s); ctx.lineTo(x + 6.5 * s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    pen(col, 1.1); line(x, y - 11 * s, x, y); line(x - 9 * s, y, x + 9 * s, y);
    return;
  }
  const walking = mode === "walk", phase = stride / (STRIDE * s * (run ? 1.5 : 1)), swing = walking ? Math.sin(phase) : 0.28, bob = walking ? Math.abs(Math.cos(phase)) * (run ? 1.6 : 1) * s : 0, lean = walking ? face * (run ? 1.8 : 0.8) * s : 0;
  const hip = { x, y: y - 5.2 * s - bob }, neck = { x: x + lean, y: y - 10.2 * s - bob }, reach = (run ? 4 : 3) * s;
  pen(col, 1.5); if (mode === "rest") ctx.setLineDash([2, 2]);
  // legs: the feet stay on the ground line, one ahead and one behind
  line(hip.x, hip.y, x + face * swing * reach, y - (walking ? Math.max(0, Math.cos(phase)) * 1.4 * s : 0)); line(hip.x, hip.y, x - face * swing * reach, y - (walking ? Math.max(0, -Math.cos(phase)) * 1.4 * s : 0));
  line(hip.x, hip.y, neck.x, neck.y);
  ctx.beginPath(); ctx.arc(neck.x, neck.y - 2.4 * s, 2.4 * s, 0, TAU); ctx.fill(); ctx.stroke();
  // headgear, by the draw of this viewing: none, a pointed hat, a helmet with a crest, a hood
  const hx = neck.x, hy = neck.y - 2.4 * s;
  if (hat === 1) { ctx.beginPath(); ctx.moveTo(hx - 3.6 * s, hy - 1.6 * s); ctx.lineTo(hx + face * 0.8 * s, hy - 7.5 * s); ctx.lineTo(hx + 3.6 * s, hy - 1.6 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (hat === 2) { ctx.beginPath(); ctx.arc(hx, hy, 3.2 * s, Math.PI, 0); ctx.stroke(); line(hx - 3.8 * s, hy, hx + 3.8 * s, hy); line(hx, hy - 3.2 * s, hx - face * 2.2 * s, hy - 5.6 * s); }
  else if (hat === 3) { ctx.beginPath(); ctx.moveTo(hx - 3.2 * s, hy + 2.2 * s); ctx.quadraticCurveTo(hx - 4 * s, hy - 4.6 * s, hx + face * 0.6 * s, hy - 4.2 * s); ctx.quadraticCurveTo(hx + 3.6 * s, hy - 3 * s, hx + 3 * s, hy + 1.4 * s); ctx.stroke(); }
  // the free arm swings against the legs
  line(neck.x, neck.y + 1 * s, neck.x - face * (1.6 + swing * 1.8) * s, neck.y + 4.4 * s);
  ctx.setLineDash([]);
  if (mode === "rest") return;
  // the torch, held forward, and the light it throws
  const hand = { x: neck.x + face * 3.8 * s, y: neck.y + 1.2 * s }, top = { x: hand.x + face * 0.8 * s, y: hand.y - 5.6 * s }, f = FX() ? Math.sin(t * 9 + x * 0.1) * 0.9 : 0;
  pen(col, 1.4); line(neck.x, neck.y + 1 * s, hand.x, hand.y); line(hand.x, hand.y + 1.2 * s, top.x, top.y);
  pen(col, 1.2); ctx.beginPath(); ctx.moveTo(top.x - 1.5 * s, top.y); ctx.lineTo(top.x + f, top.y - 4 * s); ctx.lineTo(top.x + 1.5 * s, top.y); ctx.stroke();
  pen(col, 1, 0.5); ctx.setLineDash([2, 5]); ctx.lineDashOffset = FX() ? -t * 7 : 0; ctx.beginPath(); ctx.arc(x, y - 6 * s, 16 * s, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.globalAlpha = 1;
}
function stairs(x, y, s, col, width = 1.4) {
  pen(col, width); ctx.beginPath(); ctx.moveTo(x - 5 * s, y - 4 * s); ctx.lineTo(x - 5 * s, y + 4 * s); ctx.lineTo(x + 5 * s, y + 4 * s);
  ctx.moveTo(x - 5 * s, y - 4 * s); ctx.lineTo(x - 1.7 * s, y - 4 * s); ctx.lineTo(x - 1.7 * s, y - 1.3 * s); ctx.lineTo(x + 1.7 * s, y - 1.3 * s); ctx.lineTo(x + 1.7 * s, y + 1.4 * s); ctx.lineTo(x + 5 * s, y + 1.4 * s); ctx.lineTo(x + 5 * s, y + 4 * s); ctx.stroke();
}
// Unexplored ground is hatched. The hatching opens up with every search and is gone only when the record says so.
function fog(x, y, w, h, col, thin, dir) {
  if (w < 1 || h < 1) return;
  pen(col, 1, lerp(0.75, 0.5, thin)); hatch(x, y, w, h, lerp(4, 11, thin), dir); ctx.globalAlpha = 1;
}

function drawMap(S, t, pulse) {
  const { x0, x1, y0, y1, ox, oy, cw, ch, cols, rows } = D;
  pen(C.ink, 1 + pulse * 2.2); ctx.strokeRect(x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 6);
  pen(C.muted, 1); ctx.beginPath();
  for (let x = x0; x <= x1 + 0.5; x += 14) { ctx.moveTo(x, y0 - 6); ctx.lineTo(x, y0 - 6 - (Math.round((x - x0) / 14) % 4 === 0 ? 6 : 3)); }
  ctx.stroke();
  if (!order.length) { text("No review scope recorded yet", (x0 + x1) / 2, (y0 + y1) / 2, { align: "center", size: 11 }); return; }
  // The corridors.
  pen(C.hair, 1); ctx.setLineDash([2, 4]); ctx.beginPath();
  for (let r = 0; r <= rows; r++) { ctx.moveTo(ox, oy + r * ch); ctx.lineTo(ox + cols * cw, oy + r * ch); }
  for (let c = 0; c <= cols; c++) { ctx.moveTo(ox + c * cw, oy); ctx.lineTo(ox + c * cw, oy + rows * ch); }
  ctx.stroke(); ctx.setLineDash([]);
  // The way in, top left.
  const s = D.tq;
  pen(C.ink, 1.4); ctx.beginPath(); ctx.moveTo(ox - 6 * s, oy + 3 * s); ctx.lineTo(ox - 6 * s, oy - 8 * s); ctx.arc(ox, oy - 8 * s, 6 * s, Math.PI, 0); ctx.lineTo(ox + 6 * s, oy + 3 * s); ctx.stroke();
  if (D.q > 0.6) text("ENTRANCE", ox + 22 * s + lanes.length * 13 * s, oy - 9 * s, { size: 8 });
  for (const U of order) drawRoom(U, S.units[U.i], t);
}
function drawRoom(U, us, t) {
  if (us.shown < 0 || us.shown > t) return;
  const r = D.rooms[U.i], n = U.req.length, bw = r.w / n, cleared = us.broken >= 0, touched = us.cov.size > 0 || us.taps.size > 0, born = FX() ? clamp((t - Math.max(us.shown, us.reopen)) / 0.5, 0, 1) : 1, top = r.y + r.head, gap = Math.min(7 * D.tq, r.w * 0.2);
  hits.push({ rect: r, r: Math.max(r.w, r.h) / 2, tip: U.id.replace(/^@/, "") + "\n" + U.req.map((a) => M.routes[a].key + (us.cov.has(a) ? " ✓" : us.taps.has(a) ? " ×" + us.taps.get(a).n : us.cells.has(a) ? " ·" : " –")).join("  ") + "\n" + (cleared ? "explored" : us.reopen >= 0 ? "reopened" : touched ? "being explored" : "unexplored") });
  let dx = 0;
  if (FX() && us.hit >= 0 && t - us.hit < 0.2 && !cleared) { const g = t - us.hit; dx = Math.sin(g * 70) * 1.8 * us.hitK * (1 - g / 0.2); }
  ctx.save(); ctx.translate(dx, 0);
  tracePlan(r, true); ctx.fillStyle = C.bg; ctx.fill();
  // Inside the walls: the floor and what stands on it, then the hatching over whatever is still unexplored.
  ctx.save(); tracePlan(r, true); ctx.clip();
  if (r.floor) drawFloor(r, top);
  for (const g of r.things) drawThing(g.kind, r.x + r.w * g.fx, top + (r.h - r.head) * g.fy, D.tq * 0.85);
  U.req.forEach((a, i) => {
    if (!us.cells.has(a) || us.cov.has(a)) return;
    const tap = us.taps.get(a), prog = (k) => 1 - Math.exp(-k / 5), g = tap && FX() ? smooth(clamp((t - tap.t) / 0.3, 0, 1)) : 1;
    fog(r.x + i * bw, top, bw, r.h - r.head, routeColor(a), tap ? lerp(prog(Math.max(0, tap.n - 1)), prog(tap.n), g) : 0, M.routes[a].pattern % 2 ? -1 : 1);
  });
  pen(C.hair, 1, born); for (let i = 1; i < n; i++) { ctx.setLineDash([2, 3]); line(r.x + i * bw, top + 2, r.x + i * bw, r.y + r.h - 2); ctx.setLineDash([]); }
  if (r.head) { pen(C.hair, 1, born); line(r.x, top, r.x + r.w, top); }
  ctx.restore();
  // Walls: a single line, a thick wall drawn as two lines, or a line with a post at every corner. The gap is the
  // door, and a short passage runs from it to the corridor.
  const tone = us.reopen >= 0 ? C.sev.High : touched || cleared ? C.ink : C.muted, weight = touched && !cleared ? 1.5 : 1.2;
  if (r.wall === 1 && r.w >= 40) { pen(tone, weight + 3.2, born); tracePlan(r, false); ctx.stroke(); pen(C.bg, 2, 1); tracePlan(r, false); ctx.stroke(); }
  else { pen(tone, weight, born); tracePlan(r, false); ctx.stroke(); }
  if (r.wall === 2 && r.w >= 40 && r.plan !== 2 && r.plan !== 4) { ctx.fillStyle = C.bg; pen(tone, 1.1, born); for (const q of r.pts.slice(1, -1)) { ctx.beginPath(); ctx.rect(q.x - 2.3, q.y - 2.3, 4.6, 4.6); ctx.fill(); ctx.stroke(); } }
  pen(tone, 1.1, born); for (const q of [r.pts[0], r.pts[r.pts.length - 1]]) line(q.x, q.y - 2.5, q.x, q.y + 2.5);
  pen(C.hair, 1, born); ctx.setLineDash([2, 4]); line(r.door.x, r.y + r.h, r.door.x, r.lane); ctx.setLineDash([]);
  if (r.head) text(fit(U.label, r.w - 8 - r.inset[2] * 0.7, { size: 8.5 }), r.x + 4 + r.inset[2] * 0.7, r.y + r.head / 2 + 0.5, { size: 8.5, color: touched || cleared ? C.ink : C.muted, alpha: born });
  // A cleared bay keeps a small pennant in the colour of the route that cleared it.
  U.req.forEach((a, i) => {
    if (!us.cov.has(a)) return;
    const px = r.x + i * bw + Math.min(7, bw * 0.3), py = footAt(r, px) - 4, up = Math.min(9 * D.tq, (r.h - r.head) * 0.5) * (FX() ? backOut(clamp((t - us.cov.get(a)) / 0.35, 0, 1)) : 1);
    if (up < 1) return;
    pen(routeColor(a), 1.3); line(px, py, px, py - up); ctx.beginPath(); ctx.moveTo(px, py - up); ctx.lineTo(px + up * 0.6, py - up * 0.75); ctx.lineTo(px, py - up * 0.5); ctx.stroke();
  });
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawMapFx(t) {
  for (const e of recent(M, t, 1.15)) {
    if (e.type !== "tap" && e.type !== "cover" && e.type !== "reopen") continue;
    const U = M.units[e.u], r = D.rooms[e.u], age = t - e.t, col = routeColor(e.a), i = Math.max(0, U.req.indexOf(e.a)), bw = r.w / U.req.length, x = r.x + bw * (i + 0.5), y = r.y + r.head + (r.h - r.head) * 0.5;
    if (e.type === "tap") { streaks(x, y, age, col, e.i, 6, 0.4, 140 * D.tq, 60); if (e.n > 1) floatText("×" + e.n, x, r.y - 2, age, 0.55, col, 9); }
    else if (e.type === "cover") {
      ring(x, y, age, 0.4, 3, Math.max(bw, r.h) * 0.6, col, 1.4); burst(x, y, age, col, e.i, e.broke ? 22 : 10, 0.6, (e.broke ? 300 : 200) * D.tq, 80);
      if (e.broke) { echo(r, age, 0.45, C.ink, 0.35); echo(r, age - 0.07, 0.5, col, 0.6); }
      floatText(e.broke ? fit(U.label, 100, { size: 10 }) + " EXPLORED" : M.routes[e.a].key + " ✓", r.x + r.w / 2, r.y - 3, age, e.broke ? 1.0 : 0.75, e.broke ? C.ink : col, e.broke ? 10 : 9.5);
    } else { echo({ x: r.x - r.w * 0.2, y: r.y - r.h * 0.2, w: r.w * 1.4, h: r.h * 1.4 }, age, 0.5, C.sev.High, -0.3); floatText("REOPENED", r.x + r.w / 2, r.y - 3, age, 1.1, C.sev.High, 10); }
  }
}
// A candidate is a stairway down, found in the room it was raised on.
function drawStairways(S, t, act) {
  const used = new Map();
  M.cands.forEach((c, ci) => {
    const cs = S.cands[ci];
    if (cs.raised < 0 || c.unit < 0 || !D.rooms[c.unit]) return;
    const r = D.rooms[c.unit], slot = used.get(c.unit) || 0, s = clamp(D.tq * 0.9, 0.5, 1) * (FX() ? backOut(clamp((t - cs.raised) / 0.3, 0, 1)) : 1), x = r.x + r.w - 8 * D.tq - r.inset[1] * 0.6 - slot * 13 * D.tq, y = r.y + r.head + 8 * D.tq, col = routeColor(c.owner), decided = cs.verdict >= 0;
    used.set(c.unit, slot + 1);
    if (x < r.x + 6) return;
    ctx.fillStyle = C.bg; ctx.fillRect(x - 6.5 * s, y - 5.5 * s, 13 * s, 11 * s);
    stairs(x, y, s, decided ? (cs.out === "verified" ? C.sev[cs.sev] || C.ink : C.muted) : col, act === ci ? 2 : 1.4);
    if (act === ci) { pen(col, 1.3); brackets(x - 9 * s, y - 8 * s, 18 * s, 16 * s, 4); }
    ring(x, y, t - cs.raised, 0.4, 3, 26, col, 1.3);
    floatText(fit(c.id, 90, { size: 10 }) + " !", x, y - 9 * s, t - cs.raised, 1.0, col, 10);
    hits.push({ rect: { x: x - 8, y: y - 8, w: 16, h: 16 }, r: 7, tip: vaultTip(ci, cs, S, act === ci) });
  });
}
function drawParties(S, t) {
  const s = D.tq, quiet = [];
  lanes.forEach((a) => {
    const p = partyAt(a, t), col = routeColor(a), route = M.routes[a], running = !p.out && !p.done;
    figure(p.x, p.y + 6 * s, col, s, HOLD && running ? "camp" : p.walking ? "walk" : running ? "search" : "rest", t, p.face, p.stride, p.run, vary(a * 71 + 5) % 4);
    if (p.done) { pen(col, 1.4); ctx.beginPath(); ctx.moveTo(p.x - 3, p.y + 11 * s); ctx.lineTo(p.x - 0.8, p.y + 11 * s + 2.2); ctx.lineTo(p.x + 3, p.y + 11 * s - 2.4); ctx.stroke(); }
    if (D.q > 0.55 && !p.out && !p.done) text(route.key, p.x - p.face * 9 * s, p.y - 9 * s, { align: "center", size: 8.5, w: 600, color: col });
    if (running && !p.walking && p.since > 4 && !HOLD) quiet.push(route.key + " " + clock(p.since), col);
    hits.push({ rect: { x: p.x - 9, y: p.y - 12, w: 18, h: 22 }, r: 8, tip: bare(route.skill) + "\n" + (p.out ? "not started" : p.done ? "done" : p.walking ? "on its way" : "searching " + M.units[p.unit].label) });
  });
  // A route that has made no call for a while is listed at the entrance with the time since its last one.
  let x = D.ox + 80 * s + lanes.length * 13 * s;
  if (D.q > 0.6) for (let i = 0; i < quiet.length; i += 2) { text(quiet[i], x, D.oy - 9 * s, { size: 9, color: quiet[i + 1] }); x += quiet[i].length * 5.6 + 12; }
  // A call that touched no file in scope: the figure of the route that made it looks about.
  for (let i = callsBefore(M, t) - 1; i >= 0 && t - M.CALLS[i].t < 0.5; i--) {
    const e = M.CALLS[i];
    if (e.a === FLOW_SIDE) ring(D.ox, D.oy, t - e.t, 0.5, 6, 20 * s, C.ink, 1);
    else if (laneOf.has(e.a) && e.u < 0) { const p = partyAt(e.a, t); ring(p.x, p.y, t - e.t, 0.5, 5, 20 * s, routeColor(e.a), 1.1); }
  }
}
function drawMarks(act) {
  if (!locate || !D.rooms[locate.u]) { locate = null; return; }
  const age = (performance.now() - locate.at) / 1000, k = (age * 1.5) % 1, g = 6 + 16 * k, r = D.rooms[locate.u];
  pen(C.ink, 1.6, 1 - k); ctx.strokeRect(r.x - g, r.y - g, r.w + 2 * g, r.h + 2 * g); pen(C.ink, 1.8); brackets(r.x - 5, r.y - 5, r.w + 10, r.h + 10, 9); ctx.globalAlpha = 1;
  if (age > 4) locate = null;
}

function verdictColor(cs) { return cs.out === "verified" ? (C.sev[cs.sev] || C.ink) : cs.out === "observation" || cs.out === "residual_risk" ? C.sev.note : C.muted; }
function vaultStatus(ci, cs, S, active) {
  const c = M.cands[ci], lost = cs.els.findIndex((x) => x && x.pass === false);
  if (cs.verdict >= 0) return { s: cs.out === "verified" ? (cs.sev || "verified").toUpperCase() : OUT_LABEL[cs.out], col: cs.out === "open" ? C.ink : verdictColor(cs) };
  if (lost >= 0) return { s: c.els[lost].label + " failed", col: C.sev.Critical };
  if (active) { const k = cs.els.findIndex((x) => !x); return { s: k >= 0 ? "at the " + c.els[k].label + " door" : "at the chest", col: routeColor(c.owner) }; }
  if (S.phase === 1 && cs.els.some((x) => x)) return { s: "waiting for re-review", col: C.sev.High };
  return { s: S.phase >= 2 ? "queued" : "awaiting verification", col: C.muted };
}
function vaultTip(ci, cs, S, active) {
  const c = M.cands[ci];
  return c.id + " · " + c.title + (c.owner >= 0 ? "\nraised by " + bare(M.routes[c.owner].skill) : "") + (c.location ? "\n" + c.location : "") + "\n" + c.els.map((e, k) => e.label + " " + (!cs.els[k] ? "·" : cs.els[k].pass === true ? "✓" : cs.els[k].pass === false ? "✗" : "?")).join("  ") + "\n" + vaultStatus(ci, cs, S, active).s.toLowerCase();
}
function vaultLayout(S, act, B, p2) {
  const raised = [];
  S.cands.forEach((c, i) => { if (c.raised >= 0) raised.push(i); });
  raised.sort((x, y) => S.cands[x].raised - S.cands[y].raised || x - y);
  const n = raised.length, maxCols = Math.max(1, Math.floor((B.w - 28) / 150));
  const plan = (focusH) => {
    const top = B.y + 54 + focusH, avail = Math.max(30, B.y + B.h - 12 - top);
    for (let cols = 1; cols <= maxCols; cols++) {
      const per = Math.ceil(Math.max(n, 1) / cols), rowH = avail / Math.max(per, cols === 1 ? 3 : 1);
      if (rowH >= (cols === 1 ? 24 : 16)) return { top, cols, per, rowH: Math.min(rowH, 98), focusH, shown: n };
    }
    const per = Math.max(1, Math.floor(avail / 16));
    return { top, cols: maxCols, per, rowH: 16, focusH, shown: Math.min(n, per * maxCols) };
  };
  const want = B.h > 380 && B.w > 300 ? 108 * (1 - p2) : 0;
  let lay = plan(want);
  if (want > 0 && (lay.shown < n || lay.rowH < 46)) lay = plan(0);
  let focus = raised.indexOf(act);
  if (focus < 0) { let best = -1; raised.forEach((ci, k) => { if (S.cands[ci].verdict >= 0 && (best < 0 || S.cands[ci].verdict >= S.cands[raised[best]].verdict)) best = k; }); focus = best < 0 ? n - 1 : best; }
  const first = clamp(focus - Math.floor(lay.shown / 2), 0, Math.max(0, n - lay.shown)), rows = raised.slice(first, first + lay.shown);
  return { ...lay, B, raised, rows, colW: (B.w - 28) / lay.cols, index: new Map(rows.map((ci, i) => [ci, i])), order: new Map(raised.map((ci, i) => [ci, i])) };
}
// A room of level 2, built like the rooms of level 1 from its own seed: a closed outline (plain, cut corners,
// rounded, or with a rough ceiling and floor), a wall, a floor and perhaps one thing in it. `cy` is the height of the
// doors, which the corners keep clear of.
function chainLook(ci, j, x, y, w, h, cy) {
  const rnd = mulberry(vary(ci * 7919 + j * 131 + 17)), x1 = x + w, y1 = y + h, m = Math.min(w, h), roll = rnd(), plan = m < 26 ? 0 : roll < 0.28 ? 0 : roll < 0.58 ? 1 : roll < 0.8 ? 2 : 3;
  const lim = m * 0.26, free = [cy - y - 6, cy - y - 6, y1 - cy - 6, y1 - cy - 6], inset = [0, 0, 0, 0], at = [[x, y, 1, 1, Math.PI], [x1, y, -1, 1, -Math.PI / 2], [x1, y1, -1, -1, 0], [x, y1, 1, -1, Math.PI / 2]], pts = [];
  if (plan === 1 || plan === 2) for (let i = 0; i < 4; i++) inset[i] = rnd() < 0.65 ? Math.max(0, Math.min(lim * (0.45 + 0.55 * rnd()), free[i])) : 0;
  at.forEach(([px, py, sx, sy, a0], i) => {
    const c = inset[i];
    if (c < 1) pts.push({ x: px, y: py });
    else for (let k = 0, n = plan === 2 ? 5 : 1; k <= n; k++) { const a = a0 + k / n * Math.PI / 2; pts.push({ x: px + sx * c + Math.cos(a) * c, y: py + sy * c + Math.sin(a) * c }); }
    // a rough ceiling and floor: the long walls wander inwards
    if (plan === 3 && i % 2 === 0) { const amp = Math.min(4, h * 0.08), n = Math.max(1, Math.round(w / 20)), dir = i === 0 ? 1 : -1; for (let k = 1; k < n; k++) pts.push({ x: (i === 0 ? x : x1) + dir * w * k / n, y: py + sy * amp * (0.25 + 0.75 * rnd()) }); }
  });
  const big = w >= 64 && h >= 40;
  return { x, y, w, h, pts, inset: [0, inset[1], inset[0], 0], head: h >= 34 && w >= 44 ? 11 : 0, wall: m >= 30 && rnd() < 0.35 ? 1 : 0, floor: m < 30 ? 0 : [0, 0, 1, 2, 3, 4][Math.floor(rnd() * 6)], step: 9 + 5 * rnd(), seed: Math.floor(rnd() * 1e6), things: big && rnd() < 0.55 ? [{ kind: Math.floor(rnd() * 8), fx: 0.74 + 0.12 * rnd(), fy: rnd() < 0.5 ? 0.3 : 0.74 }] : [] };
}
// One passage: a text block, the shaft the figure comes down, the stairway, then a chain of rooms, one per gate,
// joined by doors, and the chamber with the chest at the end. The rooms differ in width, height and plan, and sit a
// little higher or lower than each other; the doors are all at one height.
function vaultGeom(ci, win) {
  const idx = win.index.get(ci);
  if (idx == null) return null;
  const c = M.cands[ci], B = win.B, col = Math.floor(idx / win.per), row = idx % win.per, R = { x: B.x + 14 + col * win.colW, y: win.top + row * win.rowH, w: win.colW - (win.cols > 1 ? 14 : 0), h: win.rowH - (win.rowH >= 34 ? 10 : 3) };
  const full = R.h >= 30 && R.w >= 400, lw = full ? clamp(R.w * 0.33, 130, 280) : R.w >= 300 ? R.w * 0.36 : Math.min(54, R.w * 0.36), cy = R.y + R.h / 2, n = c.els.length;
  const shaft = R.x + lw + 4, x0 = shaft + (full ? 22 : 9), x1 = R.x + R.w - 2, end = clamp(R.h * 1.05, 9, 76), link = clamp((x1 - x0) * 0.03, 7, 16), each = (x1 - x0 - end - link * (n + 1)) / n, mini = each < 22 || R.h < 34;
  if (mini) { const room = clamp(R.h * 0.8, 9, 30), span = (x1 - room - x0) / n; return { R, full, lw, cy, hh: clamp(R.h * 0.2, 2.5, 6), shaft, x0, x1: x1 - room, mini, room, doors: c.els.map((e, j) => x0 + span * (j + 0.8)), chest: { x: x1 - room / 2, y: cy }, cells: null }; }
  const rnd = mulberry(vary(ci * 389 + 7)), share = c.els.map(() => 0.8 + 0.4 * rnd()), sum = share.reduce((p, q) => p + q, 0), cells = [];
  let x = x0 + link;
  c.els.forEach((e, j) => { const w = each * n * share[j] / sum, h = R.h * (0.7 + 0.3 * rnd()), y = cy - h / 2 + (rnd() - 0.5) * (R.h - h) * 0.7; cells.push(chainLook(ci, j, x, y, w, h, cy)); x += w + link; });
  const vault = chainLook(ci, n, x, R.y, x1 - x, R.h, cy);
  vault.wall = 1; vault.head = 0; vault.things = [];
  return { R, full, lw, cy, hh: 3, shaft, x0, x1, mini, link, cells, vault, chest: { x: vault.x + vault.w / 2, y: cy } };
}
// When the passage of a candidate is drawn in: they open one after another once the level is in view.
const opened = (ci, cs, win) => Math.max(cs.raised + 0.5, M.tBench + 0.9 + (win.order.get(ci) || 0) * Math.min(STAGGER, 2 / Math.max(1, win.raised.length)));
// Level 2. The crypto-fp-check figure goes where the record puts it: to the door a verification call struck, to the
// door whose gate was recorded, to the chest for the verdict. The way between two passages is back to the shaft,
// along the gallery over the passages, and in again.
function verifierAt(t, win) {
  const B = win.B, rest = { x: B.x + 34, y: win.top - 14 }, stand = (G, k) => (G.cells ? { x: k < G.cells.length ? G.cells[k].x + G.cells[k].w * 0.42 : G.vault.x + Math.min(12, G.vault.w * 0.22), y: G.cy } : { x: (k < G.doors.length ? G.doors[k] : G.chest.x - G.room / 2) - Math.max(8, G.hh * 1.7), y: G.cy });
  const place = (c) => { const G = c ? vaultGeom(c.c, win) : null; return G ? { spot: stand(G, c.k), G } : { spot: rest, G: null }; };
  const route = (a, b) => (a.G && b.G && Math.abs(a.spot.y - b.spot.y) < 0.5 ? [a.spot, b.spot] : [a.spot, ...(a.G ? [{ x: a.G.shaft, y: a.spot.y }, { x: a.G.shaft, y: rest.y }] : []), ...(b.G ? [{ x: b.G.shaft, y: rest.y }, { x: b.G.shaft, y: b.spot.y }] : []), b.spot]);
  return walker(V, t, place, route, WALK * 1.25);
}
// A chest is one of three makes: plain, iron-banded, or on feet with a lock.
function chest(x, y, s, col, open, width = 1.4, make = 0) {
  ctx.fillStyle = C.bg; ctx.beginPath(); ctx.rect(x - 6 * s, y - 1 * s, 12 * s, 6.5 * s); ctx.fill(); pen(col, width); ctx.stroke();
  if (make === 1) { pen(col, 1); line(x - 3 * s, y - 1 * s, x - 3 * s, y + 5.5 * s); line(x + 3 * s, y - 1 * s, x + 3 * s, y + 5.5 * s); pen(col, width); }
  else if (make === 2) { pen(col, 1); line(x - 5 * s, y + 5.5 * s, x - 5 * s, y + 7.2 * s); line(x + 5 * s, y + 5.5 * s, x + 5 * s, y + 7.2 * s); ctx.strokeRect(x - 1.2 * s, y + 0.4 * s, 2.4 * s, 2.4 * s); pen(col, width); }
  ctx.beginPath();
  if (open) { ctx.moveTo(x - 6 * s, y - 1 * s); ctx.lineTo(x - 7.5 * s, y - 6.5 * s); ctx.lineTo(x + 4.5 * s, y - 6.5 * s); ctx.lineTo(x + 6 * s, y - 1 * s); }
  else { ctx.moveTo(x - 6 * s, y - 1 * s); ctx.quadraticCurveTo(x, y - 8 * s, x + 6 * s, y - 1 * s); ctx.moveTo(x, y - 1 * s); ctx.lineTo(x, y + 1.6 * s); }
  ctx.stroke();
}
function gem(x, y, r, col, t) {
  ctx.fillStyle = C.bg; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.82, y - r * 0.3); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.82, y - r * 0.3); ctx.closePath(); ctx.fill(); pen(col, 1.7); ctx.stroke();
  pen(col, 1); line(x - r * 0.82, y - r * 0.3, x + r * 0.82, y - r * 0.3);
  pen(col, 1.2); for (let i = 0; i < 6; i++) { const a = -Math.PI * (i + 0.5) / 6, r0 = r + 3, l = 3 + (FX() ? 1.5 * Math.sin(t * 5 + i * 1.7) : 0); line(x + Math.cos(a) * r0, y - r * 0.2 + Math.sin(a) * r0, x + Math.cos(a) * (r0 + l), y - r * 0.2 + Math.sin(a) * (r0 + l)); }
}
// One room of a chain. `state` is "ahead" (not reached, hatched), "here" (being searched, the hatching thinning),
// "done", "lost" (its gate failed) or "dead" (behind a failed gate).
function drawCell(rm, o) {
  const top = rm.y + rm.head, tone = o.state === "lost" ? C.sev.Critical : o.state === "here" || o.state === "done" ? C.ink : C.muted, gap = rm.wall === 1 ? 4.5 : 2.5;
  tracePlan(rm, true); ctx.fillStyle = C.bg; ctx.fill();
  ctx.save(); tracePlan(rm, true); ctx.clip();
  if (rm.floor) drawFloor(rm, top);
  for (const g of rm.things) drawThing(g.kind, rm.x + rm.w * g.fx, top + (rm.h - rm.head) * g.fy, 0.8);
  if (o.state === "ahead" || o.state === "here") fog(rm.x, top, rm.w, rm.h - rm.head, o.col, o.thin || 0, 1);
  else if (o.state !== "done") { pen(C.muted, 1, 0.45); hatch(rm.x, rm.y, rm.w, rm.h, 5, 1); hatch(rm.x, rm.y, rm.w, rm.h, 5, -1); ctx.globalAlpha = 1; }
  if (rm.head) { pen(C.hair, 1); line(rm.x, top, rm.x + rm.w, top); }
  ctx.restore();
  if (rm.wall === 1) { pen(tone, (o.state === "here" ? 1.5 : 1.2) + 3.2); tracePlan(rm, true); ctx.stroke(); pen(C.bg, 2); tracePlan(rm, true); ctx.stroke(); }
  else { pen(tone, o.state === "here" ? 1.5 : 1.2); if (o.dash) ctx.setLineDash([3, 3]); tracePlan(rm, true); ctx.stroke(); ctx.setLineDash([]); }
  // the doorways: gaps in the side walls, at the height all the doors of the chain are at
  ctx.fillStyle = C.bg; ctx.fillRect(rm.x - gap, o.cy - 3, 2 * gap, 6); if (!o.last) ctx.fillRect(rm.x + rm.w - gap, o.cy - 3, 2 * gap, 6);
  if (rm.head && o.label) text(fit(o.label, rm.w - 8, { size: 7.5 }), rm.x + 4 + rm.inset[2] * 0.7, rm.y + rm.head / 2 + 0.8, { size: 7.5, w: o.state === "here" ? 600 : 400, color: o.state === "here" ? o.col : o.state === "done" ? C.ink : o.state === "lost" ? C.sev.Critical : C.muted });
}
function drawChain(ci, cs, t, G, start, win) {
  const c = M.cands[ci], col = routeColor(c.owner), cy = G.cy, st = cs.els, n = c.els.length, decided = cs.verdict >= 0, age = t - cs.verdict, big = G.full;
  const lit = decided && cs.out === "verified", noted = decided && (cs.out === "observation" || cs.out === "residual_risk"), fp = decided && cs.out === "false_positive", vcol = verdictColor(cs);
  const built = FX() ? clamp((t - start) / 0.7, 0, 1) : 1, reach = lerp(G.shaft, G.x1, built), rooms = [...G.cells, G.vault];
  let closed = 0; while (closed < n && st[closed] && st[closed].pass === true) closed++;
  const failed = closed < n && Boolean(st[closed]) && st[closed].pass === false, dead = failed || fp, quiet = noted ? C.muted : col;
  // The stairway it was found by, at the foot of the shaft, and the way in.
  pen(C.hair, 1); ctx.setLineDash([2, 4]); line(G.shaft, cy, Math.min(reach, G.x0 - 9), cy); ctx.setLineDash([]);
  if (reach > G.x0) stairs(G.x0 - 3, cy, 0.8, dead ? C.muted : col);
  // The links between the rooms, each with a door that opens when the gate of the room before it has passed.
  rooms.forEach((rm, j) => {
    if (rm.x > reach) return;
    const from = j === 0 ? G.x0 + 4 : rooms[j - 1].x + rooms[j - 1].w, s = j > 0 ? st[j - 1] : null, open = j === 0 || (s && s.pass === true), xm = (from + rm.x) / 2;
    pen(j <= closed && !(dead && j > closed) ? C.ink : C.muted, 1.1); line(from, cy - 3.5, rm.x, cy - 3.5); line(from, cy + 3.5, rm.x, cy + 3.5);
    if (j === 0) return;
    if (open) { const swing = FX() ? backOut(clamp((t - s.t) / 0.3, 0, 1)) : 1, a = lerp(Math.PI / 2, 0.25, swing); pen(col, 1.6); line(xm, cy - 3.5, xm + Math.cos(a) * 7, cy - 3.5 + Math.sin(a) * 7); }
    else {
      // a shut door is one of three makes: a single leaf, a double door, or a grating
      const make = vary(ci * 59 + 4) % 3;
      pen(s && s.pass === false ? C.sev.Critical : j === closed + 1 && !dead ? C.ink : C.muted, make ? 1.3 : 1.8);
      if (make === 1) { line(xm - 1.3, cy - 5.5, xm - 1.3, cy + 5.5); line(xm + 1.3, cy - 5.5, xm + 1.3, cy + 5.5); }
      else if (make === 2) { for (const o of [-2.6, 0, 2.6]) line(xm + o, cy - 5.5, xm + o, cy + 5.5); line(xm - 3.6, cy, xm + 3.6, cy); }
      else line(xm, cy - 5.5, xm, cy + 5.5);
    }
  });
  G.cells.forEach((rm, j) => {
    if (rm.x > reach) return;
    const s = st[j], el = c.els[j], hit = cs.hits.get(j), state = j < closed ? "done" : j === closed ? (failed ? "lost" : fp ? "dead" : "here") : dead ? "dead" : "ahead", mx = rm.x + rm.w / 2;
    let thin = 0;
    if (state === "here" && hit) { const prog = (k) => 1 - Math.exp(-k / 5), g = FX() ? smooth(clamp((t - hit.t) / 0.3, 0, 1)) : 1; thin = lerp(prog(Math.max(0, hit.n - 1)), prog(hit.n), g); }
    let dx = 0;
    if (FX() && state === "here" && hit && t - hit.t < 0.2) { const g = t - hit.t; dx = Math.sin(g * 70) * 1.6 * (1 - g / 0.2); }
    ctx.save(); ctx.translate(dx, 0);
    drawCell(rm, { state: state === "here" && noted ? "ahead" : state, col: quiet, thin, cy, label: el.label.toUpperCase(), dash: Boolean(s) && s.pass === null });
    if (state === "done") {
      const px = rm.x + Math.min(8, rm.w * 0.25), py = footAt(rm, px) - 4, up = Math.min(9, (rm.h - rm.head) * 0.45) * (FX() ? backOut(clamp((t - s.t) / 0.35, 0, 1)) : 1);
      if (up > 1) { pen(col, 1.3); line(px, py, px, py - up); ctx.beginPath(); ctx.moveTo(px, py - up); ctx.lineTo(px + up * 0.6, py - up * 0.75); ctx.lineTo(px, py - up * 0.5); ctx.stroke(); }
    }
    if (state === "lost") { pen(C.sev.Critical, 1.6); line(mx - 4, cy - 4, mx + 4, cy + 4); line(mx + 4, cy - 4, mx - 4, cy + 4); }
    if (s && s.pass === null) text("?", mx, cy, { align: "center", size: 10, color: C.ink });
    ctx.restore();
    if (!s) return;
    const ga = t - s.t, tone = s.pass === true ? col : s.pass === false ? C.sev.Critical : C.muted;
    ring(mx, cy, ga, 0.4, 4, Math.max(rm.w, rm.h) * 0.6, tone, 1.3); burst(mx, cy, ga, tone, ci * 13 + j, 10, 0.45, 160, 60);
    if (big) floatText(el.label + (s.pass === true ? " ✓" : s.pass === false ? " ✗" : " ?"), mx, rm.y - 4, ga, 0.9, tone, 10);
  });
  // The chamber at the end, and what the chest in it holds.
  const vm = G.vault;
  if (vm.x > reach) return;
  const seen = closed === n && !dead, sc = clamp(Math.min(vm.w, vm.h) / 34, 0.5, 1.5), cx = G.chest.x;
  drawCell(vm, { state: seen ? (decided ? "done" : "here") : dead ? "dead" : "ahead", col: quiet, thin: seen ? 1 : 0, cy, last: true });
  if (seen || lit || noted) {
    // a dais for the chest to stand on
    pen(C.hair, 1); ctx.strokeRect(cx - 10 * sc, cy + 5.5 * sc, 20 * sc, 3 * sc);
    if (lit) { chest(cx, cy + 0.5 * sc, sc, vcol, true, 1.6, vary(ci * 67 + 1) % 3); gem(cx, cy - 7 * sc, 4.8 * sc * (FX() ? backOut(clamp(age / 0.3, 0, 1)) : 1), vcol, t); }
    else if (noted) { pen(vcol, 1.3); ctx.fillStyle = C.bg; ctx.beginPath(); ctx.rect(cx - 4.5 * sc, cy - 6.5 * sc, 9 * sc, 11 * sc); ctx.fill(); ctx.stroke(); pen(vcol, 1); for (const o of [-3.4, -1, 1.4]) line(cx - 2.6 * sc, cy + o * sc, cx + 2.6 * sc, cy + o * sc); }
    else chest(cx, cy + 0.5 * sc + (FX() && !HOLD && !decided ? Math.sin(t * 4) * 0.6 : 0), sc, C.ink, false, 1.4, vary(ci * 67 + 1) % 3);
  }
  if (decided && cs.out === "open") text("?", cx, cy - 8 * sc, { align: "center", size: 10, color: C.ink });
  if (!decided) return;
  const tx = Math.min(cx, win.B.x + win.B.w - 54), ty = vm.y - (big ? 6 : 2);
  if (lit) { burst(cx, cy, age, vcol, ci + 700, big ? 30 : 12, 0.8, big ? 360 : 180, 100); ring(cx, cy, age, 0.55, big ? 8 : 4, big ? 96 : 40, vcol, 1.6); if (big) ring(cx, cy, age - 0.09, 0.55, 8, 60, C.ink, 1); floatText((cs.sev || "verified").toUpperCase(), tx, ty, age, 1.3, vcol, big ? 13 : 9.5); }
  else if (noted) { ring(cx, cy, age, 0.45, 5, big ? 44 : 20, vcol, 1.2); if (big) floatText(OUT_LABEL[cs.out], tx, ty, age, 1.2, vcol, 10); }
  else if (fp) { streaks(cx, cy, age, C.muted, ci + 900, big ? 10 : 5, 0.6, 160, 200); if (big) floatText(OUT_LABEL[cs.out], tx, ty, age, 1.2, C.muted, 10); }
  else { echo({ x: vm.x - 3, y: vm.y - 3, w: vm.w + 6, h: vm.h + 6 }, age, 0.45, C.ink, 0.6); if (big) floatText(OUT_LABEL[cs.out], tx, ty, age, 1.2, C.ink, 10); }
}
function drawVault(ci, cs, S, t, active, win, live) {
  const G = vaultGeom(ci, win);
  if (!G) return;
  const c = M.cands[ci], R = G.R, col = routeColor(c.owner), cy = G.cy, hh = G.hh, st = cs.els, n = c.els.length, stt = vaultStatus(ci, cs, S, active), decided = cs.verdict >= 0, age = t - cs.verdict;
  const lit = decided && cs.out === "verified", noted = decided && (cs.out === "observation" || cs.out === "residual_risk"), fp = decided && cs.out === "false_positive", vcol = verdictColor(cs), lx = R.x + 6, mw = G.lw - 14;
  if (G.full) {
    const three = R.h > 50, idw = Math.min(mw * 0.5, c.id.length * 6.8 + 8);
    pen(C.faint, 1); line(R.x, R.y + R.h + 5, R.x + R.w, R.y + R.h + 5);
    text(fit(c.id, idw, { size: 11, w: 500 }), lx, cy - (three ? 13 : 7), { size: 11, w: 500, color: fp ? C.muted : C.ink });
    text(fit(stt.s, mw - idw - 4, { size: 9.5 }), lx + idw + 4, cy - (three ? 13 : 7), { size: 9.5, color: stt.col });
    text(fit(c.title, mw, { size: 9.5 }), lx, cy + (three ? 1 : 7), { size: 9.5, color: C.ink, alpha: 0.85 });
    if (three) text(fit(c.location + (c.owner >= 0 ? " · " + M.routes[c.owner].key : ""), mw, { size: 8.5 }), lx, cy + 14, { size: 8.5 });
  } else {
    const size = clamp(R.h * 0.6, 8, 10.5), wide = R.w >= 300, idw = wide ? Math.min(mw * 0.45, c.id.length * size * 0.62 + 6) : G.lw - 2;
    text(fit(c.id, idw, { size, w: 500 }), R.x + 3, cy, { size, w: 500, color: fp ? C.muted : C.ink });
    if (wide) text(fit(c.title, G.lw - idw - 10, { size: size - 0.5 }), R.x + 3 + idw + 6, cy, { size: size - 0.5 });
  }
  if (active) { pen(C.ink, 1.2); brackets(R.x - 2, R.y - 1, R.w + 4, R.h + 2, Math.min(9, R.h / 2)); }
  if (live) hits.push({ rect: R, r: R.w / 2, tip: vaultTip(ci, cs, S, active) });
  const start = opened(ci, cs, win);
  if (FX() && t < start) return;
  if (G.cells) { drawChain(ci, cs, t, G, start, win); return; }
  // What follows is the passage of a row too small for rooms: a line, a mark per door, a box for the chamber.
  const built = FX() ? clamp((t - start) / 0.6, 0, 1) : 1, reach = lerp(G.shaft, G.x1 + G.room, built);
  let closed = 0; while (closed < n && st[closed] && st[closed].pass === true) closed++;
  const failed = closed < n && Boolean(st[closed]) && st[closed].pass === false, dead = failed || fp, cuts = [G.x0, ...G.doors, G.x1];
  // The passage, cell by cell: the ones behind a closed door are still hatched.
  for (let j = 0; j <= n; j++) {
    const a = cuts[j], b = Math.min(cuts[j + 1], reach);
    if (b <= a) break;
    const seen = j <= closed && !(dead && j > closed);
    if (!seen && !G.mini) { if (dead) { pen(C.muted, 1, 0.45); hatch(a + 1, cy - hh, b - a - 1, hh * 2, 5, 1); hatch(a + 1, cy - hh, b - a - 1, hh * 2, 5, -1); ctx.globalAlpha = 1; } else fog(a + 1, cy - hh, b - a - 1, hh * 2, col, 0, 1); }
    pen(seen ? C.ink : C.muted, seen ? 1.2 : 1); if (G.mini) { if (!seen) ctx.setLineDash([1, 3]); line(a, cy, b, cy); ctx.setLineDash([]); } else { line(a, cy - hh, b, cy - hh); line(a, cy + hh, b, cy + hh); }
  }
  // The stairway it was found by, at the foot of the shaft.
  if (reach > G.x0 - 4) { const s = clamp(hh / 5, 0.45, 1); pen(C.hair, 1); ctx.setLineDash([2, 4]); line(G.shaft, cy, G.x0 - 6 * s, cy); ctx.setLineDash([]); stairs(G.x0 - 6 * s - 5 * s, cy, s, dead ? C.muted : col); }
  // The doors.
  c.els.forEach((el, k) => {
    const x = G.doors[k];
    if (x > reach) return;
    const s = st[k], front = k === closed && !dead, hit = front && !s ? cs.hits.get(k) || null : null, tone = !s ? (front && (active || hit) ? col : k > closed ? C.muted : C.ink) : s.pass === true ? col : s.pass === false ? C.sev.Critical : C.muted;
    let dx = 0;
    if (FX() && hit && t - hit.t < 0.2) { const g = t - hit.t; dx = Math.sin(g * 70) * 2 * (1 - g / 0.2); }
    if (G.mini) {
      pen(tone, 1.3);
      if (!s) { ctx.beginPath(); ctx.arc(x, cy, 1.8, 0, TAU); ctx.stroke(); }
      else if (s.pass === true) line(x, cy - 4, x + 3, cy - 1);
      else if (s.pass === false) { line(x - 2.5, cy - 2.5, x + 2.5, cy + 2.5); line(x + 2.5, cy - 2.5, x - 2.5, cy + 2.5); }
      else { ctx.setLineDash([1.5, 2]); line(x, cy - 4, x, cy + 4); ctx.setLineDash([]); }
    } else if (s && s.pass === true) {
      // Open: the leaf swung back against the wall.
      const swing = FX() ? backOut(clamp((t - s.t) / 0.3, 0, 1)) : 1, ang = -Math.PI / 2 + swing * 1.15;
      pen(tone, 1.5); line(x, cy - hh, x + Math.cos(ang) * hh * 1.9, cy - hh - Math.sin(ang) * hh * 1.9 * -1);
      pen(tone, 1.2); line(x, cy - hh - 3, x, cy - hh); line(x, cy + hh, x, cy + hh + 3);
    } else {
      pen(tone, s && s.pass === false ? 1.8 : front ? 1.7 : 1.3); if (s && s.pass === null) ctx.setLineDash([2, 2.5]);
      ctx.fillStyle = C.bg;
      if (el.kind === "poc") { for (const o of [-2.4, 0, 2.4]) line(x + dx + o, cy - hh - 2, x + dx + o, cy + hh + 2); line(x + dx - 3.6, cy, x + dx + 3.6, cy); }
      else { ctx.beginPath(); ctx.rect(x + dx - 1.8, cy - hh - 2, 3.6, hh * 2 + 4); ctx.fill(); ctx.stroke(); }
      ctx.setLineDash([]);
      // Every blow leaves a mark on the door; it gives only when its gate is recorded.
      if (hit) { const rnd = mulberry(ci * 97 + k * 13 + 5), marks = Math.ceil((1 - Math.exp(-hit.n / 5)) * 6); pen(tone, 1.1); for (let i = 0; i < marks; i++) { const my = cy - hh + (i + 0.5) / 6 * hh * 2 + (rnd() - 0.5) * 2, len = 3 + rnd() * 3; line(x + dx - 2 - len, my - len * 0.5, x + dx - 2, my); } }
      if (s && s.pass === false) { pen(C.sev.Critical, 1.5); line(x - 3, cy - hh - 11, x + 3, cy - hh - 5); line(x + 3, cy - hh - 11, x - 3, cy - hh - 5); }
      if (s && s.pass === null) text("?", x, cy - hh - 8, { align: "center", size: 9.5, color: C.ink });
      if (front && active && !HOLD && FX()) { const g = (t * 1.3) % 1; pen(col, 1.1, 1 - g); ctx.beginPath(); ctx.arc(x, cy, 5 + 10 * g, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    if (!G.mini && R.h > 46) text(el.label, x, cy + hh + 11, { align: "center", size: 8, color: s && s.pass === true ? C.ink : C.muted });
    if (s) {
      const ga = t - s.t;
      streaks(x, cy, ga, tone, ci * 13 + k, 9, 0.4, 150, 60);
      if (G.full) floatText(el.label + (s.pass === true ? " ✓" : s.pass === false ? " ✗" : " ?"), x, cy - hh - 8, ga, 0.9, tone, 10);
    }
  });
  // The chamber at the end, and what the chest in it holds.
  if (reach >= G.x1 + G.room * 0.9) {
    const rm = G.room, rx = G.x1, ry = cy - rm / 2, seen = closed === n && !dead, s = clamp(rm / 26, 0.4, 1.3), cx = G.chest.x;
    ctx.fillStyle = C.bg; ctx.fillRect(rx, ry, rm, rm);
    if (!seen && rm >= 12) { if (dead) { pen(C.muted, 1, 0.45); hatch(rx, ry, rm, rm, 5, 1); hatch(rx, ry, rm, rm, 5, -1); ctx.globalAlpha = 1; } else fog(rx, ry, rm, rm, col, 0, 1); }
    pen(lit ? vcol : seen ? C.ink : C.muted, lit ? 1.6 : 1.2); ctx.beginPath(); ctx.moveTo(rx, cy - hh); ctx.lineTo(rx, ry); ctx.lineTo(rx + rm, ry); ctx.lineTo(rx + rm, ry + rm); ctx.lineTo(rx, ry + rm); ctx.lineTo(rx, cy + hh); ctx.stroke();
    if (rm >= 12) {
      if (lit) { chest(cx, cy + 3 * s, s, vcol, true, 1.6); gem(cx, cy - 4.5 * s, 4.6 * s * (FX() ? backOut(clamp(age / 0.3, 0, 1)) : 1), vcol, t); }
      else if (noted) { pen(vcol, 1.3); ctx.fillStyle = C.bg; ctx.beginPath(); ctx.rect(cx - 4.5 * s, cy - 5.5 * s, 9 * s, 11 * s); ctx.fill(); ctx.stroke(); pen(vcol, 1); for (const o of [-2.4, 0, 2.4]) line(cx - 2.6 * s, cy + o * s, cx + 2.6 * s, cy + o * s); }
      else if (dead) { pen(C.muted, 1.2); ctx.setLineDash([2, 2.5]); ctx.strokeRect(cx - 6 * s, cy - 1 * s, 12 * s, 6.5 * s); ctx.setLineDash([]); }
      else if (seen) chest(cx, cy + 2 * s + (FX() && !HOLD && !decided ? Math.sin(t * 4) * 0.6 : 0), s, C.ink, false);
      if (decided && cs.out === "open") text("?", cx, cy - 7 * s, { align: "center", size: 10, color: C.ink });
    } else if (lit) { ctx.fillStyle = vcol; ctx.beginPath(); ctx.arc(cx, cy, 2, 0, TAU); ctx.fill(); }
    if (decided) {
      const tx = Math.min(cx, win.B.x + win.B.w - 54);
      if (lit) { streaks(cx, cy, age, vcol, ci + 700, G.full ? 30 : 12, 0.8, G.full ? 360 : 180, 100); ring(cx, cy, age, 0.55, G.full ? 8 : 4, G.full ? 96 : 40, vcol, 1.6); if (G.full) ring(cx, cy, age - 0.09, 0.55, 8, 60, C.ink, 1); floatText((cs.sev || "verified").toUpperCase(), tx, ry - (G.full ? 6 : 2), age, 1.3, vcol, G.full ? 13 : 9.5); }
      else if (noted) { ring(cx, cy, age, 0.45, 5, G.full ? 44 : 20, vcol, 1.2); if (G.full) floatText(OUT_LABEL[cs.out], tx, ry - 6, age, 1.2, vcol, 10); }
      else if (fp) { streaks(cx, cy, age, C.muted, ci + 900, G.full ? 10 : 5, 0.6, 160, 200); if (G.full) floatText(OUT_LABEL[cs.out], tx, ry - 6, age, 1.2, C.muted, 10); }
      else { echo({ x: rx - 3, y: ry - 3, w: rm + 6, h: rm + 6 }, age, 0.45, C.ink, 0.6); if (G.full) floatText(OUT_LABEL[cs.out], tx, ry - 6, age, 1.2, C.ink, 10); }
    }
  }
}
function drawFocus(S, t, act, B, win) {
  if (win.focusH < 40) return;
  const a = clamp(win.focusH / 108, 0, 1), x = B.x + 20, w = B.w - 40, y = B.y + 48, big = clamp(B.w * 0.03, 12.5, 18);
  if (act >= 0) {
    const c = M.cands[act], cs = S.cands[act], stt = vaultStatus(act, cs, S, true);
    let since = cs.last;
    for (const e of M.PHEV) if (e.t <= t) since = Math.max(since, e.t);
    text(fit(c.id, w, { font: DISP, w: 600, size: big + 5 }), x, y + 12, { font: DISP, w: 600, size: big + 5, color: C.ink, alpha: a });
    text(fit(c.title, w, { font: DISP, size: big }), x, y + 12 + big + 10, { font: DISP, size: big, color: C.ink, alpha: a });
    text(fit(c.location + (c.owner >= 0 ? " · raised by " + bare(M.routes[c.owner].skill) : ""), w, { size: 9.5 }), x, y + 12 + big * 2 + 16, { size: 9.5, alpha: a });
    text(fit("▸ " + stt.s + " · " + clock(Math.max(0, t - since)), w, { size: 10.5 }), x, y + 12 + big * 2 + 34, { size: 10.5, color: stt.col, alpha: a });
  } else {
    const dec = S.cands.filter((c) => c.verdict >= 0), by = (o) => dec.filter((c) => c.out === o).length;
    text(dec.length + " of " + win.raised.length + " decided", x, y + 14, { font: DISP, w: 600, size: big + 4, color: C.ink, alpha: a });
    text(fit(by("verified") + " verified · " + (by("observation") + by("residual_risk")) + " noted · " + by("false_positive") + " false positive · " + by("open") + " unverified", w, { size: 9.5 }), x, y + 14 + big + 14, { size: 9.5, alpha: a });
  }
}
function drawLevel2(S, t, act, Rg, p1, p2) {
  const now = Rg.vault, rest = regions(1, p2).vault, B = { x: now.x, y: now.y, w: rest.w, h: rest.h }, win = vaultLayout(S, act, B, p2);
  if (now.w <= 4 || now.h <= 4) return;
  ctx.save(); ctx.beginPath(); ctx.rect(now.x, now.y, now.w, now.h); ctx.clip();
  const hidden = win.raised.length - win.rows.length;
  text("LEVEL 2 · VAULTS", B.x + 14, B.y + 18, { size: 9.5 });
  pen(C.hair, 1); line(B.x + 130, B.y + 18, B.x + B.w - 14 - (hidden > 0 ? 66 : 0), B.y + 18);
  if (hidden > 0) text("+" + hidden + " more", B.x + B.w - 14, B.y + 18, { size: 9.5, align: "right" });
  if (!win.raised.length) text("No candidates were raised", B.x + B.w / 2, B.y + B.h / 2, { align: "center", size: 11 });
  drawFocus(S, t, act, B, win);
  if (win.raised.length) {
    // The gallery over the passages and the shaft down beside each column of them.
    const gy = win.top - 10, shafts = new Map();
    for (const ci of win.rows) { const G = vaultGeom(ci, win); if (G) shafts.set(G.shaft, Math.max(shafts.get(G.shaft) || 0, G.cy)); }
    pen(C.hair, 1); ctx.setLineDash([2, 4]); ctx.beginPath();
    for (const [x, y] of shafts) { ctx.moveTo(x, gy); ctx.lineTo(x, y); }
    ctx.moveTo(B.x + 22, gy); ctx.lineTo(Math.max(...shafts.keys(), B.x + 22), gy); ctx.stroke(); ctx.setLineDash([]);
    stairs(B.x + 20, gy - 1, 0.8, C.ink);
    for (const ci of win.rows) drawVault(ci, S.cands[ci], S, t, act === ci, win, p1 >= 1);
    // The crypto-fp-check figure.
    // The verifier comes down only once every passage has been drawn in.
    if ((S.phase >= 2 || t >= M.tBench) && t >= M.tBench + 0.9 + Math.min(2, STAGGER * win.raised.length) + 0.9) {
      const still = HOLD ? Math.min(t, HOLD.since) : t, p = verifierAt(still, win), on = S.phase === 2;
      figure(p.x, p.y + 5, C.ink, 0.95, HOLD && on ? "camp" : p.walking ? "walk" : on ? "search" : "rest", t, p.face, p.stride, p.run, 1 + vary(977) % 3);
      if (p.home && !p.walking && B.w > 300) text("FP-CHECK", p.x + 14, p.y - 4, { size: 8.5, color: C.ink });
      if (!p.walking) for (const e of recent(M, t, 0.35)) if (e.type === "vtap" && e.c >= 0) { const age = t - e.t; pen(C.ink, 1.6, 1 - age / 0.35); ctx.beginPath(); ctx.arc(p.x + 5, p.y - 4, 8 + age * 14, -0.9, 0.9); ctx.stroke(); ctx.globalAlpha = 1; }
      hits.push({ rect: { x: p.x - 9, y: p.y - 12, w: 18, h: 22 }, r: 8, tip: "crypto-fp-check\none blow on the door per verification call" });
    }
  }
  ctx.restore();
}

function drawHud(S, t) {
  const y = D.R.y + 18, label = PHASE_LABEL[S.phase].toUpperCase(), total = M.units.length, cleared = S.units.filter((u) => u.broken >= 0).length, calls = callsBefore(M, t), wide = D.x1 - D.x0 > 420;
  text(label, D.x0 - 6, y, { font: DISP, w: 600, size: 15, color: S.regress ? C.sev.High : C.ink });
  if (HOLD) {
    ctx.font = "600 15px " + DISP;
    const gx = D.x0 + 8 + ctx.measureText(label).width, col = HOLD.mode === "wait" ? C.sev.High : C.muted;
    pen(col, 2.4); line(gx, y - 5, gx, y + 5); line(gx + 6, y - 5, gx + 6, y + 5);
    if (HOLD.mode === "wait" && FX()) for (const shift of [0, 0.5]) { const k = (t / 1.6 + shift) % 1; pen(col, 1.2, 1 - k); ctx.beginPath(); ctx.arc(gx + 3, y, 9 + 11 * k, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (wide) text(HOLD.mode === "wait" ? "CAMPED · WAITING FOR THE USER" : "CAMPED · NO SESSION RUNNING", gx + 22, y, { size: 9.5, color: col });
  }
  text((wide && calls ? calls + " CALLS · " : "") + String(cleared).padStart(2, "0") + " / " + total + (wide ? " EXPLORED" : ""), D.x1 + 6, y, { align: "right", size: 10.5, color: C.ink });
}
function drawLegend() {
  if (!D.legend) return;
  const y = D.y1 - 11;
  let x = D.x0 + 2;
  [["FIGURE = AN AUDITOR", (px) => { ctx.beginPath(); ctx.moveTo(px + 3, y + 4.5); ctx.lineTo(px + 6.5, y - 1.5); ctx.lineTo(px + 10, y + 4.5); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(px + 6.5, y - 4, 2, 0, TAU); ctx.stroke(); }],
    ["SEARCH = ONE TOOL CALL", (px) => { ctx.beginPath(); ctx.arc(px + 5, y, 4.5, -0.9, 0.9); ctx.stroke(); }],
    ["ROOM = FILE IN SCOPE", (px) => { ctx.strokeRect(px + 2, y - 4.5, 9, 9); }],
    ["HATCHING = NOT YET REVIEWED", (px) => { ctx.strokeRect(px + 2, y - 4.5, 9, 9); hatch(px + 2, y - 4.5, 9, 9, 3.5, 1); }],
    ["STAIRWAY = CANDIDATE FINDING", (px) => { stairs(px + 6.5, y, 0.8, C.muted, 1.2); }],
    ["DOOR = VERIFICATION GATE", (px) => { ctx.strokeRect(px + 5, y - 5, 3, 10); }]].forEach(([label, mark]) => {
    if (x + 34 + label.length * 5.2 > D.x1) return;
    pen(C.muted, 1.2); mark(x);
    text(label, x + 17, y + 0.5, { size: 8.5 });
    x += 34 + label.length * 5.2;
  });
}

export function draw(S, t) {
  hits.length = 0;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  if (!M || !S) { text("No session recorded for this engagement", W / 2, H / 2, { align: "center", size: 11 }); return { p2: 0, find: { x: 0, y: H, w: W, h: 0 } }; }
  const p1 = progress(t, M.tBench), p2 = progress(t, M.tResults), Rg = regions(p1, p2), sh = shakeAt(M, t), act = activeCandidate(M, S);
  const stale = M.hooked && M.session.phase !== "closed" && t - M.lastActivity > STALE;
  HOLD = S.hold ? { mode: S.hold, since: S.holdAt } : stale ? { mode: "pause", since: M.lastActivity + STALE } : null;
  layout(Rg.map);
  ctx.save(); ctx.translate(sh.x, sh.y);
  drawMap(S, t, sh.pulse);
  // The map first: no figure shows until every room in scope has been drawn in.
  const mapped = S.units.some((u) => u.shown >= 0) ? S.units.reduce((m, u) => (u.shown >= 0 ? Math.max(m, u.shown) : m), 0) + 0.8 : Infinity;
  if (order.length) { drawStairways(S, t, act); drawMarks(act); if (t >= mapped) drawParties(S, HOLD ? Math.min(t, HOLD.since) : t); drawMapFx(t); }
  drawLevel2(S, t, act, Rg, p1, p2);
  if (HOLD) { ctx.fillStyle = C.bg; ctx.globalAlpha = 0.5 * (FX() ? clamp((t - HOLD.since) / 0.4, 0, 1) : 1); ctx.fillRect(-20, -20, W + 40, Rg.find.y + 20); ctx.globalAlpha = 1; }
  drawHud(S, t);
  drawLegend();
  ctx.restore();
  drawBanner(M, t, Rg.map);
  return { p2, find: Rg.find };
}
