#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import mimetypes
import pathlib
import re
import sys
import threading
import time
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlsplit

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import timeline

SKILL_ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = SKILL_ROOT / "assets"
ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
MAX_EVENT_BYTES = 1024 * 1024
MAX_SESSION_BYTES = 16 * 1024 * 1024
MAX_STREAMS = 16
POLL_SECONDS = 0.5
HEARTBEAT_SECONDS = 15
SETTLE_SECONDS = 5
WATCHED = ("session.json", "events.jsonl", "events.state.json")


def read_json(path: pathlib.Path):
    if path.is_symlink() or not path.is_file():
        return None, None
    try:
        if path.stat().st_size > MAX_SESSION_BYTES:
            return None, f"{path.name} is larger than {MAX_SESSION_BYTES} bytes"
        return json.loads(path.read_text(encoding="utf-8")), None
    except (OSError, ValueError) as error:
        return None, f"{path.name} could not be read: {error}"


class Workspace:
    def __init__(self, root: pathlib.Path):
        self.root = root.resolve()
        self.lock = threading.Lock()
        self.observed: dict[str, dict] = {}
        self.cached = (0.0, "")

    def engagement_dir(self, engagement_id: str) -> pathlib.Path | None:
        if not ID_RE.match(engagement_id):
            return None
        path = self.root / engagement_id
        if path.is_symlink() or not path.is_dir():
            return None
        return path

    def engagement_ids(self) -> list[str]:
        if not self.root.is_dir():
            return []
        ids = []
        for child in sorted(self.root.iterdir()):
            if child.is_dir() and not child.is_symlink() and ID_RE.match(child.name):
                ids.append(child.name)
        return ids

    def active(self) -> str | None:
        pointer = self.root / "active"
        try:
            value = pointer.read_text(encoding="utf-8").strip()
        except (OSError, ValueError):
            return None
        return value if self.engagement_dir(value) else None

    def session(self, engagement_id: str):
        base = self.engagement_dir(engagement_id)
        if base is None:
            return None, "unknown engagement"
        return read_json(base / "session.json")

    def summary(self, engagement_id: str) -> dict:
        session, error = self.session(engagement_id)
        entry = {"id": engagement_id, "has_session": session is not None, "error": error}
        if isinstance(session, dict):
            candidates = session.get("candidates") if isinstance(session.get("candidates"), list) else []
            routes = session.get("routes") if isinstance(session.get("routes"), list) else []
            entry.update({
                "phase": session.get("phase") if isinstance(session.get("phase"), str) else None,
                "candidates": len(candidates),
                "verified": sum(1 for c in candidates if isinstance(c, dict) and c.get("status") == "verified"),
                "routes": len(routes),
            })
        return entry

    def events(self, engagement_id: str, offset: int) -> dict | None:
        base = self.engagement_dir(engagement_id)
        if base is None:
            return None
        path = base / "events.jsonl"
        if not path.is_file() or path.is_symlink():
            return {"events": [], "offset": 0}
        size = path.stat().st_size
        if offset < 0 or offset > size:
            offset = 0
        with path.open("rb") as handle:
            handle.seek(offset)
            chunk = handle.read(MAX_EVENT_BYTES)
        end = chunk.rfind(b"\n")
        if end == -1:
            return {"events": [], "offset": offset + len(chunk) if len(chunk) == MAX_EVENT_BYTES else offset}
        events = []
        for line in chunk[: end + 1].splitlines():
            try:
                record = json.loads(line)
            except ValueError:
                continue
            if isinstance(record, dict):
                events.append(record)
        return {"events": events, "offset": offset + end + 1}

    def pending(self, engagement_id: str) -> tuple[list[dict], bool]:
        base = self.engagement_dir(engagement_id)
        session, _ = self.session(engagement_id)
        if base is None or not isinstance(session, dict):
            return [], False
        try:
            modified = (base / "session.json").stat().st_mtime
        except OSError:
            return [], False
        snapshot, _ = read_json(base / "events.state.json")
        if isinstance(snapshot, dict) and isinstance(snapshot.get("session"), dict):
            if time.time() - modified < SETTLE_SECONDS:
                return [], True
            return timeline.stamp(timeline.diff(snapshot["session"], session), modified), True
        with self.lock:
            entry = self.observed.setdefault(engagement_id, {"session": None, "events": []})
            fresh = timeline.diff(entry["session"], session)
            entry["events"] += timeline.stamp(fresh, modified if entry["session"] is not None else None)
            entry["session"] = session
            return list(entry["events"]), False

    def timeline(self, engagement_id: str, offset: int) -> dict | None:
        log = self.events(engagement_id, offset)
        if log is None:
            return None
        state, hooked = self.pending(engagement_id)
        return {"log": log["events"], "offset": log["offset"], "state": state, "hooked": hooked, "now": timeline.iso(time.time())}

    def signature(self) -> str:
        with self.lock:
            checked, value = self.cached
            if time.monotonic() - checked < POLL_SECONDS * 0.8:
                return value
        parts = []
        for path in [self.root / "active"] + [self.root / i / name for i in self.engagement_ids() for name in WATCHED]:
            try:
                status = path.lstat()
            except OSError:
                continue
            parts.append(f"{path.relative_to(self.root).as_posix()}:{status.st_mtime_ns}:{status.st_size}")
        value = "|".join(parts)
        with self.lock:
            self.cached = (time.monotonic(), value)
        return value


class Handler(BaseHTTPRequestHandler):
    server_version = "audit-dashboard"
    protocol_version = "HTTP/1.1"

    @property
    def workspace(self) -> Workspace:
        return self.server.workspace

    def log_message(self, format, *args):
        if self.server.verbose:
            super().log_message(format, *args)

    def host_allowed(self) -> bool:
        host = self.headers.get("Host", "")
        port = self.server.server_address[1]
        return host in {f"127.0.0.1:{port}", f"localhost:{port}"}

    def send_body(self, status: HTTPStatus, body: bytes, content_type: str):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def send_json(self, payload, status: HTTPStatus = HTTPStatus.OK):
        self.send_body(status, json.dumps(payload).encode(), "application/json; charset=utf-8")

    def send_error_json(self, status: HTTPStatus, message: str):
        self.send_json({"error": message}, status)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if not self.host_allowed():
            self.send_error_json(HTTPStatus.FORBIDDEN, "host not allowed")
            return
        url = urlsplit(self.path)
        parts = [unquote(p) for p in url.path.split("/") if p]
        query = parse_qs(url.query)
        try:
            if parts[:1] == ["api"]:
                self.handle_api(parts[1:], query)
            else:
                self.handle_static(parts)
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception as error:
            self.send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, f"{type(error).__name__}: {error}")

    def handle_api(self, parts: list[str], query: dict):
        if parts == ["stream"]:
            if self.command == "HEAD":
                self.send_body(HTTPStatus.OK, b"", "text/event-stream")
            else:
                self.handle_stream()
        elif parts == ["engagements"]:
            self.send_json({
                "root": str(self.workspace.root),
                "active": self.workspace.active(),
                "engagements": [self.workspace.summary(i) for i in self.workspace.engagement_ids()],
            })
        elif len(parts) == 2 and parts[0] == "engagements":
            if self.workspace.engagement_dir(parts[1]) is None:
                self.send_error_json(HTTPStatus.NOT_FOUND, "unknown engagement")
                return
            session, error = self.workspace.session(parts[1])
            self.send_json({"id": parts[1], "session": session, "error": error})
        elif len(parts) == 3 and parts[0] == "engagements" and parts[2] == "timeline":
            try:
                offset = int(query.get("offset", ["0"])[0])
            except ValueError:
                offset = 0
            result = self.workspace.timeline(parts[1], offset)
            if result is None:
                self.send_error_json(HTTPStatus.NOT_FOUND, "unknown engagement")
            else:
                self.send_json(result)
        else:
            self.send_error_json(HTTPStatus.NOT_FOUND, "unknown endpoint")

    def handle_static(self, parts: list[str]):
        relative = "/".join(parts) or "index.html"
        try:
            target = (ASSETS / relative).resolve()
            found = target.is_relative_to(ASSETS.resolve()) and target.is_file()
        except (OSError, ValueError):
            found = False
        if not found:
            self.send_error_json(HTTPStatus.NOT_FOUND, "not found")
            return
        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in {"application/javascript", "application/json"}:
            content_type += "; charset=utf-8"
        self.send_body(HTTPStatus.OK, target.read_bytes(), content_type)

    def handle_stream(self):
        with self.server.counting:
            if self.server.streams >= MAX_STREAMS:
                self.send_error_json(HTTPStatus.SERVICE_UNAVAILABLE, "too many open streams")
                return
            self.server.streams += 1
        try:
            self.stream()
        finally:
            with self.server.counting:
                self.server.streams -= 1

    def stream(self):
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "close")
        self.end_headers()
        self.close_connection = True
        last = None
        beat = time.monotonic()
        try:
            while not self.server.stopping.is_set():
                current = self.workspace.signature()
                if current != last:
                    last = current
                    self.wfile.write(b"event: change\ndata: {}\n\n")
                    self.wfile.flush()
                    beat = time.monotonic()
                elif time.monotonic() - beat > HEARTBEAT_SECONDS:
                    self.wfile.write(b": keep-alive\n\n")
                    self.wfile.flush()
                    beat = time.monotonic()
                time.sleep(POLL_SECONDS)
        except (BrokenPipeError, ConnectionResetError, OSError):
            return


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve a read-only view of a .zkcrypto-audit workspace on 127.0.0.1.")
    parser.add_argument("--dir", type=pathlib.Path, default=pathlib.Path(".zkcrypto-audit"),
                        help="workspace directory that contains the engagement directories")
    parser.add_argument("--port", type=int, default=0, help="port to listen on; 0 picks a free port")
    parser.add_argument("--no-open", action="store_true", help="do not open a browser")
    parser.add_argument("--verbose", action="store_true", help="log requests")
    args = parser.parse_args()

    if not args.dir.is_dir():
        print(f"workspace directory not found: {args.dir}", file=sys.stderr)
        return 2

    server = Server(("127.0.0.1", args.port), Handler)
    server.workspace = Workspace(args.dir)
    server.verbose = args.verbose
    server.stopping = threading.Event()
    server.counting = threading.Lock()
    server.streams = 0
    url = f"http://127.0.0.1:{server.server_address[1]}/"
    print(f"audit dashboard: {url}", flush=True)
    print(f"workspace: {server.workspace.root}", flush=True)
    if not args.no_open:
        threading.Timer(0.3, webbrowser.open, args=(url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.stopping.set()
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
