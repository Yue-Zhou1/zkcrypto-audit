#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
MARKETPLACE = ROOT / ".claude-plugin" / "marketplace.json"
CODEX_MARKETPLACE = ROOT / ".agents" / "plugins" / "marketplace.json"
ROUTER = ROOT / "plugins" / "core-audit-flow" / "skills" / "crypto-audit-router"
ROUTING_MATRIX = ROUTER / "references" / "routing-matrix.md"
SESSION_SCHEMA = ROUTER / "references" / "session-state-schema.json"
SESSION_TEMPLATE = ROUTER / "references" / "session-state-template.json"
README = ROOT / "README.md"

SPEC_KEYS = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}
NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
SKILL_SUFFIXES = (
    "-auditor", "-gen", "-checker", "-check", "-index", "-writer", "-router",
    "-context", "-common", "-safety", "-bridge", "-verification",
)
CODEX_CATEGORY = "Coding"
PERSONAL_PATH_RE = re.compile(r"/home/[a-z_][a-z0-9_-]*/|/Users/[A-Za-z]")


def load_json(path: pathlib.Path):
    return json.loads(path.read_text())


def dump_json(data) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def frontmatter(path: pathlib.Path) -> dict:
    text = path.read_text()
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---", 4)
    if end == -1:
        return {}
    data = yaml.safe_load(text[4:end])
    return data if isinstance(data, dict) else {}


def one_line(text: str) -> str:
    return " ".join(str(text).split())


def title_case(name: str) -> str:
    return " ".join(part.upper() if part in {"zk", "vm"} else part.capitalize() for part in name.split("-"))


def discover():
    market = load_json(MARKETPLACE)
    plugins = []
    for entry in market["plugins"]:
        plugin_dir = (ROOT / entry["source"]).resolve()
        skills = []
        for skill_md in sorted((plugin_dir / "skills").glob("*/SKILL.md")):
            skills.append({"dir": skill_md.parent, "name": skill_md.parent.name, "meta": frontmatter(skill_md)})
        plugins.append({"entry": entry, "dir": plugin_dir, "skills": skills})
    return market, plugins


def expected_files(market, plugins) -> dict[pathlib.Path, str]:
    meta = market["metadata"]
    version = meta["version"]
    out: dict[pathlib.Path, str] = {}

    codex_plugins = []
    for plugin in plugins:
        entry = plugin["entry"]
        description = entry["description"]
        author = entry.get("author", market["owner"])
        out[plugin["dir"] / ".claude-plugin" / "plugin.json"] = dump_json({
            "name": entry["name"],
            "version": version,
            "description": description,
            "author": author,
        })
        out[plugin["dir"] / ".codex-plugin" / "plugin.json"] = dump_json({
            "name": entry["name"],
            "version": version,
            "description": description,
            "author": author,
            "homepage": meta["homepage"],
            "repository": meta["repository"],
            "license": meta["license"],
            "keywords": meta["keywords"],
            "skills": "./skills/",
            "interface": {
                "displayName": title_case(entry["name"]),
                "shortDescription": description.split(":")[0].strip(),
                "longDescription": description,
                "developerName": author["name"],
                "category": CODEX_CATEGORY,
            },
        })
        codex_plugins.append({
            "name": entry["name"],
            "source": {"source": "local", "path": entry["source"]},
            "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},
            "category": CODEX_CATEGORY,
        })
        for skill in plugin["skills"]:
            description = one_line(skill["meta"].get("description", ""))
            out[skill["dir"] / "agents" / "openai.yaml"] = yaml.safe_dump(
                {
                    "interface": {
                        "display_name": skill["name"],
                        "short_description": description,
                        "default_prompt": f"Use {skill['name']} for this task. {description}",
                    }
                },
                sort_keys=False,
                allow_unicode=True,
                width=88,
            )

    out[CODEX_MARKETPLACE] = dump_json({
        "name": market["name"],
        "interface": {"displayName": market["name"]},
        "plugins": codex_plugins,
    })

    count = sum(len(p["skills"]) for p in plugins)
    readme = README.read_text()
    out[README] = re.sub(
        r"plugins-\d+_categories%2F\d+_skills",
        f"plugins-{len(plugins)}_categories%2F{count}_skills",
        readme,
    )
    for entry in market["plugins"]:
        entry["version"] = version
    out[MARKETPLACE] = dump_json(market)
    return out


def sync_generated(market, plugins, check: bool) -> list[str]:
    problems = []
    for path, content in expected_files(market, plugins).items():
        current = path.read_text() if path.exists() else None
        if current == content:
            continue
        if check:
            problems.append(f"out of date: {path.relative_to(ROOT)} (run scripts/sync.py)")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
            print(f"wrote {path.relative_to(ROOT)}")
    return problems


def check_frontmatter(plugins) -> list[str]:
    problems = []
    seen = {}
    for plugin in plugins:
        for skill in plugin["skills"]:
            rel = (skill["dir"] / "SKILL.md").relative_to(ROOT)
            meta = skill["meta"]
            name = meta.get("name")
            if name != skill["name"]:
                problems.append(f"{rel}: name '{name}' does not match directory '{skill['name']}'")
            if not NAME_RE.match(skill["name"]) or len(skill["name"]) > 64:
                problems.append(f"{rel}: invalid skill name")
            description = one_line(meta.get("description", ""))
            if not 1 <= len(description) <= 1024:
                problems.append(f"{rel}: description must be 1-1024 characters, got {len(description)}")
            extra = set(meta) - SPEC_KEYS
            if extra:
                problems.append(f"{rel}: frontmatter keys outside the Agent Skills spec: {sorted(extra)}")
            if "allowed-tools" in meta and not isinstance(meta["allowed-tools"], str):
                problems.append(f"{rel}: allowed-tools must be a space-separated string")
            lines = len((skill["dir"] / "SKILL.md").read_text().splitlines())
            if lines > 500:
                problems.append(f"{rel}: {lines} lines, limit is 500")
            if skill["name"] in seen:
                problems.append(f"{rel}: duplicate skill name, also in {seen[skill['name']]}")
            seen[skill["name"]] = rel
    return problems


def check_references(plugins) -> list[str]:
    problems = []
    names = {skill["name"] for plugin in plugins for skill in plugin["skills"]}
    link_re = re.compile(r"\]\(([^)\s]+)\)")
    tick_re = re.compile(r"`([^`\s]+)`")
    for plugin in plugins:
        for skill in plugin["skills"]:
            root = skill["dir"]
            subdirs = {p.name for p in root.iterdir() if p.is_dir()}
            skill_text = (root / "SKILL.md").read_text()
            for doc in sorted(root.rglob("*.md")):
                if ".cache" in doc.parts:
                    continue
                rel = doc.relative_to(ROOT)
                text = doc.read_text()
                if PERSONAL_PATH_RE.search(text):
                    problems.append(f"{rel}: contains a personal filesystem path")
                for target in link_re.findall(text):
                    if re.match(r"^[a-z]+:", target) or target.startswith("#"):
                        continue
                    target = target.split("#")[0]
                    if target.startswith("/") or ".." in pathlib.PurePosixPath(target).parts:
                        problems.append(f"{rel}: link leaves the skill directory: {target}")
                    elif not (doc.parent / target).exists() and not (root / target).exists():
                        problems.append(f"{rel}: broken link: {target}")
                for token in tick_re.findall(text):
                    token = token.rstrip(".,:;")
                    if token.startswith("../") or token.startswith("plugins/"):
                        problems.append(f"{rel}: path leaves the skill directory: {token}")
                        continue
                    parts = pathlib.PurePosixPath(token).parts
                    if (
                        len(parts) > 1
                        and parts[0] in subdirs
                        and not re.search(r"[<>*{}$]", token)
                        and "." in parts[-1]
                        and not (root / token.split("#")[0].split(":")[0]).exists()
                    ):
                        problems.append(f"{rel}: path does not exist in the skill: {token}")
                    if NAME_RE.match(token) and token.endswith(SKILL_SUFFIXES) and token not in names:
                        problems.append(f"{rel}: refers to unknown skill: {token}")
            for sub in ("references", "workflows", "templates"):
                for ref in sorted((root / sub).glob("*")) if (root / sub).is_dir() else []:
                    if f"{sub}/{ref.name}" not in skill_text:
                        problems.append(
                            f"{(root / 'SKILL.md').relative_to(ROOT)}: does not mention {sub}/{ref.name}"
                        )
    return problems


def check_routing(plugins) -> list[str]:
    problems = []
    names = {skill["name"] for plugin in plugins for skill in plugin["skills"]}
    text = ROUTING_MATRIX.read_text()
    routed = set()
    for line in text.splitlines():
        if not line.startswith("|") or set(line) <= set("|- "):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        for cell in (cells[0], cells[-1]):
            match = re.fullmatch(r"`([a-z0-9-]+)`", cell)
            if match:
                routed.add(match.group(1))
    rel = ROUTING_MATRIX.relative_to(ROOT)
    for name in sorted(routed - names):
        problems.append(f"{rel}: routes to unknown skill: {name}")
    for name in sorted(names - routed):
        problems.append(f"{rel}: skill has no route or listing: {name}")
    return problems


def check_sessions() -> list[str]:
    import jsonschema

    problems = []
    schema = load_json(SESSION_SCHEMA)
    jsonschema.Draft202012Validator.check_schema(schema)
    validator = jsonschema.Draft202012Validator(schema)
    sessions = [SESSION_TEMPLATE] + sorted((ROOT / "examples" / "engagements").glob("*/session.json"))
    for path in sessions:
        data = load_json(path)
        rel = path.relative_to(ROOT)
        for error in validator.iter_errors(data):
            where = "/".join(str(p) for p in error.absolute_path)
            problems.append(f"{rel}: {where}: {error.message[:160]}")
        if path != SESSION_TEMPLATE and data.get("engagement_id") != path.parent.name:
            problems.append(f"{rel}: engagement_id does not match directory name")
    for path in sorted((ROOT / "examples").rglob("*")):
        if path.is_file() and path.suffix in {".md", ".json", ".rs"} and PERSONAL_PATH_RE.search(path.read_text()):
            problems.append(f"{path.relative_to(ROOT)}: contains a personal filesystem path")
    return problems


def check_layout(market, plugins) -> list[str]:
    problems = []
    listed = {plugin["dir"] for plugin in plugins}
    on_disk = {p for p in (ROOT / "plugins").iterdir() if p.is_dir()}
    for extra in sorted(on_disk - listed):
        problems.append(f"plugins/{extra.name}: not listed in .claude-plugin/marketplace.json")
    for missing in sorted(listed - on_disk):
        problems.append(f"marketplace lists a plugin directory that does not exist: {missing.relative_to(ROOT)}")
    for plugin in plugins:
        if not plugin["skills"]:
            problems.append(f"{plugin['dir'].relative_to(ROOT)}: plugin has no skills")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Regenerate derived packaging files from SKILL.md and the Claude marketplace manifest, and validate the repository."
    )
    parser.add_argument("--check", action="store_true", help="verify without writing; exit non-zero on any problem")
    args = parser.parse_args()

    market, plugins = discover()
    problems = sync_generated(market, plugins, args.check)
    problems += check_layout(market, plugins)
    problems += check_frontmatter(plugins)
    problems += check_references(plugins)
    problems += check_routing(plugins)
    problems += check_sessions()

    count = sum(len(p["skills"]) for p in plugins)
    if problems:
        for problem in problems:
            print(f"ERROR: {problem}", file=sys.stderr)
        print(f"{len(problems)} problem(s) across {len(plugins)} plugins and {count} skills", file=sys.stderr)
        return 1
    print(f"ok: {len(plugins)} plugins, {count} skills")
    return 0


if __name__ == "__main__":
    sys.exit(main())
