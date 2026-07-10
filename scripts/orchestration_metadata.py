#!/usr/bin/env python3
"""Shared registry/router parsing and validation for orchestration scripts.

This module owns the standard-library-only YAML subset parsing used across
`sync_codex_stubs.py`, `sync_skill_counts.py`, and `sync_router_docs.py`.
No third-party dependency (PyYAML, jsonschema) is introduced here.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = REPO_ROOT / "plugins" / "_meta" / "codex-skill-registry.yaml"
ROUTER_MATRIX_PATH = REPO_ROOT / "plugins" / "_meta" / "router-matrix.yaml"
CODEX_SKILLS_DIR = REPO_ROOT / ".codex" / "skills"

REQUIRED_SKILL_FIELDS = {
    "skill_name",
    "plugin_category",
    "canonical_path",
    "phase",
    "trigger_mode",
}
VALID_PHASES = {"intake", "domain", "verification", "reporting", "indexing"}
VALID_TRIGGER_MODES = {"router_auto", "user_triggered_only"}


def _strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1]
    return value


def _parse_registry_skills_fallback(text: str) -> list[dict[str, str]]:
    """Parse skills from registry without third-party YAML dependencies.

    This intentionally supports the subset used in this repository:
    - top-level `skills:`
    - entries with scalar fields:
      - skill_name
      - plugin_category
      - canonical_path
      - phase
      - trigger_mode
    """

    lines = text.splitlines()
    in_skills = False
    current: dict[str, str] | None = None
    skills: list[dict[str, str]] = []

    item_re = re.compile(r"^\s{2}-\s+skill_name:\s*(.+?)\s*$")
    field_re = re.compile(r"^\s{4}([a-z_]+):\s*(.+?)\s*$")

    for line in lines:
        if not in_skills:
            if line.strip() == "skills:":
                in_skills = True
            continue

        if not line.strip():
            continue
        if re.match(r"^\S", line):
            break

        item_match = item_re.match(line)
        if item_match:
            if current is not None:
                skills.append(current)
            current = {"skill_name": _strip_quotes(item_match.group(1))}
            continue

        field_match = field_re.match(line)
        if field_match and current is not None:
            key, raw_value = field_match.groups()
            current[key] = _strip_quotes(raw_value)

    if current is not None:
        skills.append(current)

    return skills


def load_registry(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")

    try:
        import yaml  # type: ignore
    except ModuleNotFoundError:
        yaml = None

    if yaml is not None:
        try:
            loaded = yaml.safe_load(text)
            if isinstance(loaded, dict):
                return loaded
        except Exception:
            pass

    stripped = text.lstrip()
    if stripped.startswith("{"):
        loaded = json.loads(text)
        if not isinstance(loaded, dict):
            raise ValueError("Registry JSON must decode to an object.")
        return loaded

    return {"skills": _parse_registry_skills_fallback(text)}


def validate_registry(registry: dict[str, Any]) -> tuple[list[dict[str, str]], list[str]]:
    errors: list[str] = []
    raw_skills = registry.get("skills")

    if not isinstance(raw_skills, list) or not raw_skills:
        return [], ["Registry must contain a non-empty `skills` list."]

    skills: list[dict[str, str]] = []
    seen_skill_names: set[str] = set()

    for idx, entry in enumerate(raw_skills, start=1):
        if not isinstance(entry, dict):
            errors.append(f"skills[{idx}] is not an object.")
            continue

        missing = sorted(REQUIRED_SKILL_FIELDS - set(entry.keys()))
        if missing:
            errors.append(f"skills[{idx}] missing required fields: {', '.join(missing)}")
            continue

        normalized: dict[str, str] = {}
        for field in REQUIRED_SKILL_FIELDS:
            value = entry.get(field)
            if not isinstance(value, str) or not value.strip():
                errors.append(f"skills[{idx}].{field} must be a non-empty string.")
                continue
            normalized[field] = value.strip()

        if set(normalized.keys()) != REQUIRED_SKILL_FIELDS:
            continue

        entry_invalid = False

        phase = normalized["phase"]
        if phase not in VALID_PHASES:
            errors.append(
                f"skills[{idx}] `{normalized['skill_name']}` has invalid phase `{phase}`; "
                f"expected one of {sorted(VALID_PHASES)}."
            )
            entry_invalid = True

        trigger_mode = normalized["trigger_mode"]
        if trigger_mode not in VALID_TRIGGER_MODES:
            errors.append(
                f"skills[{idx}] `{normalized['skill_name']}` has invalid trigger_mode "
                f"`{trigger_mode}`; expected one of {sorted(VALID_TRIGGER_MODES)}."
            )
            entry_invalid = True

        skill_name = normalized["skill_name"]
        if skill_name in seen_skill_names:
            errors.append(f"Duplicate skill_name in registry: `{skill_name}`.")
            entry_invalid = True

        if entry_invalid:
            continue

        seen_skill_names.add(skill_name)
        skills.append(normalized)

    return skills, errors


def expected_skill_count() -> int:
    registry = load_registry(REGISTRY_PATH)
    skills, errors = validate_registry(registry)
    if errors:
        raise ValueError("\n".join(errors))
    return len(skills)


def _extract_router_route_targets(router_matrix_text: str) -> set[str]:
    return set(re.findall(r"^ {6}- ([a-z0-9-]+)\s*$", router_matrix_text, flags=re.M))


def _extract_user_triggered_exclusions(router_matrix_text: str) -> set[str]:
    match = re.search(
        r"user_triggered_only_exclusions:\n((?: {2}- [a-z0-9-]+\n)+)",
        router_matrix_text,
        flags=re.M,
    )
    if not match:
        return set()
    return set(re.findall(r"^ {2}- ([a-z0-9-]+)$", match.group(1), flags=re.M))


def _normalize_metadata_text(text: str) -> str:
    return text.lower().replace("—", "-").replace("–", "-")


def validate_router_matrix_consistency(skills: list[dict[str, str]]) -> list[str]:
    errors: list[str] = []
    if not ROUTER_MATRIX_PATH.exists():
        return [f"Router matrix file is missing: {ROUTER_MATRIX_PATH.relative_to(REPO_ROOT).as_posix()}"]

    matrix_text = ROUTER_MATRIX_PATH.read_text(encoding="utf-8")
    registry_skill_names = {entry["skill_name"] for entry in skills}

    route_targets = _extract_router_route_targets(matrix_text)
    if not route_targets:
        errors.append("Router matrix has no route_to targets.")
    else:
        missing_route_targets = sorted(route_targets - registry_skill_names)
        if missing_route_targets:
            errors.append(
                "Router matrix contains route_to targets not present in registry: "
                + ", ".join(f"`{name}`" for name in missing_route_targets)
            )

    user_triggered_registry = {
        entry["skill_name"] for entry in skills if entry["trigger_mode"] == "user_triggered_only"
    }
    user_triggered_exclusions = _extract_user_triggered_exclusions(matrix_text)
    if user_triggered_exclusions != user_triggered_registry:
        missing = sorted(user_triggered_registry - user_triggered_exclusions)
        extra = sorted(user_triggered_exclusions - user_triggered_registry)
        details: list[str] = []
        if missing:
            details.append("missing: " + ", ".join(f"`{name}`" for name in missing))
        if extra:
            details.append("extra: " + ", ".join(f"`{name}`" for name in extra))
        errors.append(
            "user_triggered_only_exclusions mismatch with registry trigger_mode entries ("
            + "; ".join(details)
            + ")"
        )

    return errors


# --- Router matrix (routing_rules / phase_flow) parsing -------------------
#
# The router matrix uses a richer nested structure than the flat skills list,
# so it gets its own tolerant parser. It supports exactly the shape used in
# `plugins/_meta/router-matrix.yaml`:
#
#   phase_flow:
#     - phase: <phase>
#       default_skill: <skill_name>
#       stop_condition: <text>
#       escalation_rule: <text>
#   routing_rules:
#     - rule_id: <id>
#       predicate: <text>
#       phase: <phase>
#       route_to:
#         - <skill_name>
#         - <skill_name>


def _parse_scalar_block(lines: list[str], start_idx: int, item_indent: int) -> tuple[dict[str, Any], int]:
    """Parse a single `- key: value` list item starting at start_idx.

    Returns the parsed dict and the index of the first line not consumed.
    """

    entry: dict[str, Any] = {}
    first_line = lines[start_idx]
    field_prefix = " " * (item_indent + 2)

    first_match = re.match(rf"^{' ' * item_indent}-\s+([a-z_]+):\s*(.*)$", first_line)
    if first_match:
        key, value = first_match.groups()
        value = value.strip()
        if value:
            entry[key] = _strip_quotes(value)
        else:
            entry[key] = None

    idx = start_idx + 1
    while idx < len(lines):
        line = lines[idx]
        if not line.strip():
            idx += 1
            continue
        if re.match(rf"^{' ' * item_indent}-\s", line):
            break
        if re.match(r"^\S", line):
            break

        list_field_match = re.match(rf"^{field_prefix}([a-z_]+):\s*$", line)
        if list_field_match and idx + 1 < len(lines) and re.match(rf"^{field_prefix}  -\s", lines[idx + 1]):
            key = list_field_match.group(1)
            items: list[str] = []
            idx += 1
            while idx < len(lines) and re.match(rf"^{field_prefix}  -\s+(.+)$", lines[idx]):
                item_match = re.match(rf"^{field_prefix}  -\s+(.+)$", lines[idx])
                items.append(_strip_quotes(item_match.group(1)))
                idx += 1
            entry[key] = items
            continue

        field_match = re.match(rf"^{field_prefix}([a-z_]+):\s*(.*)$", line)
        if field_match:
            key, value = field_match.groups()
            entry[key] = _strip_quotes(value.strip()) if value.strip() else None
            idx += 1
            continue

        if re.match(rf"^{' ' * (item_indent + 1)}\S", line) and not re.match(rf"^{field_prefix}\S", line):
            break

        idx += 1

    return entry, idx


def _parse_top_level_list(text: str, key: str) -> list[dict[str, Any]]:
    lines = text.splitlines()
    entries: list[dict[str, Any]] = []

    idx = 0
    in_section = False
    while idx < len(lines):
        line = lines[idx]
        if not in_section:
            if line.rstrip() == f"{key}:":
                in_section = True
            idx += 1
            continue

        if not line.strip():
            idx += 1
            continue
        if re.match(r"^\S", line):
            break

        if re.match(r"^ {2}-\s", line):
            entry, next_idx = _parse_scalar_block(lines, idx, item_indent=2)
            entries.append(entry)
            idx = next_idx
            continue

        idx += 1

    return entries


def load_router_matrix(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")

    try:
        import yaml  # type: ignore
    except ModuleNotFoundError:
        yaml = None

    if yaml is not None:
        try:
            loaded = yaml.safe_load(text)
            if isinstance(loaded, dict):
                return loaded
        except Exception:
            pass

    return {
        "phase_flow": _parse_top_level_list(text, "phase_flow"),
        "routing_rules": _parse_top_level_list(text, "routing_rules"),
        "user_triggered_only_exclusions": sorted(_extract_user_triggered_exclusions(text)),
    }


def validate_router_reachability(
    skills: list[dict[str, str]], router_matrix: dict[str, Any]
) -> list[str]:
    """Validate that every router_auto skill is reachable and no
    user_triggered_only skill is auto-routed.

    Returns a list of human-readable error strings; empty means valid.
    """

    errors: list[str] = []

    skills_by_name = {entry["skill_name"] for entry in skills}
    router_auto = {entry["skill_name"] for entry in skills if entry["trigger_mode"] == "router_auto"}
    user_triggered_only = {
        entry["skill_name"] for entry in skills if entry["trigger_mode"] == "user_triggered_only"
    }
    phase_by_skill = {entry["skill_name"]: entry["phase"] for entry in skills}

    phase_flow = router_matrix.get("phase_flow") or []
    routing_rules = router_matrix.get("routing_rules") or []

    phase_defaults = {
        entry["phase"]: entry["default_skill"]
        for entry in phase_flow
        if entry.get("phase") and entry.get("default_skill")
    }

    route_to_targets: set[str] = set()
    seen_rule_ids: set[str] = set()
    for rule in routing_rules:
        rule_id = rule.get("rule_id")
        if rule_id:
            if rule_id in seen_rule_ids:
                errors.append(f"Duplicate routing rule_id: `{rule_id}`")
            seen_rule_ids.add(rule_id)

        rule_phase = rule.get("phase")
        targets = rule.get("route_to") or []
        for target in targets:
            route_to_targets.add(target)
            if target not in skills_by_name:
                errors.append(
                    f"Routing rule `{rule_id}` routes to unknown skill `{target}`."
                )
                continue
            if rule_phase and phase_by_skill.get(target) != rule_phase:
                errors.append(
                    f"Routing rule `{rule_id}` declares phase `{rule_phase}` but target "
                    f"`{target}` is registered as phase `{phase_by_skill.get(target)}`."
                )
            if target in user_triggered_only:
                errors.append(
                    f"Routing rule `{rule_id}` routes to `user_triggered_only` skill `{target}`; "
                    "user-triggered skills must not be auto-routed."
                )

    for phase, default_skill in phase_defaults.items():
        if default_skill in user_triggered_only:
            errors.append(
                f"Phase `{phase}` default_skill `{default_skill}` is `user_triggered_only`; "
                "phase defaults must not be auto-routed user-triggered skills."
            )

    reachable = route_to_targets | set(phase_defaults.values())
    unreachable = sorted(router_auto - reachable)
    if unreachable:
        errors.append(
            "router_auto skills unreachable by any routing rule or phase default: "
            + ", ".join(f"`{name}`" for name in unreachable)
        )

    return errors
