#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import pathlib
import re
import stat
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import timeline

try:
    import fcntl
except ImportError:
    fcntl = None

ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
PATH_KEYS = ("file_path", "path", "notebook_path")
WAITING = {"permission_prompt", "idle_prompt", "agent_needs_input", "elicitation_dialog"}
SESSION = {"Stop": "stop", "UserPromptSubmit": "prompt", "SessionStart": "start", "SessionEnd": "end"}
MAX_PATH = 400
NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)


def read_json(path: pathlib.Path):
    try:
        if path.is_symlink() or not path.is_file():
            return None
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def find_engagement(roots: list[str]) -> tuple[pathlib.Path, pathlib.Path] | None:
    for root in roots:
        if not root:
            continue
        project = pathlib.Path(root)
        workspace = project / ".zkcrypto-audit"
        try:
            active = (workspace / "active").read_text(encoding="utf-8").strip()
        except (OSError, ValueError):
            continue
        engagement = workspace / active
        if ID_RE.match(active) and engagement.is_dir() and not engagement.is_symlink() and not workspace.is_symlink():
            return project.resolve(), engagement
    return None


def relative_paths(tool_input, project: pathlib.Path) -> list[str]:
    paths = []
    if not isinstance(tool_input, dict):
        return paths
    for key in PATH_KEYS:
        value = tool_input.get(key)
        if not isinstance(value, str) or not value or len(value) > MAX_PATH:
            continue
        target = pathlib.Path(value)
        if not target.is_absolute():
            target = project / target
        try:
            relative = target.resolve().relative_to(project).as_posix()
        except (ValueError, OSError):
            continue
        if relative != "." and not relative.startswith(".zkcrypto-audit") and relative not in paths:
            paths.append(relative)
    return paths


def tool_record(payload: dict, project: pathlib.Path, now: float) -> dict | None:
    name = payload.get("tool_name")
    if not isinstance(name, str) or not name:
        return None
    record = {"t": timeline.iso(now), "kind": "tool", "tool": name[:64]}
    paths = relative_paths(payload.get("tool_input"), project)
    if paths:
        record["paths"] = paths
    tool_input = payload.get("tool_input")
    if name == "Skill" and isinstance(tool_input, dict) and isinstance(tool_input.get("skill"), str):
        record["skill"] = tool_input["skill"][:120]
    if isinstance(payload.get("agent_id"), str):
        record["agent"] = payload["agent_id"][:80]
    return record


def write_snapshot(path: pathlib.Path, payload: dict):
    temporary = path.with_suffix(".tmp")
    try:
        temporary.unlink()
    except OSError:
        pass
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | NOFOLLOW, 0o644)
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        json.dump(payload, handle)
    os.replace(temporary, path)


def state_records(engagement: pathlib.Path, now: float) -> tuple[list[dict], bool]:
    session_path = engagement / "session.json"
    snapshot_path = engagement / "events.state.json"
    snapshot = read_json(snapshot_path)
    known = snapshot.get("session") if isinstance(snapshot, dict) and isinstance(snapshot.get("session"), dict) else None
    closed = known is not None and known.get("phase") == "closed"
    try:
        mtime = session_path.lstat().st_mtime_ns
    except OSError:
        return [], closed
    if known is not None and snapshot.get("mtime_ns") == mtime:
        return [], closed
    session = read_json(session_path)
    if not isinstance(session, dict):
        return [], closed
    records = timeline.stamp(timeline.diff(known, session), now if known is not None else None)
    write_snapshot(snapshot_path, {"mtime_ns": mtime, "session": session})
    return records, session.get("phase") == "closed" and not records


def open_log(path: pathlib.Path):
    descriptor = os.open(path, os.O_WRONLY | os.O_APPEND | os.O_CREAT | NOFOLLOW, 0o644)
    if not stat.S_ISREG(os.fstat(descriptor).st_mode):
        os.close(descriptor)
        raise OSError("events.jsonl is not a regular file")
    return os.fdopen(descriptor, "a", encoding="utf-8")


def run() -> None:
    payload = json.load(sys.stdin)
    if not isinstance(payload, dict):
        return
    cwd = payload.get("cwd")
    found = find_engagement([os.environ.get("CLAUDE_PROJECT_DIR", ""), cwd if isinstance(cwd, str) else ""])
    if found is None:
        return
    project, engagement = found
    now = time.time()
    event = payload.get("hook_event_name")
    records = []
    if event in {"PostToolUse", "PostToolUseFailure"}:
        record = tool_record(payload, project, now)
        if record:
            if event == "PostToolUseFailure":
                record["failed"] = True
            records.append(record)
    elif event == "Notification" and payload.get("notification_type") in WAITING:
        records.append({"t": timeline.iso(now), "kind": "wait", "reason": payload["notification_type"]})
    elif event in SESSION:
        records.append({"t": timeline.iso(now), "kind": "session", "event": SESSION[event]})
    with open_log(engagement / "events.jsonl") as log:
        if fcntl is not None:
            fcntl.flock(log, fcntl.LOCK_EX)
        changes, closed = state_records(engagement, now)
        if closed:
            return
        records = changes + records
        if records:
            log.write("".join(json.dumps(r, separators=(",", ":")) + "\n" for r in records))


def main() -> int:
    try:
        run()
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
