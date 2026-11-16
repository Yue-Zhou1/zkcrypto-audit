import { PHASE_LABEL, OUT_LABEL, mulberry, recent, segmentAt, activeCandidate, bare } from "./model.js";
import { ctx, C, W, H, DISP, TOP_H, NARROW, STALE, lerp, clamp, smooth, backOut, elastic, clock, progress, FX, setLineScale, hits, text, fit, pen, line, hatch, rules, brackets, streaks, ring, echo, lineShards, rectEdges, floatText, shakeAt, drawBanner, burst, SALT, vary } from "./kit.js";

const WALL_W = 0.44, FLY = 0.9;

let M = null, L = null, locate = null, base = null, baseKey = "", HOLD = null, FIELD = null, NOMINAL = null, V = { segs: [], keys: [] };
const CRACKS = new Map(), IDLE = new Map();

export function setModel(model) { M = model; if (M) buildVerify(); else IDLE.clear(); }
// How long a ball needs between two hits: down from one brick to the paddle and up to the other, at a steady speed.
export const pace = {
  begin(draft) { baseLayout(draft.units); const F = frameOf({ x: 0, y: 0, w: W, h: H }); NOMINAL = { F, at: base.rects.map((r) => ({ x: r.x + r.w / 2, y: r.y + r.h })) }; },
  route(a, from, to) {
    const F = NOMINAL.F, leg = (u) => { const p = NOMINAL.at[u]; return p ? Math.hypot(p.x - (F.cx + (p.x - F.cx) * 0.7), F.padY - p.y) : 0; };
    return Math.max(0.55, (leg(from) + leg(to)) / clamp(W * 0.8, 560, 1150) + 0.1);
  },
  verify: (from, to) => (from && from.c === to.c ? 0.6 : 0.85),
};
export function locateUnit(u) { locate = { u, at: performance.now() }; }

const routeColor = (a) => (a >= 0 && M.routes[a].color >= 0 ? C.route[M.routes[a].color] : C.ink);

function cellPattern(p, x, y, w, h) {
  if (p === 0) hatch(x, y, w, h, 4, 1);
  else if (p === 1) hatch(x, y, w, h, 4, -1);
  else if (p === 2) rules(x, y, w, h, 3.5, false);
  else if (p === 3) rules(x, y, w, h, 4, true);
  else if (p === 4) { hatch(x, y, w, h, 7, 1); hatch(x, y, w, h, 7, -1); }
  else { ctx.setLineDash([1.5, 3]); hatch(x, y, w, h, 3.5, 1); ctx.setLineDash([]); }
}

function regions(p1, p2) {
  if (W >= NARROW) {
    const ww = lerp(W, W * WALL_W, p1), hh = lerp(H, H * TOP_H, p2);
    return { wall: { x: 0, y: 0, w: ww, h: hh }, bench: { x: ww, y: 0, w: W - ww, h: hh }, find: { x: 0, y: hh, w: W, h: H - hh } };
  }
  const wh = lerp(lerp(H, H * 0.42, p1), H * 0.22, p2), bottom = lerp(H, H * 0.52, p2);
  return { wall: { x: 0, y: 0, w: W, h: wh }, bench: { x: 0, y: wh, w: W, h: bottom - wh }, find: { x: 0, y: bottom, w: W, h: H - bottom } };
}
function frameOf(R) {
  const pad = lerp(14, 22, clamp((R.w - 320) / 600, 0, 1)), x0 = R.x + pad, x1 = R.x + R.w - pad, y0 = R.y + 40, yb = R.y + R.h - 10, padY = yb - 30;
  const zone = { x: x0 + 6, y: y0 + 12, w: Math.max(20, x1 - x0 - 12), h: Math.max(20, padY - clamp(R.h * 0.15, 36, 100) - y0 - 12) };
  return { R, x0, x1, y0, yb, padY, zone, cx: (x0 + x1) / 2, pw: clamp(R.w * 0.15, 40, 150) };
}
const fontScale = (sc) => clamp(sc / 1.1, 1, 1.5);
function placeBricks(units, sc, names, zone, tries) {
  const rnd = mulberry(vary(977 + Math.round(sc * 100))), gap = 5 + 7 * sc, fs = fontScale(sc);
  const dims = units.map((U) => {
    const n = U.req.length, cells = n * (20 + U.wj * 10) * sc + (n - 1) * 3 + 8, label = names ? (Math.min(U.label.length, 18) * 5.45 + 30) * fs : 0;
    return { u: U.i, w: Math.max(cells, label), h: (names ? 14 * fs : 5) + 5 + [12, 17, 23][U.tier] * sc, rot: U.rot };
  });
  const order = dims.slice().sort((p, q) => q.w * q.h - p.w * p.h), placed = [];
  const dist = (p, q) => Math.hypot(Math.max(0, Math.max(p.x - (q.x + q.w), q.x - (p.x + p.w))), Math.max(0, Math.max(p.y - (q.y + q.h), q.y - (p.y + p.h))));
  for (const d of order) {
    if (d.w > zone.w || d.h > zone.h) return null;
    let best = null, bestScore = -1;
    for (let k = 0; k < tries; k++) {
      const c = { x: zone.x + rnd() * (zone.w - d.w), y: zone.y + rnd() * (zone.h - d.h), w: d.w, h: d.h };
      let near = Infinity;
      for (const q of placed) { near = Math.min(near, dist(c, q)); if (near < gap) break; }
      if (near < gap) continue;
      const score = Math.min(near, 60) + rnd() * 26;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    if (!best) return null;
    placed.push({ ...best, u: d.u, rot: d.rot });
  }
  const out = [];
  for (const q of placed) out[q.u] = { x: q.x, y: q.y, w: q.w, h: q.h, rot: q.rot };
  return out;
}
function baseLayout(units = M.units) {
  const key = SALT + ":" + W + "x" + H + ":" + units.map((u) => u.id + "/" + u.req.length).join("|");
  if (key === baseKey) return;
  baseKey = key; CRACKS.clear(); IDLE.clear();
  const zone = frameOf({ x: 0, y: 0, w: W, h: H }).zone, n = units.length;
  let rects = n ? null : [], names = true;
  const need = units.reduce((sum, U) => sum + (U.req.length * 25 + 14) * 36, 0), guess = clamp(Math.sqrt(zone.w * zone.h * 0.4 / Math.max(1, need)), 0.25, 2.2);
  let fs = 1;
  for (let sc = guess; n <= 300 && sc > 0.2 && !rects; sc -= 0.07) { names = sc >= 0.75; fs = fontScale(sc); rects = placeBricks(units, sc, names, zone, n > 40 ? 60 : 160); }
  if (!rects) {
    const cols = Math.ceil(Math.sqrt(n * zone.w / zone.h / 2.2)), rows = Math.ceil(n / cols), cw = zone.w / cols, ch = Math.min(30, zone.h / rows);
    rects = units.map((U, i) => ({ x: zone.x + (i % cols) * cw + 2, y: zone.y + Math.floor(i / cols) * ch + 2, w: cw - 4, h: ch - 4, rot: 0 }));
    names = false;
  }
  base = { zone, rects, names, fs: names ? fs : 1 };
}
function wallGeometry(R) {
  const F = frameOf(R), z = F.zone, z0 = base.zone, ss = Math.min(1, z.w / z0.w, z.h / z0.h);
  const rects = base.rects.map((r) => {
    const w = r.w * ss, h = r.h * ss;
    return { x: z.x + (r.x + r.w / 2 - z0.x) / z0.w * z.w - w / 2, y: z.y + (r.y + r.h / 2 - z0.y) / z0.h * z.h - h / 2, w, h, rot: r.rot };
  });
  L = { ...F, ss, q: 0.6 + 0.4 * ss, names: base.names && base.fs * ss >= 0.8, fs: base.fs * ss, rect: (u) => rects[u] };
}
function cellGeom(U, r) {
  const n = U.req.length, top = L.names ? 14 * L.fs : Math.max(2, r.h * 0.2), bot = L.names ? 5 : Math.max(2, r.h * 0.2), side = L.names ? 4 : Math.max(2, r.w * 0.06), gap = L.names ? 3 : 2;
  const sh = r.h - top - bot, sw = (r.w - side * 2 - (n - 1) * gap) / n;
  return { n, sh, sw, x: (i) => r.x + side + i * (sw + gap), y: r.y + top };
}
const brickPoint = (u, a) => { const r = L.rect(u), U = M.units[u], g = cellGeom(U, r), i = U.req.indexOf(a); return { x: i < 0 ? r.x + r.w / 2 : g.x(i) + g.sw / 2, y: r.y + r.h + 6 * L.q }; };

// Where a paddle stands at time t: between the bricks its ball leaves and reaches around then, weighted by how near
// in time each of those moments is.
function trackX(keys, t, keyX, rest) {
  if (!keys.length) return rest;
  let a = 0, b = keys.length;
  while (a < b) { const m = (a + b) >> 1; if (keys[m].t < t) a = m + 1; else b = m; }
  const from = Math.max(0, a - 8), to = Math.min(keys.length, a + 8);
  let near = Infinity;
  for (let i = from; i < to; i++) near = Math.min(near, Math.abs(keys[i].t - t));
  let sw = 0, sx = 0;
  for (let i = from; i < to; i++) { const d = Math.abs(keys[i].t - t), w = Math.exp(-(d * d - near * near) / 0.3); sw += w; sx += w * keyX(keys[i]); }
  return sx / sw;
}
function paddleX(t) {
  const lo = L.x0 + L.pw / 2, hi = L.x1 - L.pw / 2;
  return trackX(M.KEYS, t, (k) => { const r = L.rect(k.u); return clamp(L.cx + (r.x + r.w / 2 - L.cx) * 0.7, lo, hi); }, L.cx);
}
const padPoint = (a, t) => ({ x: paddleX(t) + ((M.routes[a].color % 6) - 2.5) * Math.min(12, L.pw / 8), y: L.padY - 8 * L.q });
// Between two hits a ball stays in play: it leaves the paddle for a wall, comes back, and so on, slower the longer
// nothing happens, and it never touches a brick, because only a recorded call may do that. The touches run on a fixed
// timetable from the moment the ball came back, so a path that has begun does not change when the next hit becomes
// known; only the last stretch is fitted to bring the ball to the paddle in time for it.
const idleLeg = (k) => Math.min(0.55 + 0.1 * k, 1);
function clearPath(p, q, rects, m) {
  const dx = q.x - p.x, dy = q.y - p.y;
  for (const r of rects) {
    let t0 = 0, t1 = 1, cut = true;
    for (const [d, lo, hi] of [[dx, r.x - m - p.x, r.x + r.w + m - p.x], [dy, r.y - m - p.y, r.y + r.h + m - p.y]]) {
      if (Math.abs(d) < 1e-9) { if (lo > 0 || hi < 0) { cut = false; break; } continue; }
      const a = Math.min(lo / d, hi / d), b = Math.max(lo / d, hi / d);
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      if (t0 > t1) { cut = false; break; }
    }
    if (cut) return false;
  }
  return true;
}
const wallPoint = (F, w) => (w.side === "T" ? { x: lerp(F.x0 + 10, F.x1 - 10, w.f), y: F.y0 } : { x: w.side === "L" ? F.x0 : F.x1, y: lerp(F.pad - 12, F.y0 + 8, w.f) });
// The wall point a ball makes for: the first of a few seeded tries whose way there and back misses every standing
// brick, else a low point under the bricks, which is always free. It is kept, so the path stays put while it is flown.
function pickWall(key, seed, F, from, to) {
  const known = IDLE.get(key);
  if (known) return known;
  const rnd = mulberry(vary(seed));
  let pick = null;
  for (let i = 0; i < 12 && !pick; i++) {
    const roll = rnd(), w = { side: roll < 0.3 ? "T" : roll < 0.65 ? "L" : "R", f: roll < 0.3 ? rnd() : 0.2 + 0.8 * rnd() }, q = wallPoint(F, w);
    if (clearPath(from, q, F.rects, F.margin) && clearPath(q, to, F.rects, F.margin)) pick = w;
  }
  if (!pick) pick = { side: rnd() < 0.5 ? "L" : "R", f: F.band * (0.25 + 0.75 * rnd()) };
  if (IDLE.size > 4000) IDLE.clear();
  IDLE.set(key, pick);
  return pick;
}
// What a wall leaves free: the frame a ball may bounce in and the bricks it must miss.
function idleField(x0, x1, y0, pad, rects, margin) {
  const low = rects.reduce((y, r) => Math.max(y, r.y + r.h), y0) + margin + 4;
  return { x0, x1, y0, pad, rects, margin, band: clamp((pad - 12 - low) / Math.max(1, pad - 20 - y0), 0.02, 1) };
}
function idleBall(id, seed, start, end, t, padAt, F) {
  let tau = start, k = 0, last = false;
  for (;;) { const next = tau + idleLeg(k); if (next > end - 0.25) { last = true; break; } if (t < next || k > 6000) break; tau = next; k++; }
  const when = (j) => { let at = start; for (let i = 0; i < j; i++) at += idleLeg(i); return at; };
  const wall = (j) => wallPoint(F, pickWall(id + "|" + start.toFixed(2) + "|" + j, seed + j * 7919 + Math.round(start * 13), F, padAt(when(j - 1)), padAt(Math.min(when(j + 1), end))));
  const out = (p, q, u, extra) => ({ x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u), vx: q.x - p.x, vy: q.y - p.y, idle: true, since: t - start, left: end - t, ...extra });
  if (!last) {
    const u = (t - tau) / idleLeg(k);
    if (k % 2 === 0) return out(padAt(tau), wall(k + 1), u);
    const w = wall(k);
    return out(w, padAt(tau + idleLeg(k)), u, { wallHit: { x: w.x, y: w.y, age: t - tau } });
  }
  const rest = end - tau, u = clamp((t - tau) / Math.max(0.001, rest), 0, 1);
  if (k % 2 === 1) { const w = wall(k); return out(w, padAt(end), u, { wallHit: { x: w.x, y: w.y, age: t - tau } }); }
  // Too little time for a wall: a short hop off the paddle, or none.
  const here = padAt(t);
  if (rest < 0.5) return { x: here.x, y: here.y, vx: 0, vy: 0, ride: true, since: t - start, left: end - t };
  const w = wall(k + 1), reach = clamp(rest / 2 / idleLeg(k), 0, 1) * (1 - Math.abs(2 * u - 1)), sign = u < 0.5 ? 1 : -1;
  return { x: lerp(here.x, w.x, reach), y: lerp(here.y, w.y, reach), vx: (w.x - here.x) * sign, vy: (w.y - here.y) * sign, idle: true, since: t - start, left: end - t };
}
// A flight is not always straight: by the draw of this viewing some bend to one side or the other on the way.
function curve(p0, p1, k, seed) {
  const roll = vary(seed) % 1000, bend = roll < 450 ? 0 : (roll - 725) / 275 * 0.2, len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1, lift = Math.sin(Math.PI * k) * bend;
  return { x: -(p1.y - p0.y) * lift, y: (p1.x - p0.x) * lift * (len > 0 ? 1 : 0) };
}
function ballAt(a, t) {
  const s = segmentAt(M, a, t);
  if (!s) return null;
  if (s.kind === "ride") return idleBall(M.routes[a].skill, a * 131 + 7, s.t0, s.t1, t, (time) => padPoint(a, time), FIELD);
  const k = (t - s.t0) / Math.max(0.001, s.t1 - s.t0);
  if (s.kind === "down") {
    const p0 = brickPoint(s.u, a), p1 = padPoint(a, s.t1), ky = k * (0.55 + 0.45 * k), c = curve(p0, p1, k, Math.round(s.t0 * 10) + a * 7);
    return { x: lerp(p0.x, p1.x, k) + c.x, y: lerp(p0.y, p1.y, ky) + c.y, vx: p1.x - p0.x, vy: p1.y - p0.y, age: t - s.t0 };
  }
  const p0 = padPoint(a, s.t0), p1 = brickPoint(s.u, a), dx = p1.x - p0.x, fw = L.x1 - L.x0;
  // Far bricks are reached off a side wall, and so, by the draw of this viewing, are some near ones.
  const turn = vary(s.n * 31 + a * 7);
  if (Math.abs(dx) > fw * 0.22 || turn % 3 === 0) {
    const wall = (dx > 0 || (Math.abs(dx) <= fw * 0.22 && turn & 8)) ? L.x1 + 2 : L.x0 - 2, mx = 2 * wall - p1.x;
    const kw = (wall - p0.x) / (mx - p0.x), wy = lerp(p0.y, p1.y, kw);
    const l1 = Math.hypot(wall - p0.x, wy - p0.y), l2 = Math.hypot(p1.x - wall, p1.y - wy), d = k * (l1 + l2);
    if (kw > 0.08 && kw < 0.92 && wy > L.y0 + 16) {
      if (d < l1) return { x: lerp(p0.x, wall, d / l1), y: lerp(p0.y, wy, d / l1), vx: wall - p0.x, vy: wy - p0.y };
      return { x: lerp(wall, p1.x, (d - l1) / l2), y: lerp(wy, p1.y, (d - l1) / l2), vx: p1.x - wall, vy: p1.y - wy, wallHit: { x: wall, y: wy, age: (d - l1) / (l1 + l2) * (s.t1 - s.t0) } };
    }
  }
  const c = curve(p0, p1, k, s.n * 17 + a * 3);
  return { x: lerp(p0.x, p1.x, k) + c.x, y: lerp(p0.y, p1.y, k) + c.y, vx: dx, vy: p1.y - p0.y };
}

function drawSheet(S, t, pulse) {
  const heat = clamp(recent(M, t, 3).filter((e) => e.type === "cover" || e.type === "tap").length / 6, 0, 1), step = 28, x0 = L.x0, x1 = L.x1, y0 = L.y0, y1 = L.yb;
  pen(C.faint, 1); ctx.beginPath();
  for (let x = x0; x <= x1 + 0.5; x += step) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
  for (let y = y0; y <= y1 + 0.5; y += step) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
  ctx.stroke();
  if (FX()) {
    const rnd = mulberry(99), count = Math.round(8 + 18 * clamp((x1 - x0) / 900, 0, 1)); pen(C.hair, 1);
    for (let i = 0; i < count; i++) {
      const sx = x0 + rnd() * (x1 - x0), sp = 8 + rnd() * 26, span = Math.max(30, y1 - y0 - 20), sy = y0 + (rnd() * span + ((HOLD ? HOLD.since : t) % 3600) * sp * (1 + heat * 2.5)) % span, len = 4 + sp * 0.35 * (1 + heat * 2);
      ctx.globalAlpha = 0.35 + rnd() * 0.5; line(sx, sy, sx, sy + len);
    }
    ctx.globalAlpha = 1;
  }
  pen(C.ink, 1 + pulse * 2.2); ctx.strokeRect(x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 6);
  pen(C.muted, 1); ctx.beginPath();
  for (let x = x0; x <= x1 + 0.5; x += step / 2) { const big = Math.round((x - x0) / (step / 2)) % 4 === 0; ctx.moveTo(x, y0 - 6); ctx.lineTo(x, y0 - 6 - (big ? 6 : 3)); }
  ctx.stroke();
  if (!M.units.length) text("No review scope recorded yet", L.cx, (y0 + L.padY) / 2, { align: "center", size: 11 });
}
function drawTopHud(S, t) {
  const total = M.units.length, cleared = S.units.filter((u) => u.broken >= 0).length, y = L.R.y + 18, wide = L.x1 - L.x0 > 300;
  const label = PHASE_LABEL[S.phase].toUpperCase();
  text(label, L.x0 - 6, y, { font: DISP, w: 600, size: 15, color: S.regress ? C.sev.High : C.ink });
  if (HOLD) {
    ctx.font = "600 15px " + DISP;
    const gx = L.x0 + 8 + ctx.measureText(label).width, col = HOLD.mode === "wait" ? C.sev.High : C.muted;
    pen(col, 2.4); line(gx, y - 5, gx, y + 5); line(gx + 6, y - 5, gx + 6, y + 5);
    if (HOLD.mode === "wait" && FX()) for (const shift of [0, 0.5]) { const k = (t / 1.6 + shift) % 1; pen(col, 1.2, 1 - k); ctx.beginPath(); ctx.arc(gx + 3, y, 9 + 11 * k, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  const x0 = L.x0 + (HOLD ? 190 : 150), x1 = L.x1 - 110;
  if (x1 - x0 > 120 && total && total <= 90) {
    pen(C.hair, 1); line(x0, y + 4, x1, y + 4);
    M.units.forEach((U, i) => { const x = lerp(x0, x1, (i + 0.5) / total), done = S.units[i].broken >= 0; pen(done ? C.ink : C.hair, done ? 1.5 : 1); line(x, y + 4, x, done ? y - 8 : y - 1); });
  }
  text(String(cleared).padStart(2, "0") + " / " + total + (wide ? " CLEARED" : ""), L.x1 + 6, y, { align: "right", size: 10.5, color: C.ink });
}

function crackNet(u, a, nTr) {
  const key = (u * 64 + a) * 8 + nTr;
  if (CRACKS.has(key)) return CRACKS.get(key);
  const rnd = mulberry(vary(key * 131 + 17)), order = [];
  for (let i = 0; i < nTr; i++) order.push(i);
  order.sort((p, q) => Math.abs(p - (nTr - 1) / 2) - Math.abs(q - (nTr - 1) / 2) + (rnd() - 0.5) * 0.6);
  const segs = [];
  let total = 0;
  const add = (pts) => { for (let j = 1; j < pts.length; j++) { const len = Math.hypot(pts[j][1] - pts[j - 1][1], pts[j][2] - pts[j - 1][2]) + 0.05; segs.push({ p: pts[j - 1], q: pts[j], len }); total += len; } };
  order.forEach((ti, oi) => {
    const x0 = (ti + 0.5 + (rnd() - 0.5) * 0.5) / nTr, top = oi === 0 ? 1.18 : 0.55 + rnd() * 0.6, steps = 3 + Math.floor(rnd() * 2), pts = [[x0, 0, -0.2]];
    let off = 0;
    for (let j = 1; j <= steps; j++) { off += (rnd() - 0.5) * 0.5; pts.push([x0, off, -0.2 + (top + 0.2) * j / steps]); }
    add(pts);
    const b = pts[1 + Math.floor(rnd() * (pts.length - 2))], dir = rnd() < 0.5 ? -1 : 1, l1 = 0.22 + rnd() * 0.3;
    add([b, [b[0], b[1] + dir * l1, b[2] + 0.08 + rnd() * 0.18], [b[0], b[1] + dir * (l1 + 0.1 + rnd() * 0.2), b[2] + 0.1 + rnd() * 0.3]]);
  });
  const net = { segs, total };
  CRACKS.set(key, net);
  return net;
}
function drawCracks(U, a, cell, r, tap, t, fade) {
  const prog = (n) => 1 - Math.exp(-n / 5);
  const k = FX() ? smooth(clamp((t - tap.t) / 0.32, 0, 1)) : 1, P = lerp(prog(Math.max(0, tap.n - 1)), prog(tap.n), k);
  const net = crackNet(U.i, a, clamp(Math.round(cell.w / 11), 2, 7)), bottom = cell.y + cell.h;
  const X = (p) => clamp(cell.x + p[0] * cell.w + p[1] * cell.h, cell.x + 1.5, cell.x + cell.w - 1.5), Y = (p) => bottom - p[2] * cell.h;
  let budget = P * net.total;
  ctx.save(); ctx.beginPath(); ctx.rect(cell.x - 1, cell.y - 1, cell.w + 2, r.y + r.h + 3 - cell.y); ctx.clip();
  ctx.beginPath();
  for (const g of net.segs) {
    if (budget <= 0) break;
    const f = Math.min(1, budget / g.len); budget -= g.len;
    const x0 = X(g.p), y0 = Y(g.p);
    ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, X(g.q), f), lerp(y0, Y(g.q), f));
  }
  pen(C.bg, 3.4, fade); ctx.stroke();
  pen(C.ink, 1.1, fade); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawBrick(U, s, t) {
  const r = L.rect(U.i), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  if (s.shown < 0 || s.shown > t) return;
  let dx = 0, dy = 0, drawn = 1;
  const born = t - Math.max(s.shown, s.reopen);
  if (FX() && born < 0.5) drawn = clamp(born / 0.5, 0, 1);
  if (FX() && s.hit >= 0 && t - s.hit < 0.2 && s.broken < 0) { const a = t - s.hit; dx = Math.sin(a * 70) * 3 * s.hitK * (1 - a / 0.2); }
  if (FX()) for (const e of recent(M, t, 0.35)) if (e.type === "cover" && e.broke && e.u !== U.i) {
    const o = L.rect(e.u), ox = cx - (o.x + o.w / 2), oy = cy - (o.y + o.h / 2), d = Math.hypot(ox, oy);
    if (d < 130) { const push = 5 * (1 - d / 130) * Math.sin(Math.min(1, (t - e.t) / 0.35) * Math.PI); dx += ox / (d || 1) * push; dy += oy / (d || 1) * push; }
  }
  hits.push({ rect: r, r: Math.max(r.w, r.h) / 2, tip: U.id.replace(/^@/, "") + "\n" + U.req.map((a) => M.routes[a].key + (s.cov.has(a) ? " ✓" : s.taps.has(a) ? " ×" + s.taps.get(a).n : s.cells.has(a) ? " ·" : " –")).join("  ") + "\n" + (s.broken >= 0 ? "cleared" : s.reopen >= 0 ? "reopened" : "in scope") });
  const turn = () => { ctx.translate(cx, cy); ctx.rotate(r.rot); ctx.translate(-cx, -cy); };
  if (s.broken >= 0) {
    ctx.save(); turn(); pen(C.hair, 1); brackets(r.x, r.y, r.w, r.h, Math.min(5, r.h / 3));
    if (L.names) text(fit(U.label, r.w - 12, { size: 8.5 * L.fs }), r.x + 6, r.y + 8 * L.fs, { size: 8.5 * L.fs, alpha: 0.45 });
    const m = Math.min(3, r.h / 5); pen(C.hair, 1); line(cx - m, cy + m, cx + m, cy - m); line(cx - m, cy - m, cx + m, cy + m);
    ctx.restore(); return;
  }
  ctx.save(); ctx.translate(dx, dy); turn();
  const per = 2 * (r.w + r.h), hot = s.hit >= 0 && t - s.hit < 0.12 && FX(), g = cellGeom(U, r), fade = clamp((drawn - 0.5) * 2, 0, 1), ch = Math.min(5, r.h / 4), ex = Math.min(3, r.h / 6), cut = vary(U.i * 29 + 3) % 4;
  const edge = s.reopen >= 0 ? C.sev.High : C.ink;
  pen(C.muted, 1, 0.8 * fade); ctx.beginPath();
  ctx.moveTo(r.x, r.y + r.h); ctx.lineTo(r.x + ex, r.y + r.h + ex); ctx.lineTo(r.x + r.w + ex, r.y + r.h + ex); ctx.lineTo(r.x + r.w + ex, r.y + (cut === 0 ? ch : 0) + ex); ctx.lineTo(r.x + r.w, r.y + (cut === 0 ? ch : 0));
  ctx.moveTo(r.x + r.w, r.y + r.h); ctx.lineTo(r.x + r.w + ex, r.y + r.h + ex);
  ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = C.bg; ctx.beginPath();
  // one corner is cut; which one is the brick's own
  const x1 = r.x + r.w, y1 = r.y + r.h;
  if (cut === 0) { ctx.moveTo(r.x, r.y); ctx.lineTo(x1 - ch, r.y); ctx.lineTo(x1, r.y + ch); ctx.lineTo(x1, y1); ctx.lineTo(r.x, y1); }
  else if (cut === 1) { ctx.moveTo(r.x + ch, r.y); ctx.lineTo(x1, r.y); ctx.lineTo(x1, y1); ctx.lineTo(r.x, y1); ctx.lineTo(r.x, r.y + ch); }
  else if (cut === 2) { ctx.moveTo(r.x, r.y); ctx.lineTo(x1, r.y); ctx.lineTo(x1, y1 - ch); ctx.lineTo(x1 - ch, y1); ctx.lineTo(r.x, y1); }
  else { ctx.moveTo(r.x, r.y); ctx.lineTo(x1, r.y); ctx.lineTo(x1, y1); ctx.lineTo(r.x + ch, y1); ctx.lineTo(r.x, y1 - ch); }
  ctx.closePath(); ctx.fill();
  pen(edge, hot ? 1.2 + 1.3 * s.hitK : 1.2);
  if (drawn < 1) ctx.setLineDash([per * drawn, per]);
  ctx.stroke(); ctx.setLineDash([]);
  if (L.names) {
    const fs = L.fs;
    text(fit(U.label, r.w - 30 * fs, { size: 9 * fs }), r.x + 6 + (cut === 1 ? ch * 0.6 : 0), r.y + 8 * fs, { size: 9 * fs, alpha: fade, color: C.ink });
    text(String(U.i + 1).padStart(2, "0"), r.x + r.w - (cut === 0 ? ch : 0) - 4, r.y + 8 * fs, { size: 7.5 * fs, alpha: 0.8 * fade, align: "right" });
    pen(C.hair, 1, fade); line(r.x + 4, r.y + 13.5 * fs, r.x + r.w - 4, r.y + 13.5 * fs); ctx.globalAlpha = 1;
  }
  U.req.forEach((a, i) => {
    const x = g.x(i), col = routeColor(a);
    if (!s.cells.has(a)) return;
    if (s.cov.has(a)) {
      pen(col, 1, 0.45 * fade); ctx.setLineDash([2, 3]); ctx.strokeRect(x, g.y, g.sw, g.sh); ctx.setLineDash([]);
      const mx = x + g.sw / 2, my = g.y + g.sh / 2, q = Math.min(1, g.sw / 9, g.sh / 7);
      ctx.globalAlpha = 0.8 * fade; ctx.beginPath(); ctx.moveTo(mx - 3.5 * q, my); ctx.lineTo(mx - 1 * q, my + 2.5 * q); ctx.lineTo(mx + 3.5 * q, my - 2.5 * q); ctx.stroke(); ctx.globalAlpha = 1; return;
    }
    pen(col, 1, 0.7 * fade); cellPattern(M.routes[a].pattern, x, g.y, g.sw, g.sh);
    pen(col, 1.3, fade); ctx.strokeRect(x, g.y, g.sw, g.sh);
    if (L.names) { ctx.beginPath(); ctx.moveTo(x - 1.5, g.y + 3); ctx.lineTo(x - 1.5, g.y - 1.5); ctx.lineTo(x + 3, g.y - 1.5); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (s.taps.has(a)) drawCracks(U, a, { x, y: g.y, w: g.sw, h: g.sh }, r, s.taps.get(a), t, fade);
  });
  ctx.restore();
}
function drawBrickFx(t) {
  for (const e of recent(M, t, 1.15)) {
    const age = t - e.t;
    if (e.type === "cover") {
      const r = L.rect(e.u), U = M.units[e.u], g = cellGeom(U, r), i = U.req.indexOf(e.a), cell = { x: g.x(i), y: g.y, w: g.sw, h: g.sh }, sx = cell.x + cell.w / 2, sy = cell.y + cell.h / 2, col = routeColor(e.a);
      lineShards(rectEdges(cell).concat([[cell.x, cell.y + cell.h, cell.x + cell.w, cell.y]]), sx, sy, age, col, e.i, 0.85);
      burst(sx, r.y + r.h, age, col, e.i, e.broke ? 26 : 12, 0.6, (e.broke ? 360 : 240) * L.q);
      ring(sx, sy, age, 0.3, 3, 26 * L.q, col, 1.4);
      if (e.broke) {
        lineShards(rectEdges(r), r.x + r.w / 2, r.y + r.h / 2, age, C.ink, e.i + 500, 1.05);
        echo(r, age, 0.45, C.ink, 0.7); echo(r, age - 0.07, 0.5, col, 1.1);
        ring(r.x + r.w / 2, r.y + r.h / 2, age, 0.5, 8, 96 * L.q, C.ink, 1.2);
        floatText("CLEARED", r.x + r.w / 2, r.y - 4, age, 0.95, C.ink, 9 + 2 * L.ss);
      } else floatText(M.routes[e.a].key + " ✓", sx, r.y - 2, age, 0.7, col, 8 + 2 * L.ss);
    } else if (e.type === "tap") {
      const r = L.rect(e.u), U = M.units[e.u], g = cellGeom(U, r), i = U.req.indexOf(e.a), sx = g.x(i) + g.sw / 2, col = routeColor(e.a);
      streaks(sx, r.y + r.h + 1, age, col, e.i, 6, 0.42, 150 * L.q);
      ring(sx, r.y + r.h, age, 0.22, 2, 11, col, 1);
      if (e.n > 1) floatText("×" + e.n, sx, r.y - 2, age, 0.55, col, 9);
    } else if (e.type === "reopen") {
      const r = L.rect(e.u);
      echo({ x: r.x - r.w * 0.4, y: r.y - r.h * 0.4, w: r.w * 1.8, h: r.h * 1.8 }, age, 0.5, C.sev.High, -0.44);
      floatText("REOPENED", r.x + r.w / 2, r.y - 4, age, 1.1, C.sev.High, 11);
    }
  }
}
function drawPaddle(t, xAt, y, width, q, keys, span, label) {
  const x = xAt(t);
  let sq = 0;
  if (FX() && keys.length) {
    let a = 0, b = keys.length;
    while (a < b) { const m = (a + b) >> 1; if (keys[m].t <= t) a = m + 1; else b = m; }
    for (let i = a - 1; i >= 0 && t - keys[i].t < 0.3; i--) sq = Math.max(sq, 1 - elastic((t - keys[i].t) / 0.3));
  }
  const vel = (x - xAt(t - 0.05)) / 0.05, sp = clamp(Math.abs(vel) / span, 0, 1), dir = Math.sign(vel);
  const pw = width * (1 + sq * 0.12 + (FX() ? sp * 0.1 : 0)), ph = 10 * q * (1 - sq * 0.35), py = y + sq * 3;
  if (FX() && sp > 0.08) {
    for (let g = 1; g <= 3; g++) { const gx = xAt(t - g * 0.07); if (Math.abs(gx - x) < 3) continue; pen(C.ink, 1, sp * 0.38 / g); ctx.beginPath(); ctx.roundRect(gx - pw / 2, py, pw, ph, ph / 2); ctx.stroke(); }
    pen(C.ink, 1, sp * 0.7);
    for (let g = 0; g < 3; g++) { const sx = x - dir * (pw / 2 + 6), len = (14 + g * 9) * sp, sy = py + 1.5 + g * 3.5 * q; line(sx, sy, sx - dir * len, sy); }
    ctx.globalAlpha = 1;
  }
  pen(C.ink, 1.5); ctx.beginPath(); ctx.roundRect(x - pw / 2, py, pw, ph, ph / 2); ctx.stroke();
  pen(C.ink, 1); line(x - pw / 2 + 9, py + ph / 2, x + pw / 2 - 9, py + ph / 2);
  if (label) { pen(C.muted, 1); line(x, py + ph + 3, x, py + ph + 9); text(label, x, py + ph + 16, { align: "center", size: 8.5 }); }
}
function drawBalls(t) {
  const quiet = [];
  for (const route of M.routes) {
    if (!route.wall) continue;
    const i = route.i, p = ballAt(i, t);
    if (!p) continue;
    const col = routeColor(i), rad = 5.5 * L.q;
    if (FX() && !p.ride) {
      let prev = p;
      for (let k = 1; k <= 18; k++) {
        const q = ballAt(i, t - k * 0.016);
        if (!q || q.ride) break;
        pen(col, 1.6 * (1 - k / 19) + 0.4, 0.9 * (1 - k / 19)); line(prev.x, prev.y, q.x, q.y); prev = q;
      }
      ctx.globalAlpha = 1;
      if (p.wallHit) { ring(p.wallHit.x, p.wallHit.y, p.wallHit.age, 0.28, 2, 20, col, 1.2); streaks(p.wallHit.x, p.wallHit.y, p.wallHit.age, col, i * 31 + Math.round(p.wallHit.y), 7, 0.35, 150, 0); }
    }
    if (!HOLD && p.since > 4 && p.left > 1) quiet.push(route.key + " " + clock(p.since), col);
    const sp = Math.hypot(p.vx, p.vy), ang = sp ? Math.atan2(p.vy, p.vx) : 0;
    let sx = 1, sy = 1;
    if (FX() && sp) { sx = 1.3; sy = 0.8; }
    if (FX() && p.age != null && p.age < 0.08) { sx = 0.7; sy = 1.35; }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang); ctx.scale(sx, sy);
    ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
    pen(col, 1.6); ctx.stroke();
    // the mark on a ball is drawn for the viewing: a dot, a ring or a bar
    const mark = vary(i * 19 + 1) % 3;
    if (mark === 1) { pen(col, 1.1); ctx.beginPath(); ctx.arc(0, 0, rad * 0.5, 0, Math.PI * 2); ctx.stroke(); }
    else if (mark === 2) { pen(col, 1.4); line(-rad * 0.6, 0, rad * 0.6, 0); }
    else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 1.6 * L.q, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    if (p.ride && L.ss > 0.6) text(route.key, p.x, p.y - rad - 7.5, { align: "center", size: 8.5, color: col });
  }
  // A route that has made no call for a while is listed beside the paddle with the time since its last one.
  if (L.ss > 0.7) { let x = paddleX(t) + L.pw / 2 + 14; for (let i = 0; i < quiet.length; i += 2) { text(quiet[i], x, L.padY + 5 * L.q, { size: 9, color: quiet[i + 1] }); x += quiet[i].length * 5.6 + 12; } }
}
function drawMarks(act) {
  if (act >= 0 && M.cands[act].unit >= 0) { const c = M.cands[act], r = L.rect(c.unit); pen(routeColor(c.owner), 1.6); brackets(r.x - 4, r.y - 4, r.w + 8, r.h + 8, Math.min(9, r.h / 2)); }
  if (locate && locate.u < M.units.length) {
    const a = (performance.now() - locate.at) / 1000;
    if (a > 4) { locate = null; return; }
    const r = L.rect(locate.u), k = (a * 1.5) % 1, g = 6 + 16 * k;
    pen(C.ink, 1.6, 1 - k); ctx.strokeRect(r.x - g, r.y - g, r.w + 2 * g, r.h + 2 * g); pen(C.ink, 1.8); brackets(r.x - 5, r.y - 5, r.w + 10, r.h + 10, 9); ctx.globalAlpha = 1;
  }
}

function verdictColor(cs) { return cs.out === "verified" ? (C.sev[cs.sev] || C.ink) : cs.out === "observation" || cs.out === "residual_risk" ? C.sev.note : C.muted; }
function candStatus(ci, cs, S, active) {
  const c = M.cands[ci];
  if (cs.verdict >= 0) return { s: cs.out === "verified" ? (cs.sev || "verified").toUpperCase() : OUT_LABEL[cs.out], col: cs.out === "open" ? C.ink : verdictColor(cs) };
  const lost = cs.els.findIndex((x) => x && x.pass === false);
  if (lost >= 0) return { s: c.els[lost].label + " failed", col: C.sev.Critical };
  if (active) { const k = cs.els.findIndex((x) => !x); return { s: "probing " + (k >= 0 ? c.els[k].label : "verdict"), col: routeColor(c.owner) }; }
  if (S.phase === 1 && cs.els.some((x) => x)) return { s: "waiting for re-review", col: C.sev.High };
  return { s: S.phase >= 2 ? "queued" : "awaiting verification", col: C.muted };
}
function candidateTip(ci, cs, S, active) {
  const c = M.cands[ci];
  return c.id + " · " + c.title + (c.owner >= 0 ? "\nraised by " + bare(M.routes[c.owner].skill) : "") + (c.location ? "\n" + c.location : "") + "\n" + c.els.map((e, k) => e.label + " " + (!cs.els[k] ? "·" : cs.els[k].pass === true ? "✓" : cs.els[k].pass === false ? "✗" : "?")).join("  ") + "\n" + candStatus(ci, cs, S, active).s.toLowerCase();
}

// Verification is a second wall. A candidate is an armoured brick with one shell per gate, the claim gate outermost,
// of which only the outermost that is left is drawn.
// A second paddle and ball belong to crypto-fp-check: the ball strikes the brick under verification once per recorded
// verification call, which chips the outermost shell that is left, and the shell breaks only when its gate is recorded
// as passed. Behind the last shell is the core: a gem in the severity colour if the finding is verified. A failed gate
// turns what is left of the brick to steel.
function buildVerify() {
  V = { segs: [], keys: [] };
  const contacts = M.EV.filter((e) => !e.pre && ((e.type === "vtap" && e.c >= 0) || e.type === "gate" || e.type === "verdict"));
  if (!contacts.length) return;
  let pt = Math.max(0, contacts[0].t - 1.2), pc = null;
  for (const h of contacts) {
    const gap = h.t - pt, d1 = pc == null ? 0 : Math.min(0.42 * gap, 0.7), d2 = Math.min(0.5 * gap, 0.75);
    if (pc != null) V.segs.push({ t0: pt, t1: pt + d1, kind: "down", c: pc });
    V.segs.push({ t0: pt + d1, t1: h.t - d2, kind: "ride" });
    V.segs.push({ t0: h.t - d2, t1: h.t, kind: "up", c: h.c });
    pt = h.t; pc = h.c;
  }
  V.segs.push({ t0: pt, t1: pt + 0.7, kind: "down", c: pc });
  for (const s of V.segs) { if (s.kind === "down") V.keys.push({ t: s.t1, c: s.c }); if (s.kind === "up") V.keys.push({ t: s.t0, c: s.c }); }
}
function benchLayout(S, act, B, p2) {
  const raised = [];
  S.cands.forEach((c, i) => { if (c.raised >= 0) raised.push(i); });
  raised.sort((x, y) => S.cands[x].raised - S.cands[y].raised || x - y);
  const n = raised.length;
  const plan = (focusH) => {
    const top = B.y + 40 + focusH, zone = { x: B.x + 18, y: top, w: Math.max(40, B.w - 36), h: Math.max(30, B.y + B.h - 64 - clamp(B.h * 0.08, 14, 44) - top) };
    let best = null;
    for (let cols = 1; cols <= Math.max(1, n); cols++) {
      const rows = Math.ceil(Math.max(n, 1) / cols), cw = zone.w / cols, ch = zone.h / rows, label = ch >= 78 ? 27 : ch >= 46 ? 15 : 0, bw = Math.min(cw - 14, (ch - label - 12) * 1.5, 190);
      if (!best || bw > best.bw + 0.01) best = { cols, rows, bw, label };
    }
    let shown = n;
    if (best.bw < 20) { const cols = Math.max(1, Math.floor(zone.w / 34)), rows = Math.max(1, Math.floor(zone.h / 24)); best = { cols, rows, bw: 20, label: 0 }; shown = Math.min(n, cols * rows); }
    const bh = best.bw / 1.5, px = Math.min(zone.w / best.cols, best.bw + 48), py = Math.min(zone.h / best.rows, bh + best.label + 34), used = Math.ceil(Math.max(shown, 1) / best.cols);
    return { ...best, bh, px, py, shown, focusH, x0: zone.x + (zone.w - px * Math.min(best.cols, Math.max(shown, 1))) / 2, y0: zone.y + (zone.h - py * used) / 2 };
  };
  const want = B.h > 380 && B.w > 300 ? 108 * (1 - p2) : 0;
  let lay = plan(want);
  if (want > 0 && (lay.shown < n || lay.bw < 60)) lay = plan(0);
  let focus = raised.indexOf(act);
  if (focus < 0) { let best = -1; raised.forEach((ci, k) => { if (S.cands[ci].verdict >= 0 && (best < 0 || S.cands[ci].verdict >= S.cands[raised[best]].verdict)) best = k; }); focus = best < 0 ? n - 1 : best; }
  const first = clamp(focus - Math.floor(lay.shown / 2), 0, Math.max(0, n - lay.shown)), rows = raised.slice(first, first + lay.shown);
  return { ...lay, raised, rows, index: new Map(rows.map((ci, i) => [ci, i])), order: new Map(raised.map((ci, i) => [ci, i])) };
}
function armourGeom(ci, win) {
  const idx = win.index.get(ci);
  if (idx == null) return null;
  // A brick sits somewhere in its place in the grid, a little smaller or larger and tilted, by the draw of this viewing.
  const col = idx % win.cols, row = Math.floor(idx / win.cols), rnd = mulberry(vary(ci * 977 + 13)), loose = win.bw >= 44, f = loose ? 0.86 + 0.14 * rnd() : 1, w = win.bw * f, h = win.bh * f;
  return { x: win.x0 + col * win.px + (win.px - w) * (loose ? 0.2 + 0.6 * rnd() : 0.5), y: win.y0 + row * win.py + (win.py - h - win.label) * (loose ? 0.2 + 0.6 * rnd() : 0.5), w, h, rot: loose ? (rnd() - 0.5) * 0.1 : 0, mini: win.bw < 38, cut: Math.floor(rnd() * 4) };
}
function flightStart(ci, cs, win) { return Math.max(cs.raised + 0.5, M.tBench + 0.35 + (win.order.get(ci) || 0) * Math.min(0.1, 2 / Math.max(1, win.raised.length))); }
function capsule(x, y, r, col, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = C.bg; ctx.beginPath(); ctx.roundRect(-r * 1.5, -r * 0.8, r * 3, r * 1.6, r * 0.8); ctx.fill(); pen(col, 1.4); ctx.stroke();
  pen(col, 1); line(0, -r * 0.8, 0, r * 0.8); line(-r * 0.95, -r * 0.25, -r * 0.45, -r * 0.25);
  ctx.restore();
}
// The gem at the core, in one of four cuts.
function gem(x, y, r, col, t, rays, cut = 0) {
  const shape = (pts) => { ctx.beginPath(); pts.forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](x + px * r, y + py * r)); ctx.closePath(); }, seg = (ax, ay, bx, by) => line(x + ax * r, y + ay * r, x + bx * r, y + by * r);
  ctx.fillStyle = C.bg;
  if (cut === 1) {
    // emerald: a long octagon with a table
    shape([[-0.55, -0.9], [0.55, -0.9], [0.85, -0.6], [0.85, 0.6], [0.55, 0.9], [-0.55, 0.9], [-0.85, 0.6], [-0.85, -0.6]]); ctx.fill(); pen(col, 1.8); ctx.stroke();
    pen(col, 1.1); shape([[-0.35, -0.5], [0.35, -0.5], [0.5, -0.32], [0.5, 0.32], [0.35, 0.5], [-0.35, 0.5], [-0.5, 0.32], [-0.5, -0.32]]); ctx.stroke();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) seg(sx * 0.55, sy * 0.9, sx * 0.35, sy * 0.5);
  } else if (cut === 2) {
    // brilliant: round, with a star of facets
    const ring8 = (k) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [Math.cos(i * Math.PI / 4 + Math.PI / 8) * k, Math.sin(i * Math.PI / 4 + Math.PI / 8) * k]);
    shape(ring8(0.95)); ctx.fill(); pen(col, 1.8); ctx.stroke();
    pen(col, 1.1); shape(ring8(0.48)); ctx.stroke();
    ring8(0.95).forEach(([ax, ay], i) => { const [bx, by] = ring8(0.48)[i]; seg(ax, ay, bx, by); });
  } else if (cut === 3) {
    // trillion: a triangle, point down
    shape([[-0.95, -0.65], [0.95, -0.65], [0, 1]]); ctx.fill(); pen(col, 1.8); ctx.stroke();
    pen(col, 1.1); shape([[-0.42, -0.36], [0.42, -0.36], [0, 0.4]]); ctx.stroke();
    seg(-0.95, -0.65, -0.42, -0.36); seg(0.95, -0.65, 0.42, -0.36); seg(0, 1, 0, 0.4);
  } else {
    shape([[0, -1], [0.82, -0.3], [0, 1], [-0.82, -0.3]]); ctx.fill(); pen(col, 1.8); ctx.stroke();
    pen(col, 1.1); seg(-0.82, -0.3, 0.82, -0.3); seg(-0.3, -0.3, 0, 1); seg(0.3, -0.3, 0, 1); seg(-0.3, -0.3, 0, -1); seg(0.3, -0.3, 0, -1);
  }
  if (!rays) return;
  pen(col, 1.3);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8, r0 = r + 4, l = 4 + (FX() ? 1.8 * Math.sin(t * 5 + i * 1.7) : 0); line(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * (r0 + l), y + Math.sin(a) * (r0 + l)); }
}
// A point on the outline of r and the outward normal there, s along the outline clockwise from the top left corner.
function outline(r, s) {
  const per = 2 * (r.w + r.h);
  s = ((s % per) + per) % per;
  if (s < r.w) return [r.x + s, r.y, 0, -1];
  if (s < r.w + r.h) return [r.x + r.w, r.y + s - r.w, 1, 0];
  if (s < 2 * r.w + r.h) return [r.x + r.w - (s - r.w - r.h), r.y + r.h, 0, 1];
  return [r.x, r.y + r.h - (s - 2 * r.w - r.h), -1, 0];
}
// Where the i-th mark of damage sits on the outline of r: they spread from the middle of the bottom edge, where the
// ball lands, round both sides.
function damageAt(r, i, rnd) { return outline(r, r.w + r.h + r.w / 2 + (i % 2 ? 1 : -1) * (r.w + r.h) * Math.min(0.97, (i + 0.25 + rnd() * 0.6) / 9)); }
// The shell of a brick too small for anything else: an outline with chips in it.
function chips(r, count, seed, col) {
  const rnd = mulberry(seed * 131 + 17);
  for (let i = 0; i < count; i++) {
    const [x, y, nx, ny] = damageAt(r, i, rnd), tx = -ny, ty = nx, len = 2.6 + rnd() * 1.8, lean = (rnd() - 0.5) * 3.4;
    pen(C.bg, 3.2); line(x - tx * 2, y - ty * 2, x + tx * 2, y + ty * 2);
    pen(col, 1.2); ctx.beginPath(); ctx.moveTo(x + nx * len + tx * lean, y + ny * len + ty * lean); ctx.lineTo(x - tx * lean * 0.5, y - ty * lean * 0.5); ctx.lineTo(x - nx * len + tx * lean, y - ny * len + ty * lean); ctx.stroke();
  }
}
// Only one shell of a brick is ever drawn: the outermost that is left. It is the face of the brick as it stands, a
// frame with one corner cut like a brick of the first wall, hatched in the colour of the route that raised the
// candidate, with the name of its gate and its place in the sequence. It cracks from the bottom edge, where the ball
// lands, the way a cell of the first wall does. What is behind it shows only once it has been broken.
function drawShell(r, o) {
  const cut = Math.min(6, r.h * 0.2), per = 2 * (r.w + r.h), frame = () => { ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.w - cut, r.y); ctx.lineTo(r.x + r.w, r.y + cut); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.lineTo(r.x, r.y + r.h); ctx.closePath(); };
  if (o.front) {
    ctx.save(); frame(); ctx.clip();
    pen(o.tone, 1, 0.7 * o.shown); cellPattern(o.pattern, r.x, r.y, r.w, r.h); ctx.globalAlpha = 1;
    if (o.hit && r.w >= 30) drawCracks({ i: 4096 + (o.seed >> 3) }, o.seed & 7, r, r, o.hit, o.t, 1);
    ctx.restore();
    if (o.hit && r.w < 30) chips(r, Math.ceil((1 - Math.exp(-o.hit.n / 5)) * 9), o.seed, o.tone);
  }
  pen(o.tone, o.width); if (o.dash) ctx.setLineDash([3, 3]); else if (o.shown < 1) ctx.setLineDash([per * o.shown, per]);
  frame(); ctx.stroke(); ctx.setLineDash([]);
  if (o.front && r.w >= 64 && r.h >= 24 && o.shown >= 1) {
    const size = 8, tw = (o.label.length + o.step.length + 1) * size * 0.62 + 9;
    ctx.fillStyle = C.bg; ctx.fillRect(r.x + 4, r.y + 4, Math.min(tw, r.w - 8), 12);
    text(o.label, r.x + 8, r.y + 10.5, { size, w: 600, color: o.tone });
    text(o.step, r.x + 8 + (o.label.length + 1) * size * 0.62, r.y + 10.5, { size, color: C.muted });
  }
}
function drawArmour(ci, cs, S, t, active, win, live) {
  const G = armourGeom(ci, win);
  if (!G) return;
  const c = M.cands[ci], col = routeColor(c.owner), st = cs.els, n = c.els.length, landed = flightStart(ci, cs, win) + FLY, cx = G.x + G.w / 2, cy = G.y + G.h / 2, decided = cs.verdict >= 0, age = t - cs.verdict;
  const fp = decided && cs.out === "false_positive", lit = decided && cs.out === "verified", noted = decided && (cs.out === "observation" || cs.out === "residual_risk"), open = decided && cs.out === "open", vcol = verdictColor(cs), stt = candStatus(ci, cs, S, active);
  if (win.label) {
    text(fit(c.id, win.px - 8, { size: 10, w: 500 }), cx, G.y + G.h + 12, { align: "center", size: 10, w: 500, color: fp ? C.muted : C.ink });
    if (win.label > 20) text(fit(stt.s, win.px - 6, { size: 8.5 }), cx, G.y + G.h + 24, { align: "center", size: 8.5, color: stt.col });
  }
  if (live) hits.push({ rect: G, r: G.w / 2, tip: candidateTip(ci, cs, S, active) });
  if (active && !decided) { pen(col, 1.4); brackets(G.x - 7, G.y - 7, G.w + 14, G.h + 14, Math.min(9, G.h / 3)); }
  if (FX() && t < landed) return;
  const built = FX() ? clamp((t - landed) / 0.55, 0, 1) : 1, m = Math.min(G.w, G.h), d = (m / 2 - m * 0.13) / n, shell = (k) => ({ x: G.x + k * d, y: G.y + k * d, w: G.w - 2 * k * d, h: G.h - 2 * k * d });
  let closed = 0; while (closed < n && st[closed] && st[closed].pass === true) closed++;
  const failed = closed < n && Boolean(st[closed]) && st[closed].pass === false, steel = fp || failed, hit = closed < n && !steel ? cs.hits.get(closed) || null : null, fresh = hit && t - hit.t < 0.12 && FX();
  let dx = 0;
  if (FX() && hit && t - hit.t < 0.2) { const g = t - hit.t; dx = Math.sin(g * 70) * 2.4 * (1 - g / 0.2); }
  ctx.save(); ctx.translate(cx + dx, cy); ctx.rotate(G.rot); ctx.translate(-cx, -cy);
  if (G.mini) {
    ctx.fillStyle = C.bg; ctx.fillRect(G.x, G.y, G.w, G.h);
    pen(lit ? vcol : steel ? C.muted : active ? col : C.ink, lit ? 1.6 : 1.2); if (steel || open) ctx.setLineDash([2, 2]);
    ctx.strokeRect(G.x, G.y, G.w, G.h); ctx.setLineDash([]);
    if (lit) { pen(vcol, 1.4); ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx + 3.4, cy); ctx.lineTo(cx, cy + 4); ctx.lineTo(cx - 3.4, cy); ctx.closePath(); ctx.stroke(); }
    else if (steel) { pen(C.muted, 1.2); line(G.x + 3, G.y + G.h - 3, G.x + G.w - 3, G.y + 3); }
    else { const pw = (G.w - 6) / n; c.els.forEach((el, k) => { const s = st[k]; pen(!s ? C.hair : s.pass === true ? col : C.muted, s ? 2 : 1.2); line(G.x + 3 + k * pw + 0.8, cy, G.x + 3 + (k + 1) * pw - 0.8, cy); }); }
  } else {
    // A broken shell leaves its corners behind; what is left of the brick is everything inside the last broken one.
    for (let k = 0; k < (lit || noted ? Math.min(1, closed) : closed); k++) { const r = shell(k); pen(C.hair, 1); brackets(r.x, r.y, r.w, r.h, clamp(d * 1.1, 2.5, 6)); }
    if (closed < n) {
      const r0 = shell(closed), ex = Math.min(3, r0.h / 8);
      pen(C.muted, 1, 0.8); ctx.beginPath(); ctx.moveTo(r0.x, r0.y + r0.h); ctx.lineTo(r0.x + ex, r0.y + r0.h + ex); ctx.lineTo(r0.x + r0.w + ex, r0.y + r0.h + ex); ctx.lineTo(r0.x + r0.w + ex, r0.y + ex); ctx.lineTo(r0.x + r0.w, r0.y); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = C.bg; ctx.fillRect(r0.x, r0.y, r0.w, r0.h);
      if (steel) { pen(C.muted, 1, 0.5); hatch(r0.x, r0.y, r0.w, r0.h, 6, 1); hatch(r0.x, r0.y, r0.w, r0.h, 6, -1); ctx.globalAlpha = 1; }
      {
        const el = c.els[closed], sc = st[closed], facing = !steel && !noted, tone = steel || noted ? C.muted : sc && sc.pass === null ? C.muted : col, since = closed > 0 ? t - st[closed - 1].t : t - landed;
        drawShell(r0, { tone, width: steel ? 1.6 : fresh ? 2.5 : 1.6, dash: !steel && Boolean(sc) && sc.pass === null, front: facing, hit: facing ? hit : null, t, shown: FX() ? clamp(since / 0.3, 0, 1) : 1, label: el.label.toUpperCase(), step: closed + 1 + "/" + n,
          pattern: ((el.kind === "poc" ? 5 : [0, 1, 4, 5, 3][Math.max(0, ["claim", "trigger", "impact", "poc", "severity"].indexOf(el.gate))]) + vary(3)) % 6, seed: ci * 8 + closed });
      }
      if (steel) { const q = clamp(m * 0.1, 3, 7); pen(fp ? C.muted : C.sev.Critical, 1.6); line(cx - q, cy - q, cx + q, cy + q); line(cx + q, cy - q, cx - q, cy + q); }
    }
    if (!steel && built >= 1) {
      const R = m * 0.13, exposed = closed === n;
      if (lit) gem(cx, cy, m * 0.3 * (FX() ? backOut(clamp(age / 0.3, 0, 1)) : 1), vcol, t, true, G.cut);
      else if (noted) { pen(vcol, 1.4); ctx.beginPath(); ctx.arc(cx, cy, R * 0.6, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = vcol; ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, Math.PI * 2); ctx.fill(); pen(vcol, 1, 0.7); for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; line(cx + Math.cos(a) * (R * 0.6 + 3), cy + Math.sin(a) * (R * 0.6 + 3), cx + Math.cos(a) * (R * 0.6 + 6), cy + Math.sin(a) * (R * 0.6 + 6)); } ctx.globalAlpha = 1; }
      else if (exposed || open) {
        // The core shows once every shell is off, and stays a question until the verdict.
        const r = R * (exposed ? 0.85 + (FX() && !HOLD && !decided ? 0.12 * Math.sin(t * 4) : 0) : 0.6);
        pen(exposed ? C.ink : C.muted, exposed ? 1.4 : 1); if (!exposed || open) ctx.setLineDash([2, 2.5]);
        ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.82, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.82, cy); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
        if (open) text("?", cx + r + 8, cy, { align: "center", size: 10, color: C.ink });
      }
    }
  }
  ctx.restore(); ctx.globalAlpha = 1;
  const top = G.y - 6, big = G.w >= 70;
  c.els.forEach((el, k) => {
    const s = st[k];
    if (!s) return;
    const ga = t - s.t, tone = s.pass === true ? col : s.pass === false ? C.sev.Critical : C.muted;
    if (s.pass === true && !G.mini) lineShards(rectEdges(shell(k)), cx, cy, ga, col, ci * 13 + k, 0.9);
    burst(cx, G.y + G.h, ga, tone, ci * 13 + k, s.pass === true ? 12 : 9, 0.5, big ? 220 : 130, 80);
    if (s.pass === false) echo(G, ga, 0.45, C.sev.Critical, 0.5);
    if (big) floatText(el.label + (s.pass === true ? " ✓" : s.pass === false ? " ✗" : " ?"), cx, top, ga, 0.9, tone, 10);
    if (el.kind === "poc" && s.pass === true && big) ring(cx, cy, ga, 0.3, 4, G.w * 0.5, C.ink, 1.2);
  });
  if (!decided) return;
  if (lit) {
    burst(cx, cy, age, vcol, ci + 700, big ? 32 : 12, 0.8, big ? 380 : 190, 100);
    ring(cx, cy, age, 0.55, big ? 8 : 4, big ? 110 : 40, vcol, 1.6); if (big) ring(cx, cy, age - 0.09, 0.55, 8, 66, C.ink, 1);
    floatText((cs.sev || "verified").toUpperCase(), cx, top - (big ? 6 : 0), age, 1.3, vcol, big ? 13 : 9.5);
  } else if (noted) { ring(cx, cy, age, 0.45, 5, big ? 46 : 20, vcol, 1.2); if (big) floatText(OUT_LABEL[cs.out], cx, top, age, 1.2, vcol, 10); }
  else if (fp) { streaks(cx, cy, age, C.muted, ci + 900, big ? 10 : 5, 0.6, 160, 200); echo(G, age, 0.4, C.muted, 0.35); if (big) floatText(OUT_LABEL[cs.out], cx, top, age, 1.2, C.muted, 10); }
  else { echo({ x: G.x - 4, y: G.y - 4, w: G.w + 8, h: G.h + 8 }, age, 0.45, C.ink, 0.5); if (big) floatText(OUT_LABEL[cs.out], cx, top, age, 1.2, C.ink, 10); }
}
function drawFocusPanel(S, t, act, B, win) {
  if (win.focusH < 40) return;
  const a = clamp(win.focusH / 108, 0, 1), x = B.x + 20, w = B.w - 40, y = B.y + 46, big = clamp(B.w * 0.03, 12.5, 18);
  if (act >= 0) {
    const c = M.cands[act], cs = S.cands[act], stt = candStatus(act, cs, S, true);
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
// The fp-check paddle and its ball, in the frame of the bench.
function verifyPad(B) { const pw = clamp(B.w * 0.16, 40, 130); return { y: B.y + B.h - 34, pw, lo: B.x + 18 + pw / 2, hi: B.x + B.w - 18 - pw / 2, cx: B.x + B.w / 2, q: clamp(B.w / 640, 0.7, 1) }; }
function verifyTarget(ci, win, B) { const G = armourGeom(ci, win); return G ? { x: G.x + G.w / 2, y: G.y + G.h + 5 } : { x: B.x + B.w / 2, y: B.y + 60 }; }
function verifyBallAt(t, S, win, B, P, padX, F) {
  const pad = (time) => ({ x: padX(time), y: P.y - 8 * P.q }), idle = (start, end) => idleBall("fp-check", 977, start, end, t, pad, F);
  let lo = 0, hi = V.segs.length - 1, found = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (V.segs[m].t0 <= t) { found = m; lo = m + 1; } else hi = m - 1; }
  const s = found >= 0 && t <= V.segs[found].t1 ? V.segs[found] : null;
  if (!s) {
    // Outside the plan the ball is in play for as long as verification runs.
    const start = found >= 0 ? V.segs[found].t1 : M.tBench + 1.5, end = found + 1 < V.segs.length ? V.segs[found + 1].t0 : Infinity;
    return S.phase !== 2 ? null : t < start ? { ...pad(t), vx: 0, vy: 0, ride: true } : idle(start, end);
  }
  if (s.kind === "ride") return idle(s.t0, s.t1);
  const k = (t - s.t0) / Math.max(0.001, s.t1 - s.t0), at = verifyTarget(s.c, win, B);
  if (s.kind === "down") { const p1 = pad(s.t1), ky = k * (0.55 + 0.45 * k), c = curve(at, p1, k, Math.round(s.t0 * 10) + 5); return { x: lerp(at.x, p1.x, k) + c.x, y: lerp(at.y, p1.y, ky) + c.y, vx: p1.x - at.x, vy: p1.y - at.y, age: t - s.t0 }; }
  const p0 = pad(s.t0), c = curve(p0, at, k, Math.round(s.t0 * 10) + 11);
  return { x: lerp(p0.x, at.x, k) + c.x, y: lerp(p0.y, at.y, k) + c.y, vx: at.x - p0.x, vy: at.y - p0.y };
}
function drawVerifyBall(t, S, win, B, P, padX, F) {
  const p = verifyBallAt(t, S, win, B, P, padX, F);
  if (!p) return;
  const rad = 5.5 * P.q, sp = Math.hypot(p.vx, p.vy);
  if (FX() && !p.ride) {
    let prev = p;
    for (let k = 1; k <= 18; k++) {
      const q = verifyBallAt(t - k * 0.016, S, win, B, P, padX, F);
      if (!q || q.ride) break;
      pen(C.ink, 1.6 * (1 - k / 19) + 0.4, 0.9 * (1 - k / 19)); line(prev.x, prev.y, q.x, q.y); prev = q;
    }
    ctx.globalAlpha = 1;
    if (p.wallHit) ring(p.wallHit.x, p.wallHit.y, p.wallHit.age, 0.28, 2, 18, C.ink, 1.2);
  }
  let sx = 1, sy = 1;
  if (FX() && sp) { sx = 1.3; sy = 0.8; }
  if (FX() && p.age != null && p.age < 0.08) { sx = 0.7; sy = 1.35; }
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(sp ? Math.atan2(p.vy, p.vx) : 0); ctx.scale(sx, sy);
  ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
  pen(C.ink, 1.6); ctx.stroke(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 0, 1.6 * P.q, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (p.ride) text("FP", p.x, p.y - rad - 7.5, { align: "center", size: 8.5, color: C.ink });
}
function drawBench(S, t, act, Rg, p1, p2) {
  const now = Rg.bench, B = regions(1, p2).bench, dx = now.x - B.x, dy = now.y - B.y, win = benchLayout(S, act, B, p2);
  if (now.w > 4 && now.h > 4) {
    ctx.save(); ctx.beginPath(); ctx.rect(now.x, now.y, now.w, now.h); ctx.clip(); ctx.translate(dx, dy);
    const hidden = win.raised.length - win.rows.length;
    text("VERIFICATION WALL", B.x + 14, B.y + 18, { size: 9.5 });
    pen(C.hair, 1); line(B.x + 140, B.y + 18, B.x + B.w - 14 - (hidden > 0 ? 66 : 0), B.y + 18);
    if (hidden > 0) text("+" + hidden + " more", B.x + B.w - 14, B.y + 18, { size: 9.5, align: "right" });
    if (!win.raised.length) text("No candidates were raised", B.x + B.w / 2, B.y + B.h / 2, { align: "center", size: 11 });
    drawFocusPanel(S, t, act, B, win);
    for (const ci of win.rows) drawArmour(ci, S.cands[ci], S, t, act === ci, win, p1 >= 1);
    if (win.raised.length) {
      const P = verifyPad(B), padX = (time) => trackX(V.keys, time, (k) => clamp(P.cx + (verifyTarget(k.c, win, B).x - P.cx) * 0.7, P.lo, P.hi), P.cx);
      const top = B.y + 34 + win.focusH, still = HOLD ? Math.min(t, HOLD.since) : t, rects = [];
      for (const ci of win.rows) { const G = armourGeom(ci, win); if (G) rects.push({ x: G.x, y: G.y, w: G.w, h: G.h + win.label }); }
      // The side walls of the second wall, for the ball to come off.
      pen(C.muted, 1); line(B.x + 10, top, B.x + 10, P.y + 12); line(B.x + B.w - 10, top, B.x + B.w - 10, P.y + 12); pen(C.hair, 1); line(B.x + 10, top, B.x + B.w - 10, top);
      drawPaddle(t, padX, P.y, P.pw, P.q, V.keys, B.w * 0.55, B.h > 200 ? "FP-CHECK" : null);
      drawVerifyBall(still, S, win, B, P, padX, idleField(B.x + 12, B.x + B.w - 12, top + 2, P.y - 8 * P.q, rects, 7));
    }
    ctx.restore();
  }
  // A candidate leaves its brick as a capsule and lands in the second wall, where it unfolds into its armour.
  for (const ci of win.raised) {
    const cs = S.cands[ci], c = M.cands[ci], start = flightStart(ci, cs, win);
    if (!FX() && t >= start) continue;
    if (t >= start + FLY) continue;
    const mates = win.raised.filter((x) => M.cands[x].unit === c.unit), slot = Math.min(mates.indexOf(ci), 5), rad = 5 * L.q;
    let from;
    if (c.unit >= 0) { const r = L.rect(c.unit); from = { x: r.x + r.w - 4 - slot * (rad * 3 + 5), y: r.y - rad * 0.3 }; }
    else from = { x: L.x1 - 12 - slot * (rad * 3 + 5), y: L.y0 + 14 };
    if (t < start) {
      const pop = FX() ? backOut(clamp((t - cs.raised) / 0.3, 0, 1)) : 1;
      capsule(from.x, from.y, rad * pop, C.ink, -0.45);
      ring(from.x, from.y, t - cs.raised, 0.35, 3, 22, routeColor(c.owner), 1.2);
      floatText(fit(c.id, 90, { size: 10 }) + " !", from.x, from.y - rad - 6, t - cs.raised, 0.9, routeColor(c.owner), 10);
      hits.push({ rect: { x: from.x - rad * 1.5 - 3, y: from.y - rad - 3, w: rad * 3 + 6, h: rad * 2 + 6 }, r: rad, tip: candidateTip(ci, cs, S, false) });
      continue;
    }
    const G = armourGeom(ci, win), to = G ? { x: G.x + G.w / 2 + dx, y: G.y + G.h / 2 + dy, r: Math.min(G.w, G.h) * 0.2 } : { x: now.x + now.w - 20, y: now.y + now.h - 20, r: rad };
    const k = smooth(clamp((t - start) / FLY, 0, 1)), at = (q) => ({ x: lerp(from.x, to.x, q), y: lerp(from.y, to.y, q) - Math.sin(q * Math.PI) * 46 }), p = at(k);
    let prev = p;
    for (let i = 1; i <= 10; i++) { const q = at(Math.max(0, k - i * 0.02)); pen(routeColor(c.owner), 1.3, 0.7 * (1 - i / 11)); line(prev.x, prev.y, q.x, q.y); prev = q; }
    ctx.globalAlpha = 1;
    capsule(p.x, p.y, lerp(rad, to.r, k), C.ink, -0.45 + k * Math.PI * 2);
  }
}
export function draw(S, t) {
  hits.length = 0;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  if (!M || !S) { text("No session recorded for this engagement", W / 2, H / 2, { align: "center", size: 11 }); return { p2: 0, find: { x: 0, y: H, w: W, h: 0 } }; }
  baseLayout();
  const p1 = progress(t, M.tBench), p2 = progress(t, M.tResults), Rg = regions(p1, p2), sh = shakeAt(M, t), act = activeCandidate(M, S);
  wallGeometry(Rg.wall);
  const stale = M.hooked && M.session.phase !== "closed" && t - M.lastActivity > STALE;
  HOLD = S.hold ? { mode: S.hold, since: S.holdAt } : stale ? { mode: "pause", since: M.lastActivity + STALE } : null;
  ctx.save(); ctx.translate(sh.x, sh.y);
  setLineScale(L.q);
  FIELD = idleField(L.x0 - 4, L.x1 + 4, L.y0 - 4, L.padY - 8 * L.q, M.units.filter((U) => S.units[U.i].shown >= 0 && S.units[U.i].shown <= t && S.units[U.i].broken < 0).map((U) => L.rect(U.i)), 7 * L.q);
  drawSheet(S, t, sh.pulse);
  M.units.forEach((U) => drawBrick(U, S.units[U.i], t));
  drawMarks(act);
  drawPaddle(t, paddleX, L.padY, L.pw, L.q, M.KEYS, (L.x1 - L.x0) * 0.55, L.ss > 0.7 ? "ROUTER" : null);
  drawBalls(HOLD ? Math.min(t, HOLD.since) : t);
  drawBrickFx(t);
  setLineScale(1);
  drawBench(S, t, act, Rg, p1, p2);
  if (HOLD) { ctx.fillStyle = C.bg; ctx.globalAlpha = 0.5 * (FX() ? clamp((t - HOLD.since) / 0.4, 0, 1) : 1); ctx.fillRect(-20, -20, W + 40, Rg.find.y + 20); ctx.globalAlpha = 1; }
  drawTopHud(S, t);
  ctx.restore();
  drawBanner(M, t, Rg.wall);
  return { p2, find: Rg.find };
}

