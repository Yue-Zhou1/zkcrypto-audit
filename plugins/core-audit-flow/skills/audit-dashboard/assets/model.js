const PHASES = ["intake_pending", "domain_in_progress", "verification_in_progress", "reporting_in_progress", "remediation_in_progress", "closed"];
export const PHASE_LABEL = ["intake", "domain", "verification", "reporting", "remediation", "closed"];
export const OUT_LABEL = { verified: "VERIFIED", false_positive: "FALSE POSITIVE", observation: "OBSERVATION", residual_risk: "RESIDUAL RISK", open: "UNVERIFIED" };
export const LEAD = 2.5;
export const SEVERITIES = ["Critical", "High", "Medium", "Low", "Informational"];

const FLOW_SKILLS = new Set(["crypto-audit-router", "crypto-audit-context", "crypto-fp-check", "crypto-report-writer", "fix-verification", "audit-dashboard", "audit-common"]);
const GATES = ["claim", "trigger", "impact", "severity"];
const STAGED = new Set(["cover", "end", "gate", "verdict", "report", "bench", "results", "phase"]);
const GENERIC_STEMS = new Set(["mod", "lib", "main", "index", "__init__"]);

export function mulberry(seed) {
  return () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const text = (value) => (typeof value === "string" ? value : "");
const clip = (value, max) => (value.length > max ? value.slice(0, max - 1) + "…" : value);
function unique(items, key) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter((item) => item && typeof item === "object" && typeof item[key] === "string" && item[key] && !seen.has(item[key]) && seen.add(item[key]));
}
const strings = (value) => (Array.isArray(value) ? value.filter((x) => typeof x === "string" && x) : []);
const norm = (path) => String(path).replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
export const bare = (skill) => String(skill).split(":").pop();

function routeKeys(skills) {
  const used = new Set();
  return skills.map((skill) => {
    const words = bare(skill).split(/[-_]/).filter((w) => w && !["auditor", "checker", "safety"].includes(w));
    const base = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || skill).slice(0, 2)).toUpperCase();
    let key = base, n = 2;
    while (used.has(key)) key = base[0] + String(n++);
    used.add(key);
    return key;
  });
}

function seconds(value) {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms / 1000;
}

export function buildModel(session, log, state, hooked) {
  const routesRaw = unique(session.routes, "skill");
  const keys = routeKeys(routesRaw.map((r) => r.skill));
  let slots = 0;
  const routes = routesRaw.map((r, i) => {
    const wall = !FLOW_SKILLS.has(bare(r.skill)) && r.status !== "skipped";
    const slot = wall ? slots++ : -1;
    return { i, skill: r.skill, key: keys[i], wall, color: slot < 0 ? -1 : slot % 8, pattern: slot < 0 ? 0 : slot % 6, scope: strings(r.scope).map(norm), reviewed: strings(r.reviewed).map(norm), pseudo: -1, raw: r };
  });
  const routeIdx = new Map(routes.map((r) => [r.skill, r.i]));
  const routeByBare = new Map(routes.map((r) => [bare(r.skill), r.i]));

  const units = [], unitIdx = new Map();
  const unit = (id, label, dir, pseudo) => {
    if (!unitIdx.has(id)) {
      const rnd = mulberry(hash(id));
      units.push({ i: units.length, id, label, dir, pseudo, req: [], tier: Math.floor(rnd() * 3), wj: rnd(), rot: (rnd() - 0.5) * 0.11 });
      unitIdx.set(id, units.length - 1);
    }
    return units[unitIdx.get(id)];
  };
  for (const r of routes) {
    if (!r.wall) continue;
    if (r.scope.length) {
      for (const path of r.scope) {
        const parts = path.split("/"), file = parts.pop(), stem = file.replace(/\.[A-Za-z0-9]+$/, "") || file;
        const u = unit(path, GENERIC_STEMS.has(stem) && parts.length ? parts[parts.length - 1] + "/" + stem : stem, parts.join("/"), false);
        if (!u.req.includes(r.i)) u.req.push(r.i);
      }
    } else {
      const u = unit("@" + r.skill, bare(r.skill).replace(/-(auditor|checker)$/, ""), "", true);
      u.req.push(r.i);
      r.pseudo = u.i;
    }
  }
  const unitMemo = new Map();
  const findUnit = (raw) => {
    const path = norm(raw);
    if (unitMemo.has(path)) return unitMemo.get(path);
    let found = unitIdx.has(path) ? unitIdx.get(path) : -1, depth = 0;
    if (found < 0) for (const u of units) {
      if (u.pseudo || !(u.id.endsWith("/" + path) || path.endsWith("/" + u.id))) continue;
      const shared = Math.min(u.id.length, path.length);
      if (shared > depth) { depth = shared; found = u.i; }
    }
    unitMemo.set(path, found);
    return found;
  };

  const candsRaw = unique(session.candidates, "id");
  const cands = candsRaw.map((c, i) => {
    const hasGates = Array.isArray(c.gates) && c.gates.length > 0;
    const els = hasGates ? GATES.slice(0, 3).map((g) => ({ kind: "gate", gate: g, label: g.toUpperCase() })) : [{ kind: "gate", gate: "verify", label: "VERIFY" }];
    if (c.poc_status === "executed" || c.poc_status === "pending_poc") els.push({ kind: "poc", label: "PoC" });
    if (hasGates) els.push({ kind: "gate", gate: "severity", label: "SEVERITY" });
    const location = text(c.location);
    const file = norm(location.split(/[,\s]/)[0].replace(/::.*$/, "").replace(/:[\dL][\d\-–,L]*$/, ""));
    const owner = routeIdx.has(c.owner_skill) ? routeIdx.get(c.owner_skill) : -1;
    let u = file ? findUnit(file) : -1;
    if (u < 0 && owner >= 0 && routes[owner].pseudo >= 0) u = routes[owner].pseudo;
    return { i, id: clip(c.id, 40), title: clip(text(c.title) || text(c.summary) || c.id, 140), location: clip(location, 160), owner, unit: u, els, hasGates, raw: c };
  });
  const candIdx = new Map(cands.map((c) => [c.raw.id, c.i]));

  const stateRecords = (hooked ? log.filter((r) => r && r.kind === "state") : []).concat(state || []);
  const toolRecords = log.filter((r) => r && (r.kind === "tool" || r.kind === "wait" || r.kind === "session"));
  let origin = seconds(session.created_at);
  for (const r of stateRecords.concat(toolRecords)) { const t = seconds(r.t); if (t != null && (origin == null || t < origin)) origin = t; }
  const timed = origin != null;
  const rel = (record) => { const t = seconds(record.t); return t == null || !timed ? -1 : t - origin + LEAD; };

  const ev = [];
  let order = 0;
  const push = (t, e) => { ev.push({ t, o: order++, ...e }); };
  const celled = new Set(), started = new Set();
  const cell = (t, a, u) => { const key = a + ":" + u; if (celled.has(key)) return; celled.add(key); push(t, { type: "cell", a, u }); };

  for (const r of stateRecords) {
    const t = rel(r);
    if (r.type === "phase") {
      const phase = PHASES.indexOf(r.phase);
      if (phase >= 0) push(t, { type: "phase", phase });
    } else if (r.type === "route" || r.type === "scope" || r.type === "reviewed" || r.type === "unreviewed") {
      const a = routeIdx.get(r.skill);
      if (a == null) continue;
      const route = routes[a];
      if (r.type === "route") {
        if (r.status === "added") { if (route.pseudo >= 0) cell(t, a, route.pseudo); }
        else if (r.status === "started") { if (route.wall) { started.add(a); push(t, { type: "start", a }); } }
        else if (r.status === "skipped") push(t, { type: "skip", a });
        else if (r.status === "completed" && route.wall) {
          const all = route.pseudo >= 0 ? [route.pseudo] : (route.reviewed.length ? [] : route.scope.map(findUnit));
          for (const u of all) if (u >= 0 && units[u].req.includes(a)) push(t, { type: "cover", a, u });
          push(t, { type: "end", a });
        }
      } else if (route.wall) {
        for (const path of strings(r.paths)) {
          const u = findUnit(path);
          if (u < 0 || !units[u].req.includes(a)) continue;
          if (r.type === "scope") cell(t, a, u);
          else push(t, { type: r.type === "reviewed" ? "cover" : "reopen", a, u });
        }
      }
    } else if (r.type === "candidate" || r.type === "gate" || r.type === "poc" || r.type === "verdict" || r.type === "report") {
      const c = candIdx.get(r.id);
      if (c == null) continue;
      const cand = cands[c];
      if (r.type === "candidate") push(t, { type: "raise", c });
      else if (r.type === "gate") {
        const k = cand.els.findIndex((e) => e.kind === "gate" && e.gate === r.gate);
        if (k >= 0) push(t, { type: "gate", c, k, pass: r.result === "pass" ? true : r.result === "fail" ? false : null });
      } else if (r.type === "poc") {
        const k = cand.els.findIndex((e) => e.kind === "poc");
        if (k >= 0 && r.status !== "not_required") push(t, { type: "gate", c, k, pass: r.status === "executed" ? true : null });
      } else if (r.type === "verdict") {
        const out = r.status !== "unverified" && OUT_LABEL[r.status] ? r.status : "open";
        if (!cand.hasGates) push(t, { type: "gate", c, k: 0, pass: out === "false_positive" ? false : out === "open" ? null : true });
        push(t, { type: "verdict", c, out, sev: SEVERITIES.includes(r.severity) ? r.severity : null });
      } else push(t, { type: "report", c });
    }
  }
  for (const r of routes) {
    if (!r.wall) continue;
    if (r.pseudo >= 0) cell(-1, r.i, r.pseudo);
    for (const path of r.scope) { const u = findUnit(path); if (u >= 0) cell(-1, r.i, u); }
  }

  const explicitStart = new Set(started);
  const merged = ev.map((e) => ({ t: e.t, o: e.o, e })).concat(toolRecords.map((r, i) => ({ t: rel(r), o: order + i, r })));
  merged.sort((x, y) => x.t - y.t || x.o - y.o);
  order += toolRecords.length;
  const running = new Set(), covered = new Set(), affinity = new Map(), lastTap = new Map();
  let held = false;
  for (const item of merged) {
    if (item.e) {
      const e = item.e;
      if (e.type === "start") running.add(e.a);
      else if (e.type === "end" || e.type === "skip") running.delete(e.a);
      else if (e.type === "cover") covered.add(e.a + ":" + e.u);
      else if (e.type === "reopen") covered.delete(e.a + ":" + e.u);
      continue;
    }
    const r = item.r, t = item.t;
    if (t < 0) continue;
    const mode = r.kind === "wait" || (r.kind === "session" && r.event === "stop") ? "wait" : r.kind === "session" && r.event === "end" ? "pause" : null;
    if (mode) { push(t, { type: "hold", mode }); held = true; continue; }
    if (held) { push(t, { type: "resume" }); held = false; }
    if (r.kind !== "tool") continue;
    if (typeof r.skill === "string" && routeByBare.has(bare(r.skill))) {
      const a = routeByBare.get(bare(r.skill));
      if (routes[a].wall && !explicitStart.has(a) && !running.has(a)) { started.add(a); running.add(a); push(t, { type: "start", a }); }
    }
    const targets = [];
    for (const path of strings(r.paths)) {
      const u = findUnit(path);
      if (u < 0) continue;
      const open = units[u].req.filter((a) => running.has(a) && !covered.has(a + ":" + u));
      const pick = open.length === 1 ? open[0] : open.find((a) => affinity.get(r.agent) === a) ?? open[0];
      if (pick != null) targets.push([pick, u]);
    }
    if (!targets.length && running.size === 1) {
      const a = [...running][0];
      if (routes[a].pseudo >= 0 && !covered.has(a + ":" + routes[a].pseudo)) targets.push([a, routes[a].pseudo]);
    }
    if (r.agent && targets.length === 1) affinity.set(r.agent, targets[0][0]);
    for (const [a, u] of targets) {
      const key = a + ":" + u, last = lastTap.get(key);
      if (last && t - last.t < 1) { last.w++; continue; }
      const tap = { t, o: order++, type: "tap", a, u, w: 1 };
      ev.push(tap); lastTap.set(key, tap);
    }
  }

  ev.sort((x, y) => x.t - y.t || x.o - y.o);
  const benchAt = ev.find((e) => (e.type === "phase" && e.phase >= 2) || e.type === "gate" || e.type === "verdict");
  if (benchAt) ev.push({ t: benchAt.t, o: benchAt.o - 0.5, type: "bench" });
  const resultsAt = ev.find((e) => e.type === "phase" && e.phase >= 3);
  if (resultsAt) ev.push({ t: resultsAt.t, o: Number.MAX_SAFE_INTEGER, type: "results" });
  ev.sort((x, y) => x.t - y.t || x.o - y.o);
  const lastCover = new Map(), lastCand = new Map();
  let lastCell = -Infinity, lastWall = -Infinity, benchT = -Infinity, lastDecision = -Infinity, latest = -Infinity, lastHold = -Infinity;
  for (const e of ev) {
    if (e.t < 0) continue;
    if (e.type === "hold") { e.t = Math.max(e.t, latest + 0.8); lastHold = e.t; }
    else if (e.type === "resume") e.t = Math.max(e.t, lastHold + 0.05);
    else if (e.type === "cell") { e.t = Math.max(e.t, lastCell + 0.07); lastCell = e.t; }
    else if (e.type === "cover") { e.t = Math.max(e.t, (lastCover.get(e.a) ?? -Infinity) + 0.45); lastCover.set(e.a, e.t); lastWall = Math.max(lastWall, e.t); }
    else if (e.type === "end") { e.t = Math.max(e.t, (lastCover.get(e.a) ?? -Infinity) + 0.6); lastWall = Math.max(lastWall, e.t); }
    else if (e.type === "raise") lastCand.set(e.c, e.t + 0.9);
    else if (e.type === "bench") { e.t = Math.max(e.t, lastWall + 0.8); benchT = e.t; }
    else if (e.type === "results") e.t = Math.max(e.t, lastDecision + 1.8);
    else if (e.type === "gate") { e.t = Math.max(e.t, (lastCand.get(e.c) ?? -Infinity) + 0.9, benchT + 3.6); lastCand.set(e.c, e.t); lastDecision = Math.max(lastDecision, e.t); }
    else if (e.type === "verdict") { e.t = Math.max(e.t, (lastCand.get(e.c) ?? -Infinity) + 1, benchT + 3.6); lastCand.set(e.c, e.t); lastDecision = Math.max(lastDecision, e.t); }
    else if (e.type === "report") { e.t = Math.max(e.t, (lastCand.get(e.c) ?? -Infinity) + 0.6); lastCand.set(e.c, e.t); }
    else if (e.type === "phase" && e.phase >= 2) e.t = Math.max(e.t, lastWall + 0.8);
    if (STAGED.has(e.type)) latest = Math.max(latest, e.t);
  }
  const firstContact = new Map();
  for (const e of ev) if (e.t >= 0 && (e.type === "tap" || e.type === "cover" || e.type === "end") && !firstContact.has(e.a)) firstContact.set(e.a, e.t);
  for (const [a, t] of firstContact) if (!started.has(a)) ev.push({ t: Math.max(0, t - 1.5), o: -1, type: "start", a });
  for (const e of ev) if (e.t < 0) { e.t = 0; e.pre = true; }
  ev.sort((x, y) => x.t - y.t || x.o - y.o);

  const M = { session, routes, units, cands, EV: ev, timed, origin: timed ? origin : 0, end: 0, PHEV: [], PLAN: [], KEYS: [], cache: {},
    hooked: toolRecords.some((r) => r.kind === "tool"), lastActivity: Math.max(0, ...stateRecords.concat(toolRecords).map(rel)) };
  const S = initialState(M);
  const taps = new Map();
  ev.forEach((e, i) => {
    e.i = i;
    if (e.type === "tap") { const key = e.a + ":" + e.u; taps.set(key, (taps.get(key) || 0) + e.w); e.n = taps.get(key); }
    if (e.type === "reopen") taps.delete(e.a + ":" + e.u);
    if (e.type === "phase") { e.from = S.phase; M.PHEV.push(e); }
    apply(M, S, e, true);
  });
  M.tBench = (ev.find((e) => e.type === "bench") || { t: Infinity }).t;
  M.tResults = (ev.find((e) => e.type === "results") || { t: Infinity }).t;
  M.end = Math.max(LEAD, ...ev.map((e) => e.t)) + 3;
  buildPlan(M);
  return M;
}

function initialState(M) {
  return {
    t: -Infinity, idx: 0, phase: 0, regress: false, hold: null, holdAt: -1,
    units: M.units.map(() => ({ shown: -1, cells: new Set(), cov: new Map(), taps: new Map(), broken: -1, hit: -1, hitK: 1, reopen: -1 })),
    cands: M.cands.map((c) => ({ raised: -1, els: c.els.map(() => null), verdict: -1, out: null, sev: null, reported: -1, last: -1 })),
  };
}

function settle(unit, e, annotate) {
  const all = unit.cells.size > 0 && [...unit.cells].every((a) => unit.cov.has(a));
  if (all && unit.broken < 0) { unit.broken = e.t; if (annotate && e.type === "cover") e.broke = true; }
  else if (!all && unit.broken >= 0) { unit.broken = -1; unit.reopen = e.t; }
}

function apply(M, S, e, annotate) {
  if (e.type === "hold") { S.hold = e.mode; S.holdAt = e.t; }
  else if (e.type === "resume") S.hold = null;
  else if (e.type === "phase") { S.regress = e.phase < S.phase; S.phase = e.phase; }
  else if (e.type === "cell") { const u = S.units[e.u]; if (u.shown < 0) u.shown = e.t; u.cells.add(e.a); settle(u, e, annotate); }
  else if (e.type === "tap") { const u = S.units[e.u]; u.taps.set(e.a, { n: e.n, t: e.t }); u.hit = e.t; u.hitK = 0.45; }
  else if (e.type === "cover") { const u = S.units[e.u]; if (u.shown < 0) u.shown = e.t; u.cells.add(e.a); u.cov.set(e.a, e.t); u.hit = e.t; u.hitK = 1; settle(u, e, annotate); }
  else if (e.type === "reopen") { const u = S.units[e.u]; u.cov.delete(e.a); u.taps.delete(e.a); settle(u, e, annotate); u.reopen = e.t; }
  else if (e.type === "raise") { const c = S.cands[e.c]; c.raised = e.t; c.last = e.t; }
  else if (e.type === "gate") { const c = S.cands[e.c]; if (c.raised < 0) c.raised = e.t - 2; c.els[e.k] = { t: e.t, pass: e.pass }; c.last = e.t; }
  else if (e.type === "verdict") { const c = S.cands[e.c]; if (c.raised < 0) c.raised = e.t - 2; c.verdict = e.t; c.out = e.out; c.sev = e.sev; c.last = e.t; }
  else if (e.type === "report") S.cands[e.c].reported = e.t;
}

export function stateAt(M, t, slot = "main") {
  let S = M.cache[slot];
  if (!S || t < S.t) S = M.cache[slot] = initialState(M);
  const ev = M.EV;
  while (S.idx < ev.length && ev[S.idx].t <= t) { apply(M, S, ev[S.idx], false); S.idx++; }
  S.t = t;
  return S;
}

function buildPlan(M) {
  M.PLAN = M.routes.map(() => []);
  M.KEYS = [];
  for (const route of M.routes) {
    if (!route.wall) continue;
    const a = route.i, contacts = [], spans = [];
    let open = null;
    for (const e of M.EV) {
      if (e.pre || e.a !== a) continue;
      if (e.type === "tap" || e.type === "cover") contacts.push(e);
      else if (e.type === "start") { if (open == null) open = e.t; }
      else if ((e.type === "end" || e.type === "skip") && open != null) { spans.push([open, e.t + 0.7]); open = null; }
    }
    if (open != null) spans.push([open, Infinity]);
    for (const c of contacts) if (!spans.some(([s, f]) => c.t >= s && c.t <= f)) spans.push([Math.max(0, c.t - 1.2), c.t + 0.8]);
    spans.sort((x, y) => x[0] - y[0]);
    const runs = [];
    for (const span of spans) { const last = runs[runs.length - 1]; if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]); else runs.push(span.slice()); }
    const segs = M.PLAN[a];
    let ci = 0;
    for (const [start, finish] of runs) {
      let pt = start, pu = null;
      while (ci < contacts.length && contacts[ci].t < start) ci++;
      for (; ci < contacts.length && contacts[ci].t <= finish; ci++) {
        const h = contacts[ci], gap = h.t - pt, d1 = pu == null ? 0 : Math.min(0.42 * gap, 0.7), d2 = Math.min(0.5 * gap, 0.75);
        if (pu != null) segs.push({ t0: pt, t1: pt + d1, kind: "down", u: pu });
        segs.push({ t0: pt + d1, t1: h.t - d2, kind: "ride" });
        segs.push({ t0: h.t - d2, t1: h.t, kind: "up", u: h.u, n: segs.length });
        pt = h.t; pu = h.u;
      }
      const d1 = pu == null ? 0 : Math.min(0.42 * (finish - pt), 0.7);
      if (pu != null) segs.push({ t0: pt, t1: pt + d1, kind: "down", u: pu });
      segs.push({ t0: pt + d1, t1: finish, kind: "ride" });
    }
    for (const s of segs) { if (s.kind === "down") M.KEYS.push({ t: s.t1, u: s.u }); if (s.kind === "up") M.KEYS.push({ t: s.t0, u: s.u }); }
  }
  M.KEYS.sort((x, y) => x.t - y.t);
}

export function segmentAt(M, a, t) {
  const segs = M.PLAN[a];
  let lo = 0, hi = segs.length - 1, found = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (segs[m].t0 <= t) { found = m; lo = m + 1; } else hi = m - 1; }
  if (found < 0) return null;
  const s = segs[found];
  return t <= s.t1 ? s : null;
}

export function recent(M, t, span) {
  const ev = M.EV;
  let lo = 0, hi = ev.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (ev[m].t < t - span) lo = m + 1; else hi = m; }
  const out = [];
  for (let i = lo; i < ev.length && ev[i].t <= t; i++) out.push(ev[i]);
  return out;
}

export function activeCandidate(M, S) {
  if (S.phase !== 2) return -1;
  let best = -1;
  S.cands.forEach((c, i) => { if (c.raised >= 0 && c.verdict < 0 && (best < 0 || c.last > S.cands[best].last + 1e-9)) best = i; });
  return best;
}
