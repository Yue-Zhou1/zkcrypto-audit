import { PHASE_LABEL, OUT_LABEL, mulberry, recent, segmentAt, activeCandidate, bare } from "./model.js";

const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace';
const DISP = 'ui-sans-serif, system-ui, "Segoe UI", Helvetica, Arial, sans-serif';
const WALL_W = 0.44, TOP_H = 0.46, NARROW = 720, FLY = 0.9, STALE = 300;

const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (k) => k * k * (3 - 2 * k);
const backOut = (k) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const elastic = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * (2 * Math.PI) / 3) + 1);
const clock = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(Math.floor(s % 60)).padStart(2, "0");

let cv, stage, ctx, M = null, C = {}, W = 0, H = 0, L = null, LW = 1, fx = true, hits = [], locate = null, base = null, baseKey = "", HOLD = null;
const CRACKS = new Map();

export function init(canvas, container) { cv = canvas; stage = container; refreshTokens(); resize(); }
export function setModel(model) { M = model; }
export function setEffects(on) { fx = on; }
export function locateUnit(u) { locate = { u, at: performance.now() }; }

export function refreshTokens() {
  const cs = getComputedStyle(document.documentElement), g = (n) => cs.getPropertyValue(n).trim();
  C = {
    bg: g("--bg"), ink: g("--ink"), muted: g("--muted"), hair: g("--hair"), faint: g("--faint"),
    route: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => g("--r" + i)),
    sev: { Critical: g("--s-critical"), High: g("--s-high"), Medium: g("--s-medium"), Low: g("--s-low"), Informational: g("--s-note"), note: g("--s-note") },
  };
}

export function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = Math.max(280, stage.clientWidth); H = Math.max(320, stage.clientHeight);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  baseKey = "";
}

export function tipAt(x, y) {
  let best = null;
  for (const h of hits) {
    const inside = x >= h.rect.x && x <= h.rect.x + h.rect.w && y >= h.rect.y && y <= h.rect.y + h.rect.h;
    if (inside && (!best || h.r < best.r)) best = h;
  }
  return best ? { text: best.tip, x: clamp(x + 14, 4, W - 270), y: clamp(y + 14, 4, H - 96) } : null;
}

const FX = () => fx;
const routeColor = (a) => (a >= 0 && M.routes[a].color >= 0 ? C.route[M.routes[a].color] : C.ink);

function text(s, x, y, o = {}) {
  ctx.font = (o.w || 400) + " " + (o.size || 10.5) + "px " + (o.font || MONO);
  ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "middle"; ctx.globalAlpha = o.alpha ?? 1;
  if (o.outline) { ctx.strokeStyle = o.color || C.ink; ctx.lineWidth = o.outline; ctx.lineJoin = "round"; ctx.strokeText(s, x, y); }
  else { ctx.fillStyle = o.color || C.muted; ctx.fillText(s, x, y); }
  ctx.globalAlpha = 1;
}
const FITS = new Map();
function fit(s, maxW, o = {}) {
  const font = (o.w || 400) + " " + (o.size || 10.5) + "px " + (o.font || MONO), key = font + "|" + Math.round(maxW) + "|" + s;
  const known = FITS.get(key);
  if (known !== undefined) return known;
  ctx.font = font;
  let out = s;
  if (maxW <= 0) out = "";
  else if (ctx.measureText(s).width > maxW) {
    let lo = 0, hi = s.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ctx.measureText(s.slice(0, m) + "…").width <= maxW) lo = m; else hi = m - 1; }
    out = s.slice(0, Math.max(1, lo)) + "…";
  }
  if (FITS.size > 4000) FITS.clear();
  FITS.set(key, out);
  return out;
}
function pen(color, width = 1, alpha = 1) { ctx.strokeStyle = color; ctx.lineWidth = width * LW; ctx.globalAlpha = alpha; ctx.lineCap = "round"; ctx.lineJoin = "round"; }
function line(x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
function hatch(x, y, w, h, gap, dir) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.beginPath();
  for (let i = -h; i < w + h; i += gap) { if (dir > 0) { ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); } else { ctx.moveTo(x + i, y); ctx.lineTo(x + i + h, y + h); } }
  ctx.stroke(); ctx.restore();
}
function rules(x, y, w, h, gap, vertical) {
  ctx.beginPath();
  if (vertical) for (let i = gap; i < w - 0.5; i += gap) { ctx.moveTo(x + i, y); ctx.lineTo(x + i, y + h); }
  else for (let i = gap; i < h - 0.5; i += gap) { ctx.moveTo(x, y + i); ctx.lineTo(x + w, y + i); }
  ctx.stroke();
}
function cellPattern(p, x, y, w, h) {
  if (p === 0) hatch(x, y, w, h, 4, 1);
  else if (p === 1) hatch(x, y, w, h, 4, -1);
  else if (p === 2) rules(x, y, w, h, 3.5, false);
  else if (p === 3) rules(x, y, w, h, 4, true);
  else if (p === 4) { hatch(x, y, w, h, 7, 1); hatch(x, y, w, h, 7, -1); }
  else { ctx.setLineDash([1.5, 3]); hatch(x, y, w, h, 3.5, 1); ctx.setLineDash([]); }
}
function brackets(x, y, w, h, s) {
  ctx.beginPath();
  for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) { ctx.moveTo(cx + dx * s, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * s); }
  ctx.stroke();
}

function progress(t, start) {
  if (!(start < Infinity)) return 0;
  return FX() ? smooth(clamp((t - start) / 1.1, 0, 1)) : (t >= start ? 1 : 0);
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
function placeBricks(sc, names, zone, tries) {
  const rnd = mulberry(977 + Math.round(sc * 100)), gap = 5 + 7 * sc, fs = fontScale(sc);
  const dims = M.units.map((U) => {
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
function baseLayout() {
  const key = W + "x" + H + ":" + M.units.map((u) => u.id + "/" + u.req.length).join("|");
  if (key === baseKey) return;
  baseKey = key;
  const zone = frameOf({ x: 0, y: 0, w: W, h: H }).zone, n = M.units.length;
  let rects = n ? null : [], names = true;
  const need = M.units.reduce((sum, U) => sum + (U.req.length * 25 + 14) * 36, 0), guess = clamp(Math.sqrt(zone.w * zone.h * 0.4 / Math.max(1, need)), 0.25, 2.2);
  let fs = 1;
  for (let sc = guess; n <= 300 && sc > 0.2 && !rects; sc -= 0.07) { names = sc >= 0.75; fs = fontScale(sc); rects = placeBricks(sc, names, zone, n > 40 ? 60 : 160); }
  if (!rects) {
    const cols = Math.ceil(Math.sqrt(n * zone.w / zone.h / 2.2)), rows = Math.ceil(n / cols), cw = zone.w / cols, ch = Math.min(30, zone.h / rows);
    rects = M.units.map((U, i) => ({ x: zone.x + (i % cols) * cw + 2, y: zone.y + Math.floor(i / cols) * ch + 2, w: cw - 4, h: ch - 4, rot: 0 }));
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

function paddleX(t) {
  const keys = M.KEYS, lo = L.x0 + L.pw / 2, hi = L.x1 - L.pw / 2;
  if (!keys.length) return L.cx;
  const keyX = (k) => { const r = L.rect(k.u); return clamp(L.cx + (r.x + r.w / 2 - L.cx) * 0.7, lo, hi); };
  let a = 0, b = keys.length;
  while (a < b) { const m = (a + b) >> 1; if (keys[m].t < t) a = m + 1; else b = m; }
  const from = Math.max(0, a - 8), to = Math.min(keys.length, a + 8);
  let near = Infinity;
  for (let i = from; i < to; i++) near = Math.min(near, Math.abs(keys[i].t - t));
  let sw = 0, sx = 0;
  for (let i = from; i < to; i++) { const d = Math.abs(keys[i].t - t), w = Math.exp(-(d * d - near * near) / 0.3); sw += w; sx += w * keyX(keys[i]); }
  return sx / sw;
}
const padPoint = (a, t) => ({ x: paddleX(t) + ((M.routes[a].color % 6) - 2.5) * Math.min(12, L.pw / 8), y: L.padY - 8 * L.q });
function ballAt(a, t) {
  const s = segmentAt(M, a, t);
  if (!s) return null;
  if (s.kind === "ride") { const p = padPoint(a, t); return { x: p.x, y: p.y, vx: 0, vy: 0, ride: true, since: t - s.t0, left: s.t1 - t }; }
  const k = (t - s.t0) / Math.max(0.001, s.t1 - s.t0);
  if (s.kind === "down") {
    const p0 = brickPoint(s.u, a), p1 = padPoint(a, s.t1), ky = k * (0.55 + 0.45 * k);
    return { x: lerp(p0.x, p1.x, k), y: lerp(p0.y, p1.y, ky), vx: p1.x - p0.x, vy: p1.y - p0.y, age: t - s.t0 };
  }
  const p0 = padPoint(a, s.t0), p1 = brickPoint(s.u, a), dx = p1.x - p0.x, fw = L.x1 - L.x0;
  if (Math.abs(dx) > fw * 0.22 || s.n % 3 === 0) {
    const wall = (dx > 0 || (Math.abs(dx) <= fw * 0.22 && s.n % 2)) ? L.x1 + 2 : L.x0 - 2, mx = 2 * wall - p1.x;
    const kw = (wall - p0.x) / (mx - p0.x), wy = lerp(p0.y, p1.y, kw);
    const l1 = Math.hypot(wall - p0.x, wy - p0.y), l2 = Math.hypot(p1.x - wall, p1.y - wy), d = k * (l1 + l2);
    if (kw > 0.08 && kw < 0.92 && wy > L.y0 + 16) {
      if (d < l1) return { x: lerp(p0.x, wall, d / l1), y: lerp(p0.y, wy, d / l1), vx: wall - p0.x, vy: wy - p0.y };
      return { x: lerp(wall, p1.x, (d - l1) / l2), y: lerp(wy, p1.y, (d - l1) / l2), vx: p1.x - wall, vy: p1.y - wy, wallHit: { x: wall, y: wy, age: (d - l1) / (l1 + l2) * (s.t1 - s.t0) } };
    }
  }
  return { x: lerp(p0.x, p1.x, k), y: lerp(p0.y, p1.y, k), vx: dx, vy: p1.y - p0.y };
}

function streaks(x, y, age, color, seed, n, life, speed, grav = 220) {
  if (!FX() || age < 0 || age > life) return;
  const rnd = mulberry(seed * 7919 + 3), k = age / life;
  pen(color, 1.2);
  for (let i = 0; i < n; i++) {
    const ang = rnd() * Math.PI * 2, sp = speed * (0.35 + rnd() * 0.65), d = sp * (1 - Math.exp(-age * 3.4)) / 3.4, len = 3 + sp * 0.05 * (1 - k);
    const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d + grav * age * age * 0.5;
    ctx.globalAlpha = (1 - k) * (0.5 + rnd() * 0.5);
    line(px, py, px - Math.cos(ang) * len, py - Math.sin(ang) * len - grav * age * 0.03);
  }
  ctx.globalAlpha = 1;
}
function ring(x, y, age, life, r0, r1, color, width = 1.2) {
  if (!FX() || age < 0 || age > life) return;
  const k = age / life;
  pen(color, width, 1 - k); ctx.beginPath(); ctx.arc(x, y, lerp(r0, r1, 1 - (1 - k) * (1 - k)), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
}
function echo(r, age, life, color, grow = 0.55) {
  if (!FX() || age < 0 || age > life) return;
  const k = age / life, s = 1 + grow * (1 - (1 - k) * (1 - k)), w = r.w * s, h = r.h * s;
  pen(color, 1, 1 - k); ctx.strokeRect(r.x + r.w / 2 - w / 2, r.y + r.h / 2 - h / 2, w, h); ctx.globalAlpha = 1;
}
function lineShards(edges, cx, cy, age, color, seed, life = 1.0) {
  if (!FX() || age < 0 || age > life) return;
  const rnd = mulberry(seed * 104729 + 5), k = age / life;
  pen(color, 1.3, 1 - k * k);
  for (const [x0, y0, x1, y1] of edges) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, ox = mx - cx, oy = my - cy, d = Math.hypot(ox, oy) || 1;
    const vx = ox / d * (60 + rnd() * 120) + (rnd() - 0.5) * 80, vy = oy / d * (40 + rnd() * 80) - 60 - rnd() * 90, rot = (rnd() - 0.5) * 9 * age;
    const px = mx + vx * age, py = my + vy * age + 480 * age * age * 0.5, hx = (x1 - x0) / 2, hy = (y1 - y0) / 2, c = Math.cos(rot), s = Math.sin(rot);
    line(px - (hx * c - hy * s), py - (hx * s + hy * c), px + (hx * c - hy * s), py + (hx * s + hy * c));
  }
  ctx.globalAlpha = 1;
}
function rectEdges(r) { return [[r.x, r.y, r.x + r.w, r.y], [r.x + r.w, r.y, r.x + r.w, r.y + r.h], [r.x + r.w, r.y + r.h, r.x, r.y + r.h], [r.x, r.y + r.h, r.x, r.y]]; }
function floatText(s, x, y, age, life, color, size = 10.5, weight = 500) {
  if (age < 0 || age > life) return;
  const k = age / life, rise = FX() ? 24 * (1 - (1 - k) * (1 - k)) : 12, a = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
  text(s, x, y - rise, { align: "center", size, w: weight, color, alpha: a });
  if (FX()) { const tw = s.length * size * 0.31, u = clamp(age / 0.2, 0, 1); pen(color, 1, a); line(x - tw * u, y - rise + size * 0.75, x + tw * u, y - rise + size * 0.75); ctx.globalAlpha = 1; }
}
function shakeAt(t) {
  if (!FX()) return { x: 0, y: 0, pulse: 0 };
  let trauma = 0, pulse = 0;
  for (const e of recent(M, t, 0.5)) {
    const age = t - e.t;
    let amp = 0;
    if (e.type === "cover") amp = e.broke ? 0.5 : 0.14;
    else if (e.type === "verdict") amp = e.out === "verified" ? (e.sev === "Critical" ? 1 : 0.7) : e.out === "open" ? 0.55 : 0.3;
    else if (e.type === "phase") amp = 0.3;
    else if (e.type === "reopen") amp = 0.45;
    else if (e.type === "gate" && e.pass === false) amp = 0.4;
    const w = Math.max(0, 1 - age / 0.38);
    trauma += amp * w; pulse = Math.max(pulse, amp * w);
  }
  trauma = Math.min(1, trauma);
  const m = 9 * trauma * trauma;
  return { x: m * Math.sin(t * 97.3 + 1.7), y: m * Math.cos(t * 83.1), pulse };
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
  const rnd = mulberry(key * 131 + 17), order = [];
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
  const per = 2 * (r.w + r.h), hot = s.hit >= 0 && t - s.hit < 0.12 && FX(), g = cellGeom(U, r), fade = clamp((drawn - 0.5) * 2, 0, 1), ch = Math.min(5, r.h / 4), ex = Math.min(3, r.h / 6);
  const edge = s.reopen >= 0 ? C.sev.High : C.ink;
  pen(C.muted, 1, 0.8 * fade); ctx.beginPath();
  ctx.moveTo(r.x, r.y + r.h); ctx.lineTo(r.x + ex, r.y + r.h + ex); ctx.lineTo(r.x + r.w + ex, r.y + r.h + ex); ctx.lineTo(r.x + r.w + ex, r.y + ch + ex); ctx.lineTo(r.x + r.w, r.y + ch);
  ctx.moveTo(r.x + r.w, r.y + r.h); ctx.lineTo(r.x + r.w + ex, r.y + r.h + ex);
  ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = C.bg; ctx.beginPath();
  ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.w - ch, r.y); ctx.lineTo(r.x + r.w, r.y + ch); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.lineTo(r.x, r.y + r.h); ctx.closePath(); ctx.fill();
  pen(edge, hot ? 1.2 + 1.3 * s.hitK : 1.2);
  if (drawn < 1) ctx.setLineDash([per * drawn, per]);
  ctx.stroke(); ctx.setLineDash([]);
  if (L.names) {
    const fs = L.fs;
    text(fit(U.label, r.w - 30 * fs, { size: 9 * fs }), r.x + 6, r.y + 8 * fs, { size: 9 * fs, alpha: fade, color: C.ink });
    text(String(U.i + 1).padStart(2, "0"), r.x + r.w - ch - 4, r.y + 8 * fs, { size: 7.5 * fs, alpha: 0.8 * fade, align: "right" });
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
      streaks(sx, r.y + r.h, age, col, e.i, e.broke ? 26 : 12, 0.6, (e.broke ? 360 : 240) * L.q);
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
function drawPaddle(t) {
  const x = paddleX(t), y = L.padY, keys = M.KEYS;
  let sq = 0;
  if (FX() && keys.length) {
    let a = 0, b = keys.length;
    while (a < b) { const m = (a + b) >> 1; if (keys[m].t <= t) a = m + 1; else b = m; }
    for (let i = a - 1; i >= 0 && t - keys[i].t < 0.3; i--) sq = Math.max(sq, 1 - elastic((t - keys[i].t) / 0.3));
  }
  const vel = (x - paddleX(t - 0.05)) / 0.05, sp = clamp(Math.abs(vel) / ((L.x1 - L.x0) * 0.55), 0, 1), dir = Math.sign(vel);
  const pw = L.pw * (1 + sq * 0.12 + (FX() ? sp * 0.1 : 0)), ph = 10 * L.q * (1 - sq * 0.35), py = y + sq * 3;
  if (FX() && sp > 0.08) {
    for (let g = 1; g <= 3; g++) { const gx = paddleX(t - g * 0.07); if (Math.abs(gx - x) < 3) continue; pen(C.ink, 1, sp * 0.38 / g); ctx.beginPath(); ctx.roundRect(gx - pw / 2, py, pw, ph, ph / 2); ctx.stroke(); }
    pen(C.ink, 1, sp * 0.7);
    for (let g = 0; g < 3; g++) { const sx = x - dir * (pw / 2 + 6), len = (14 + g * 9) * sp, sy = py + 1.5 + g * 3.5 * L.q; line(sx, sy, sx - dir * len, sy); }
    ctx.globalAlpha = 1;
  }
  pen(C.ink, 1.5); ctx.beginPath(); ctx.roundRect(x - pw / 2, py, pw, ph, ph / 2); ctx.stroke();
  pen(C.ink, 1); line(x - pw / 2 + 9, py + ph / 2, x + pw / 2 - 9, py + ph / 2);
  if (L.ss > 0.7) { pen(C.muted, 1); line(x, py + ph + 3, x, py + ph + 9); text("ROUTER", x, py + ph + 16, { align: "center", size: 8.5 }); }
}
function drawBalls(t) {
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
    const idle = !HOLD && p.ride && p.since > 4 && p.left > 1;
    if (idle) {
      const rot = FX() ? t * 1.6 : 0;
      pen(col, 1, 0.8); ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(p.x, p.y, rad + 7.5, rot, rot + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      text(route.key + " " + clock(p.since), p.x, p.y - rad - 18, { align: "center", size: 9.5, color: col });
    }
    const sp = Math.hypot(p.vx, p.vy), ang = sp ? Math.atan2(p.vy, p.vx) : 0;
    let sx = 1, sy = 1;
    if (FX() && sp) { sx = 1.3; sy = 0.8; }
    if (FX() && p.age != null && p.age < 0.08) { sx = 0.7; sy = 1.35; }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang); ctx.scale(sx, sy);
    ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
    pen(col, 1.6); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 1.6 * L.q, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (p.ride && !idle && L.ss > 0.6) text(route.key, p.x, p.y - rad - 7.5, { align: "center", size: 8.5, color: col });
  }
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

function bulb(x, y, r, color, mode, t, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  if (r < 5.5 && mode !== "note") {
    const col = mode === "lit" ? color : mode === "dud" ? C.muted : C.ink;
    ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    pen(col, mode === "lit" ? 1.5 : 1.1); if (mode === "dud") ctx.setLineDash([1.5, 2]); if (mode === "open") ctx.setLineDash([2, 2]);
    ctx.stroke(); ctx.setLineDash([]);
    if (mode === "lit") {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(Math.cos(a) * (r + 1.5), Math.sin(a) * (r + 1.5), Math.cos(a) * (r + 3.2), Math.sin(a) * (r + 3.2)); }
    }
    if (mode === "dud") line(-r * 0.8, r * 0.8, r * 0.8, -r * 0.8);
    ctx.restore(); ctx.globalAlpha = 1; return;
  }
  if (mode === "note") {
    const q = r * 0.55;
    ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(0, 0, q, 0, Math.PI * 2); ctx.fill(); pen(color, 1.4); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill();
    pen(color, 1, 0.7); for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; line(Math.cos(a) * (q + 3), Math.sin(a) * (q + 3), Math.cos(a) * (q + 6), Math.sin(a) * (q + 6)); }
    ctx.restore(); ctx.globalAlpha = 1; return;
  }
  const edge = mode === "lit" ? color : mode === "dud" ? C.muted : C.ink;
  pen(mode === "dud" ? C.muted : C.ink, 1.1); ctx.fillStyle = C.bg;
  ctx.beginPath(); ctx.rect(-r - 5, -r * 0.42, 6, r * 0.84); ctx.fill(); ctx.stroke(); line(-r - 2.2, -r * 0.42, -r - 2.2, r * 0.42);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  pen(edge, mode === "lit" ? 1.7 : 1.2); if (mode === "dud") ctx.setLineDash([2, 3]); if (mode === "open") ctx.setLineDash([3, 3]);
  ctx.stroke(); ctx.setLineDash([]);
  if (mode === "open") { ctx.rotate(-rot); text("?", 0, 0.5, { align: "center", size: r * 1.15, w: 500, color: C.ink }); ctx.rotate(rot); }
  else {
    pen(mode === "lit" ? color : C.muted, mode === "lit" ? 1.4 : 1); ctx.beginPath();
    ctx.moveTo(-r, 0); ctx.lineTo(-r * 0.5, 0); ctx.lineTo(-r * 0.25, -r * 0.42); ctx.lineTo(r * 0.05, r * 0.38); ctx.lineTo(r * 0.32, -r * 0.42); ctx.lineTo(r * 0.55, 0); ctx.stroke();
  }
  if (mode === "dud") { pen(C.muted, 1.2); line(-r * 0.9, r * 0.9, r * 0.9, -r * 0.9); }
  if (mode === "lit") {
    pen(color, 1.3);
    for (let i = 0; i < 8; i++) { if (i === 4) continue; const a = i * Math.PI / 4, l = 3.5 + (FX() ? 1.6 * Math.sin(t * 5 + i * 1.7) : 0); line(Math.cos(a) * (r + 3), Math.sin(a) * (r + 3), Math.cos(a) * (r + 3 + l), Math.sin(a) * (r + 3 + l)); }
  }
  if (mode === "open") { pen(C.ink, 1, 0.35 + 0.3 * Math.sin(t * 3)); ctx.setLineDash([1.5, 2.5]); for (let i = 0; i < 8; i++) { if (i === 4) continue; const a = i * Math.PI / 4; line(Math.cos(a) * (r + 3), Math.sin(a) * (r + 3), Math.cos(a) * (r + 7), Math.sin(a) * (r + 7)); } ctx.setLineDash([]); }
  ctx.restore(); ctx.globalAlpha = 1;
}

function verdictColor(cs) { return cs.out === "verified" ? (C.sev[cs.sev] || C.ink) : cs.out === "observation" || cs.out === "residual_risk" ? C.sev.note : C.muted; }
function candStatus(ci, cs, S, active) {
  const c = M.cands[ci];
  if (cs.verdict >= 0) return { s: cs.out === "verified" ? (cs.sev || "verified").toUpperCase() : OUT_LABEL[cs.out], col: cs.out === "open" ? C.ink : verdictColor(cs) };
  if (active) { const k = cs.els.findIndex((x) => !x); return { s: "probing " + (k >= 0 ? c.els[k].label : "verdict"), col: routeColor(c.owner) }; }
  if (S.phase === 1 && cs.els.some((x) => x)) return { s: "waiting for re-review", col: C.sev.High };
  return { s: S.phase >= 2 ? "queued" : "awaiting verification", col: C.muted };
}
function candidateTip(ci, cs, S, active) {
  const c = M.cands[ci];
  return c.id + " · " + c.title + (c.owner >= 0 ? "\nraised by " + bare(M.routes[c.owner].skill) : "") + (c.location ? "\n" + c.location : "") + "\n" + c.els.map((e, k) => e.label + " " + (!cs.els[k] ? "·" : cs.els[k].pass === true ? "✓" : cs.els[k].pass === false ? "✗" : "?")).join("  ") + "\n" + candStatus(ci, cs, S, active).s.toLowerCase();
}
function benchLayout(S, act, B, p2) {
  const raised = [];
  S.cands.forEach((c, i) => { if (c.raised >= 0) raised.push(i); });
  raised.sort((x, y) => S.cands[x].raised - S.cands[y].raised || x - y);
  const n = raised.length, maxCols = Math.max(1, Math.floor((B.w - 28) / 132));
  const plan = (focusH) => {
    const top = B.y + 38 + focusH, avail = Math.max(30, B.y + B.h - 10 - top);
    for (let cols = 1; cols <= maxCols; cols++) {
      const per = Math.ceil(Math.max(n, 1) / cols), rowH = avail / Math.max(per, cols === 1 ? 3 : 1);
      if (rowH >= (cols === 1 ? 20 : 15)) return { top, cols, per, rowH: Math.min(rowH, 76), focusH, shown: n };
    }
    const per = Math.max(1, Math.floor(avail / 15));
    return { top, cols: maxCols, per, rowH: 15, focusH, shown: Math.min(n, per * maxCols) };
  };
  const want = B.h > 380 && B.w > 300 ? 108 * (1 - p2) : 0;
  let lay = plan(want);
  if (want > 0 && (lay.shown < n || lay.rowH < 30)) lay = plan(0);
  let focus = raised.indexOf(act);
  if (focus < 0) { let best = -1; raised.forEach((ci, k) => { if (S.cands[ci].verdict >= 0 && (best < 0 || S.cands[ci].verdict >= S.cands[raised[best]].verdict)) best = k; }); focus = best < 0 ? n - 1 : best; }
  const first = clamp(focus - Math.floor(lay.shown / 2), 0, Math.max(0, n - lay.shown)), rows = raised.slice(first, first + lay.shown);
  return { ...lay, raised, rows, colW: (B.w - 28) / lay.cols, index: new Map(rows.map((ci, i) => [ci, i])), order: new Map(raised.map((ci, i) => [ci, i])) };
}
function circuitGeom(ci, win, B) {
  const idx = win.index.get(ci);
  if (idx == null) return null;
  const c = M.cands[ci], col = Math.floor(idx / win.per), row = idx % win.per;
  const R = { x: B.x + 14 + col * win.colW, y: win.top + row * win.rowH, w: win.colW - (win.cols > 1 ? 14 : 0), h: win.rowH - (win.rowH >= 30 ? 8 : 3) };
  const full = R.h >= 28 && R.w >= 380, lw = full ? clamp(R.w * 0.36, 130, 300) : R.w >= 300 ? R.w * 0.44 : Math.min(54, R.w * 0.4);
  const rb = full ? clamp(R.h * 0.2, 6, 11) : clamp(R.h * 0.3, 3.5, 5.4), x0 = R.x + 9 + lw, x1 = R.x + R.w - rb - (full ? 13 : 7), cy = R.y + R.h * 0.5;
  const span = (x1 - rb - (full ? 10 : 5) - x0 - 6) / c.els.length, mini = span < 17 || R.h < 28;
  return { R, full, lw, rb, x0, x1, cy, mini, hw: mini ? 2.5 : 6, xs: c.els.map((e, j) => x0 + 6 + span * (j + 0.5)) };
}
function flightStart(ci, cs, win) { return Math.max(cs.raised + 0.5, M.tBench + 0.35 + (win.order.get(ci) || 0) * Math.min(0.1, 2 / Math.max(1, win.raised.length))); }
function drawCircuit(ci, cs, S, t, active, win, B, live) {
  const G = circuitGeom(ci, win, B);
  if (!G) return;
  const c = M.cands[ci], R = G.R, col = routeColor(c.owner), cy = G.cy, st = cs.els, n = c.els.length, landed = flightStart(ci, cs, win) + FLY;
  const stt = candStatus(ci, cs, S, active), lx = R.x + 6, mw = G.lw - 16;
  if (G.full) {
    const three = R.h > 46, idw = Math.min(mw * 0.5, c.id.length * 6.8 + 8);
    pen(C.hair, 1); line(R.x, R.y + R.h + 4, R.x + R.w, R.y + R.h + 4);
    text(fit(c.id, idw, { size: 11, w: 500 }), lx, cy - (three ? 13 : 7), { size: 11, w: 500, color: C.ink });
    text(fit(stt.s, mw - idw - 4, { size: 9.5 }), lx + idw + 4, cy - (three ? 13 : 7), { size: 9.5, color: stt.col });
    text(fit(c.title, mw, { size: 9.5 }), lx, cy + (three ? 1 : 7), { size: 9.5, color: C.ink, alpha: 0.85 });
    if (three) text(fit(c.location + (c.owner >= 0 ? " · " + M.routes[c.owner].key : ""), mw, { size: 8.5 }), lx, cy + 14, { size: 8.5 });
  } else {
    const size = clamp(R.h * 0.62, 8, 10.5), wide = R.w >= 300, idw = wide ? Math.min(mw * 0.4, c.id.length * size * 0.62 + 6) : G.lw - 4;
    text(fit(c.id, idw, { size, w: 500 }), R.x + 3, cy, { size, w: 500, color: cs.out === "false_positive" ? C.muted : C.ink });
    if (wide) text(fit(c.title, G.lw - idw - 10, { size: size - 0.5 }), R.x + 3 + idw + 6, cy, { size: size - 0.5 });
  }
  if (active) { pen(C.ink, 1.2); brackets(R.x - 2, R.y - 1, R.w + 4, R.h + 2, Math.min(9, R.h / 2)); }
  if (live) hits.push({ rect: R, r: R.w / 2, tip: candidateTip(ci, cs, S, active) });
  if (FX() && t < landed) return;
  const built = FX() ? clamp((t - landed) / 0.55, 0, 1) : 1, decided = cs.verdict >= 0, age = t - cs.verdict;
  const endX = G.x1 - G.rb - 6, bx = lerp(endX, G.x0, built), segA = [G.x0 + 3], segB = [];
  G.xs.forEach((x) => { segB.push(x - G.hw); segA.push(x + G.hw); }); segB.push(endX);
  let closed = 0; while (closed < n && st[closed] && st[closed].pass === true) closed++;
  const broken = closed < n && st[closed] && st[closed].pass === false;
  const prevStop = closed > 0 ? segB[closed - 1] : segA[0], tLast = closed > 0 ? st[closed - 1].t : landed + 0.55;
  const front = built < 1 ? -1 : lerp(prevStop, segB[closed], FX() ? smooth(clamp((t - tLast) / 0.45, 0, 1)) : 1);
  for (let k = 0; k <= n; k++) {
    const a = Math.max(segA[k], bx), b = segB[k];
    if (b <= a) continue;
    const dead = broken && k > closed;
    pen(C.hair, 1); if (dead) ctx.setLineDash([1, 4]); line(a, cy, b, cy); ctx.setLineDash([]);
    if (front > a && !dead) {
      pen(col, 1.5, decided && cs.out === "false_positive" ? 0.45 : 1);
      if (FX() && !decided) { ctx.setLineDash([6, 4]); ctx.lineDashOffset = -((HOLD ? HOLD.since : t) % 600) * 26; }
      line(a, cy, Math.min(b, front), cy); ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.globalAlpha = 1;
    }
  }
  c.els.forEach((e, k) => {
    const x = G.xs[k];
    if (x < bx) return;
    const s = st[k], ka = s ? (FX() ? clamp((t - s.t) / 0.28, 0, 1) : 1) : 0, ecol = !s ? C.muted : s.pass === true ? (e.kind === "poc" ? C.ink : col) : s.pass === false ? C.sev.Critical : C.muted;
    if (G.mini) {
      pen(ecol, 1.3);
      if (!s) { ctx.beginPath(); ctx.arc(x, cy, 1.8, 0, Math.PI * 2); ctx.stroke(); }
      else if (s.pass === true) line(x, cy - 4, x, cy + 4);
      else if (s.pass === false) { line(x - 2.5, cy - 2.5, x + 2.5, cy + 2.5); line(x + 2.5, cy - 2.5, x - 2.5, cy + 2.5); }
      else { ctx.setLineDash([1.5, 2]); line(x, cy - 4, x, cy + 4); ctx.setLineDash([]); }
    } else if (e.kind === "gate") {
      const target = !s ? -0.6 : s.pass === true ? 0 : s.pass === false ? -1.05 : -0.3, ang = lerp(-0.6, target, s ? backOut(ka) : 0);
      pen(ecol, 1.4); if (s && s.pass === null) ctx.setLineDash([2, 2.5]);
      line(x - 6, cy, x - 6 + Math.cos(ang) * 12.6, cy + Math.sin(ang) * 12.6); ctx.setLineDash([]);
      for (const sx of [-6, 6]) { ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(x + sx, cy, 1.9, 0, Math.PI * 2); ctx.fill(); pen(ecol, 1.2); ctx.stroke(); }
      if (s && s.pass === false) { pen(C.sev.Critical, 1.4); line(x - 3, cy - 19, x + 3, cy - 13); line(x + 3, cy - 19, x - 3, cy - 13); }
      if (s && s.pass === null) text("?", x, cy - 14, { align: "center", size: 9.5, color: C.ink });
    } else {
      const g = Math.max(0, lerp(6, 0, s && s.pass === true ? backOut(ka) : 0));
      pen(ecol, 1.4); if (s && s.pass === null) ctx.setLineDash([2, 2.5]);
      line(x - 7.5, cy - g, x + 7.5, cy - g); line(x, cy - g, x, cy - g - 6); line(x - 3.5, cy - g - 6, x + 3.5, cy - g - 6); ctx.setLineDash([]);
      for (const sx of [-6, 6]) { ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(x + sx, cy, 1.9, 0, Math.PI * 2); ctx.fill(); pen(ecol, 1.2); ctx.stroke(); }
    }
    if (!G.mini && R.h > 40) text(e.label, x, cy + 15, { align: "center", size: 8, color: s && s.pass === true ? C.ink : C.muted });
    if (s) {
      streaks(x, cy, t - s.t, ecol, ci * 13 + k, 9, 0.4, 150, 60);
      if (e.kind === "poc" && s.pass === true && G.full) { ring(x, cy, t - s.t, 0.3, 3, 24, C.ink, 1.2); floatText("PoC ✓", x, cy - 16, t - s.t, 0.8, C.ink, 9.5); }
    }
  });
  if (G.x0 >= bx) { ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(G.x0, cy, 3.2, 0, Math.PI * 2); ctx.fill(); pen(col, 1.4); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(G.x0, cy, 1.2, 0, Math.PI * 2); ctx.fill(); }
  if (active && !decided && built >= 1 && closed < n && !st[closed] && FX() && !HOLD) { const k = (t * 1.3) % 1; pen(col, 1.2, 1 - k); ctx.beginPath(); ctx.arc(G.xs[closed], cy, 5 + 11 * k, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
  const mode = !decided ? "off" : cs.out === "verified" ? "lit" : cs.out === "false_positive" ? "dud" : cs.out === "open" ? "open" : "note";
  const vcol = verdictColor(cs), tx = Math.min(G.x1, B.x + B.w - 50), land = t - landed;
  const pop = decided && FX() ? backOut(clamp(age / 0.25, 0, 1)) : 1, sq = FX() && land >= 0 && land < 0.25 ? 1 + 0.25 * (1 - elastic(land / 0.25)) : 1;
  bulb(G.x1, cy, G.rb * (decided ? 0.6 + 0.4 * pop : 1) * sq, decided ? vcol : C.ink, mode, t);
  if (decided) {
    if (cs.out === "verified") {
      streaks(G.x1, cy, age, vcol, ci + 700, G.full ? 32 : 12, 0.8, G.full ? 380 : 190, 100);
      ring(G.x1, cy, age, 0.55, G.full ? 8 : 4, G.full ? 100 : 40, vcol, 1.6); if (G.full) ring(G.x1, cy, age - 0.09, 0.55, 8, 64, C.ink, 1);
      floatText((cs.sev || "verified").toUpperCase(), tx, cy - G.rb - (G.full ? 12 : 5), age, 1.3, vcol, G.full ? 13 : 9.5);
    } else if (mode === "note") { ring(G.x1, cy, age, 0.45, 5, G.full ? 46 : 20, vcol, 1.2); if (G.full) floatText(OUT_LABEL[cs.out], tx, cy - G.rb - 12, age, 1.2, vcol, 10); }
    else if (mode === "dud") { streaks(G.x1, cy, age, C.muted, ci + 900, G.full ? 10 : 5, 0.6, 160, 200); if (G.full) floatText(OUT_LABEL[cs.out], tx, cy - G.rb - 12, age, 1.2, C.muted, 10); }
    else { echo({ x: G.x1 - G.rb - 4, y: cy - G.rb - 4, w: G.rb * 2 + 8, h: G.rb * 2 + 8 }, age, 0.45, C.ink, 0.8); if (G.full) floatText(OUT_LABEL[cs.out], tx, cy - G.rb - 12, age, 1.2, C.ink, 10); }
  }
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
function drawBench(S, t, act, Rg, p1, p2) {
  const now = Rg.bench, B = regions(1, p2).bench, dx = now.x - B.x, dy = now.y - B.y, win = benchLayout(S, act, B, p2);
  if (now.w > 4 && now.h > 4) {
    ctx.save(); ctx.beginPath(); ctx.rect(now.x, now.y, now.w, now.h); ctx.clip(); ctx.translate(dx, dy);
    const hidden = win.raised.length - win.rows.length;
    text("VERIFICATION BENCH", B.x + 14, B.y + 18, { size: 9.5 });
    pen(C.hair, 1); line(B.x + 146, B.y + 18, B.x + B.w - 14 - (hidden > 0 ? 66 : 0), B.y + 18);
    if (hidden > 0) text("+" + hidden + " more", B.x + B.w - 14, B.y + 18, { size: 9.5, align: "right" });
    if (!win.raised.length) text("No candidates were raised", B.x + B.w / 2, B.y + B.h / 2, { align: "center", size: 11 });
    drawFocusPanel(S, t, act, B, win);
    for (const ci of win.rows) drawCircuit(ci, S.cands[ci], S, t, act === ci, win, B, p1 >= 1);
    ctx.restore();
  }
  for (const ci of win.raised) {
    const cs = S.cands[ci], c = M.cands[ci], start = flightStart(ci, cs, win);
    if (!FX() && t >= start) continue;
    if (t >= start + FLY) continue;
    const mates = win.raised.filter((x) => M.cands[x].unit === c.unit), slot = Math.min(mates.indexOf(ci), 5), rad = 6 * L.q;
    let from;
    if (c.unit >= 0) { const r = L.rect(c.unit); from = { x: r.x + r.w - 2 - slot * (rad * 2 + 7), y: r.y - rad * 0.4 }; }
    else from = { x: L.x1 - 12 - slot * (rad * 2 + 7), y: L.y0 + 14 };
    if (t < start) {
      const pop = FX() ? backOut(clamp((t - cs.raised) / 0.3, 0, 1)) : 1;
      bulb(from.x, from.y, rad * pop, C.ink, "off", t, -Math.PI / 2);
      ring(from.x, from.y, t - cs.raised, 0.35, 3, 22, routeColor(c.owner), 1.2);
      floatText(fit(c.id, 90, { size: 10 }) + " !", from.x, from.y - rad - 6, t - cs.raised, 0.9, routeColor(c.owner), 10);
      hits.push({ rect: { x: from.x - rad - 4, y: from.y - rad - 4, w: rad * 2 + 8, h: rad * 2 + 8 }, r: rad, tip: candidateTip(ci, cs, S, false) });
      continue;
    }
    const G = circuitGeom(ci, win, B), to = G ? { x: G.x1 + dx, y: G.cy + dy, r: G.rb } : { x: now.x + now.w - 20, y: now.y + now.h - 20, r: rad };
    const k = smooth(clamp((t - start) / FLY, 0, 1)), at = (q) => ({ x: lerp(from.x, to.x, q), y: lerp(from.y, to.y, q) - Math.sin(q * Math.PI) * 46 }), p = at(k);
    let prev = p;
    for (let i = 1; i <= 10; i++) { const q = at(Math.max(0, k - i * 0.02)); pen(routeColor(c.owner), 1.3, 0.7 * (1 - i / 11)); line(prev.x, prev.y, q.x, q.y); prev = q; }
    ctx.globalAlpha = 1;
    bulb(p.x, p.y, lerp(rad, to.r, k), C.ink, "off", t, -Math.PI / 2 * (1 - k));
  }
}
function drawBanner(t, wall) {
  for (const e of recent(M, t, 1.5)) {
    if (e.type !== "phase" || e.from === e.phase) continue;
    const age = t - e.t, back = e.from > e.phase;
    const kin = clamp(age / 0.3, 0, 1), kout = clamp((age - 1.1) / 0.3, 0, 1), a = 1 - kout, size = clamp(W * 0.055, 22, 54), y = clamp(wall.h * 0.45, size, H - size), col = back ? C.sev.High : C.ink;
    const x = FX() ? lerp(-W * 0.35, W / 2, 1 - Math.pow(1 - kin, 3)) + kout * kout * W * 0.9 : W / 2;
    ctx.fillStyle = C.bg; ctx.globalAlpha = 0.9 * a; ctx.fillRect(0, y - size * 0.72, W, size * 1.44); ctx.globalAlpha = 1;
    const u = FX() ? 1 - Math.pow(1 - kin, 3) : 1;
    pen(col, 1, a); line(0, y - size * 0.72, W * u, y - size * 0.72); line(W, y + size * 0.72, W - W * u, y + size * 0.72);
    ctx.globalAlpha = 1;
    text((back ? "↩ BACK TO " : "") + PHASE_LABEL[e.phase].toUpperCase(), x, y, { align: "center", font: DISP, w: 600, size, color: col, alpha: a, outline: 1.2 });
  }
}

export function draw(S, t) {
  hits = [];
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  if (!M || !S) { text("No session recorded for this engagement", W / 2, H / 2, { align: "center", size: 11 }); return { p2: 0, find: { x: 0, y: H, w: W, h: 0 } }; }
  baseLayout();
  const p1 = progress(t, M.tBench), p2 = progress(t, M.tResults), Rg = regions(p1, p2), sh = shakeAt(t), act = activeCandidate(M, S);
  wallGeometry(Rg.wall);
  const stale = M.hooked && M.session.phase !== "closed" && t - M.lastActivity > STALE;
  HOLD = S.hold ? { mode: S.hold, since: S.holdAt } : stale ? { mode: "pause", since: M.lastActivity + STALE } : null;
  ctx.save(); ctx.translate(sh.x, sh.y);
  LW = L.q;
  drawSheet(S, t, sh.pulse);
  M.units.forEach((U) => drawBrick(U, S.units[U.i], t));
  drawMarks(act);
  drawPaddle(t);
  drawBalls(t);
  drawBrickFx(t);
  LW = 1;
  drawBench(S, t, act, Rg, p1, p2);
  if (HOLD) { ctx.fillStyle = C.bg; ctx.globalAlpha = 0.5 * (FX() ? clamp((t - HOLD.since) / 0.4, 0, 1) : 1); ctx.fillRect(-20, -20, W + 40, Rg.find.y + 20); ctx.globalAlpha = 1; }
  drawTopHud(S, t);
  ctx.restore();
  drawBanner(t, Rg.wall);
  return { p2, find: Rg.find };
}

