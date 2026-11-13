from __future__ import annotations

import datetime

PATHS_PER_RECORD = 200
LATEST_TIMESTAMP = 32503680000


def parse_time(value) -> float | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        moment = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
        if moment.tzinfo is None:
            moment = moment.replace(tzinfo=datetime.timezone.utc)
        timestamp = moment.timestamp()
    except (ValueError, OverflowError, OSError):
        return None
    return timestamp if 0 < timestamp < LATEST_TIMESTAMP else None


def iso(timestamp: float) -> str:
    moment = datetime.datetime.fromtimestamp(timestamp, datetime.timezone.utc)
    return moment.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _items(value) -> list:
    return value if isinstance(value, list) else []


def _text(value) -> str | None:
    return value if isinstance(value, str) and value else None


def _strings(value) -> list[str]:
    return [item for item in _items(value) if isinstance(item, str) and item]


def _by(items, key: str) -> dict[str, dict]:
    found: dict[str, dict] = {}
    for item in _items(items):
        if isinstance(item, dict) and isinstance(item.get(key), str) and item[key] not in found:
            found[item[key]] = item
    return found


def _history(session: dict) -> list[dict]:
    return [h for h in _items(session.get("phase_history")) if isinstance(h, dict) and isinstance(h.get("phase"), str)]


def _decided(candidate: dict) -> bool:
    return (_text(candidate.get("status")) or "unverified") != "unverified" or bool(candidate.get("decided_at"))


def _paths(kind: str, skill: str, paths: list[str], at=None) -> list[dict]:
    return [{"type": kind, "skill": skill, "paths": paths[i:i + PATHS_PER_RECORD], "at": at}
            for i in range(0, len(paths), PATHS_PER_RECORD)]


def _phase_events(prev: dict, cur: dict) -> list[dict]:
    phase = _text(cur.get("phase"))
    if phase is None:
        return []
    events = [{"type": "phase", "phase": h["phase"], "at": h.get("entered_at")} for h in _history(cur)[len(_history(prev)):]]
    last = events[-1]["phase"] if events else prev.get("phase")
    if phase != last:
        events.append({"type": "phase", "phase": phase})
    return events


def _route_events(prev: dict, cur: dict) -> list[dict]:
    events = []
    before = _by(prev.get("routes"), "skill")
    for skill, route in _by(cur.get("routes"), "skill").items():
        old = before.get(skill)
        status = _text(route.get("status"))
        if old is None:
            events.append({"type": "route", "skill": skill, "status": "added"})
            old = {}
        old_scope, old_reviewed = set(_strings(old.get("scope"))), set(_strings(old.get("reviewed")))
        reviewed = _strings(route.get("reviewed"))
        events += _paths("scope", skill, [p for p in _strings(route.get("scope")) if p not in old_scope])
        started = _text(route.get("started_at"))
        if started and started != old.get("started_at"):
            events.append({"type": "route", "skill": skill, "status": "started", "at": started})
        done = route.get("completed_at") if status == "completed" else None
        current = set(reviewed)
        events += _paths("unreviewed", skill, [p for p in _strings(old.get("reviewed")) if p not in current])
        events += _paths("reviewed", skill, [p for p in reviewed if p not in old_reviewed], done)
        if status in {"pending", "completed", "skipped"} and status != (_text(old.get("status")) or "pending"):
            events.append({"type": "route", "skill": skill, "status": status, "at": done})
    return events


def _gates(candidate: dict) -> dict[str, tuple]:
    found: dict[str, tuple] = {}
    for gate in _items(candidate.get("gates")):
        if isinstance(gate, dict) and isinstance(gate.get("gate"), str):
            found[gate["gate"]] = (_text(gate.get("result")), gate.get("at"))
    return found


def _candidate_events(prev: dict, cur: dict) -> list[dict]:
    events = []
    before = _by(prev.get("candidates"), "id")
    for identifier, candidate in _by(cur.get("candidates"), "id").items():
        old = before.get(identifier)
        if old is None:
            events.append({"type": "candidate", "id": identifier, "at": candidate.get("raised_at")})
            old = {"status": "unverified"}
        known = _gates(old)
        for name, (result, at) in _gates(candidate).items():
            if name not in known or known[name][0] != result:
                events.append({"type": "gate", "id": identifier, "gate": name, "result": result, "at": at})
        poc = _text(candidate.get("poc_status"))
        if poc and poc != old.get("poc_status"):
            events.append({"type": "poc", "id": identifier, "status": poc})
        verdict = (_text(candidate.get("status")), _text(candidate.get("severity")), _decided(candidate))
        if _decided(candidate) and verdict != (_text(old.get("status")), _text(old.get("severity")), _decided(old)):
            events.append({"type": "verdict", "id": identifier, "status": verdict[0], "severity": verdict[1],
                           "at": candidate.get("decided_at")})
        if candidate.get("report_ref") and not old.get("report_ref"):
            events.append({"type": "report", "id": identifier})
    return events


def diff(prev, cur) -> list[dict]:
    if not isinstance(cur, dict):
        return []
    prev = prev if isinstance(prev, dict) else {}
    return _phase_events(prev, cur) + _route_events(prev, cur) + _candidate_events(prev, cur)


def stamp(events: list[dict], fallback: float | None) -> list[dict]:
    stamped = []
    for event in events:
        record = {k: v for k, v in event.items() if k != "at" and v is not None}
        moment = parse_time(event.get("at")) if fallback is None else fallback
        record["t"] = iso(moment) if moment is not None else None
        record["kind"] = "state"
        stamped.append(record)
    return stamped
