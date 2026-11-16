import { PHASE_LABEL, mulberry, recent } from "./model.js";

export const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace';
export const DISP = 'ui-sans-serif, system-ui, "Segoe UI", Helvetica, Arial, sans-serif';
export const TOP_H = 0.46, NARROW = 720, STALE = 300;

export const lerp = (a, b, k) => a + (b - a) * k;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const smooth = (k) => k * k * (3 - 2 * k);
export const backOut = (k) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
export const elastic = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * (2 * Math.PI) / 3) + 1);
export const clock = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(Math.floor(s % 60)).padStart(2, "0");

export let ctx = null, C = {}, W = 0, H = 0;
export const hits = [];
let cv, stage, LW = 1, fx = true;

export function init(canvas, container) { cv = canvas; stage = container; refreshTokens(); resize(); }
export function setEffects(on) { fx = on; }
export function setLineScale(scale) { LW = scale; }
export const FX = () => fx;
export function progress(t, start) {
  if (!(start < Infinity)) return 0;
  return fx ? smooth(clamp((t - start) / 1.1, 0, 1)) : (t >= start ? 1 : 0);
}

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
}

export function tipAt(x, y) {
  let best = null;
  for (const h of hits) {
    const inside = x >= h.rect.x && x <= h.rect.x + h.rect.w && y >= h.rect.y && y <= h.rect.y + h.rect.h;
    if (inside && (!best || h.r < best.r)) best = h;
  }
  return best ? { text: best.tip, x: clamp(x + 14, 4, W - 270), y: clamp(y + 14, 4, H - 96) } : null;
}

export function text(s, x, y, o = {}) {
  ctx.font = (o.w || 400) + " " + (o.size || 10.5) + "px " + (o.font || MONO);
  ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "middle"; ctx.globalAlpha = o.alpha ?? 1;
  if (o.outline) { ctx.strokeStyle = o.color || C.ink; ctx.lineWidth = o.outline; ctx.lineJoin = "round"; ctx.strokeText(s, x, y); }
  else { ctx.fillStyle = o.color || C.muted; ctx.fillText(s, x, y); }
  ctx.globalAlpha = 1;
}
const FITS = new Map();
export function fit(s, maxW, o = {}) {
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
export function pen(color, width = 1, alpha = 1) { ctx.strokeStyle = color; ctx.lineWidth = width * LW; ctx.globalAlpha = alpha; ctx.lineCap = "round"; ctx.lineJoin = "round"; }
export function line(x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
export function hatch(x, y, w, h, gap, dir) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.beginPath();
  for (let i = -h; i < w + h; i += gap) { if (dir > 0) { ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); } else { ctx.moveTo(x + i, y); ctx.lineTo(x + i + h, y + h); } }
  ctx.stroke(); ctx.restore();
}
export function rules(x, y, w, h, gap, vertical) {
  ctx.beginPath();
  if (vertical) for (let i = gap; i < w - 0.5; i += gap) { ctx.moveTo(x + i, y); ctx.lineTo(x + i, y + h); }
  else for (let i = gap; i < h - 0.5; i += gap) { ctx.moveTo(x, y + i); ctx.lineTo(x + w, y + i); }
  ctx.stroke();
}
export function brackets(x, y, w, h, s) {
  ctx.beginPath();
  for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) { ctx.moveTo(cx + dx * s, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * s); }
  ctx.stroke();
}

export function streaks(x, y, age, color, seed, n, life, speed, grav = 220) {
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
export function ring(x, y, age, life, r0, r1, color, width = 1.2) {
  if (!FX() || age < 0 || age > life) return;
  const k = age / life;
  pen(color, width, 1 - k); ctx.beginPath(); ctx.arc(x, y, lerp(r0, r1, 1 - (1 - k) * (1 - k)), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
}
export function echo(r, age, life, color, grow = 0.55) {
  if (!FX() || age < 0 || age > life) return;
  const k = age / life, s = 1 + grow * (1 - (1 - k) * (1 - k)), w = r.w * s, h = r.h * s;
  pen(color, 1, 1 - k); ctx.strokeRect(r.x + r.w / 2 - w / 2, r.y + r.h / 2 - h / 2, w, h); ctx.globalAlpha = 1;
}
export function lineShards(edges, cx, cy, age, color, seed, life = 1.0) {
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
export function rectEdges(r) { return [[r.x, r.y, r.x + r.w, r.y], [r.x + r.w, r.y, r.x + r.w, r.y + r.h], [r.x + r.w, r.y + r.h, r.x, r.y + r.h], [r.x, r.y + r.h, r.x, r.y]]; }
export function floatText(s, x, y, age, life, color, size = 10.5, weight = 500) {
  if (age < 0 || age > life) return;
  const k = age / life, rise = FX() ? 24 * (1 - (1 - k) * (1 - k)) : 12, a = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
  text(s, x, y - rise, { align: "center", size, w: weight, color, alpha: a });
  if (FX()) { const tw = s.length * size * 0.31, u = clamp(age / 0.2, 0, 1); pen(color, 1, a); line(x - tw * u, y - rise + size * 0.75, x + tw * u, y - rise + size * 0.75); ctx.globalAlpha = 1; }
}

export function shakeAt(M, t) {
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

export function drawBanner(M, t, region) {
  for (const e of recent(M, t, 1.5)) {
    if (e.type !== "phase" || e.from === e.phase) continue;
    const age = t - e.t, back = e.from > e.phase;
    const kin = clamp(age / 0.3, 0, 1), kout = clamp((age - 1.1) / 0.3, 0, 1), a = 1 - kout, size = clamp(W * 0.055, 22, 54), y = clamp(region.h * 0.45, size, H - size), col = back ? C.sev.High : C.ink;
    const x = FX() ? lerp(-W * 0.35, W / 2, 1 - Math.pow(1 - kin, 3)) + kout * kout * W * 0.9 : W / 2;
    ctx.fillStyle = C.bg; ctx.globalAlpha = 0.9 * a; ctx.fillRect(0, y - size * 0.72, W, size * 1.44); ctx.globalAlpha = 1;
    const u = FX() ? 1 - Math.pow(1 - kin, 3) : 1;
    pen(col, 1, a); line(0, y - size * 0.72, W * u, y - size * 0.72); line(W, y + size * 0.72, W - W * u, y + size * 0.72);
    ctx.globalAlpha = 1;
    text((back ? "↩ BACK TO " : "") + PHASE_LABEL[e.phase].toUpperCase(), x, y, { align: "center", font: DISP, w: 600, size, color: col, alpha: a, outline: 1.2 });
  }
}
