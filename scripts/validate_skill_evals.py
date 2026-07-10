#!/usr/bin/env python3
"""Validate skill evaluation fixtures against the JSON schema and repository state.

For every fixture in tests/fixtures/skill-evals/*.json (excluding schema.json):

- Shape-validates the fixture against schema.json (jsonschema if available,
  otherwise a minimal structural fallback so this script has no hard
  third-party dependency).
- Confirms the named skill (or extended skill, for an extension fixture)
  exists in the registry.
- Confirms every required_source appears in the skill's
  references/spec-sources.md (or, for an extension fixture named
  `<skill>-<extension>.json`, in the extension's own reference file if one
  matching the fixture's extension exists; otherwise the skill's
  spec-sources.md).
- Confirms every required_output_field appears in the skill's
  `## Output Contract` section.
- Confirms positive/negative expected_route values resolve to real registry
  skills, and that positive routes for router_auto skills are reachable by a
  machine rule or phase default. For user_triggered_only skills, confirms the
  skill is excluded from all automatic routes/defaults instead.
- Rejects any fixture or referenced skill file containing an unresolved
  scaffold marker (see scripts/init_audit_skill.py).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.orchestration_metadata import (  # noqa: E402
    REGISTRY_PATH,
    ROUTER_MATRIX_PATH,
    load_registry,
    load_router_matrix,
    validate_registry,
)
from scripts.init_audit_skill import SCAFFOLD_MARKER  # noqa: E402


FIXTURES_DIR = REPO_ROOT / "tests" / "fixtures" / "skill-evals"
SCHEMA_PATH = FIXTURES_DIR / "schema.json"

SKILL_NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def load_fixture(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _extended_skill_name(fixture_path: Path, registry_skills: dict[str, dict[str, str]]) -> str | None:
    """For an extension fixture `<skill>-<ext>.json`, return `<skill>` if it is
    a registered skill name and the file stem is not itself a registered
    skill name. Returns None for a non-extension fixture."""

    stem = fixture_path.stem
    if stem in registry_skills:
        return None
    for skill_name in registry_skills:
        if stem.startswith(f"{skill_name}-"):
            return skill_name
    return None


def _validate_shape(fixture: dict) -> list[str]:
    try:
        import jsonschema  # type: ignore
    except ModuleNotFoundError:
        jsonschema = None

    if jsonschema is not None:
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        validator_cls = jsonschema.Draft202012Validator
        validator = validator_cls(schema)
        return [
            f"{'.'.join(str(part) for part in error.path) or '<root>'}: {error.message}"
            for error in sorted(validator.iter_errors(fixture), key=lambda e: list(e.path))
        ]

    return _validate_shape_fallback(fixture)


def _validate_shape_fallback(fixture: dict) -> list[str]:
    errors: list[str] = []

    required_top_level = {
        "skill_name",
        "positive_prompts",
        "negative_prompts",
        "required_sources",
        "required_output_fields",
    }
    missing = sorted(required_top_level - set(fixture.keys()))
    if missing:
        errors.append(f"fixture missing required fields: {', '.join(missing)}")
        return errors

    if not SKILL_NAME_RE.match(fixture["skill_name"]):
        errors.append(f"skill_name `{fixture['skill_name']}` is not lowercase-hyphenated.")

    for field in ("positive_prompts", "negative_prompts"):
        prompts = fixture.get(field)
        if not isinstance(prompts, list) or len(prompts) < 2:
            errors.append(f"{field} must contain at least 2 entries.")
            continue
        for idx, entry in enumerate(prompts):
            if not isinstance(entry, dict) or "prompt" not in entry or "expected_route" not in entry:
                errors.append(f"{field}[{idx}] must contain `prompt` and `expected_route`.")

    required_sources = fixture.get("required_sources")
    if not isinstance(required_sources, list) or len(required_sources) < 1:
        errors.append("required_sources must contain at least 1 entry.")

    required_output_fields = fixture.get("required_output_fields")
    if not isinstance(required_output_fields, list) or len(required_output_fields) < 1:
        errors.append("required_output_fields must contain at least 1 entry.")

    for note in fixture.get("forward_test_notes", []) or []:
        if not isinstance(note, dict):
            errors.append("forward_test_notes entries must be objects.")
            continue
        if note.get("prompt_kind") not in {"positive", "negative"}:
            errors.append(f"forward_test_notes entry has invalid prompt_kind: {note.get('prompt_kind')!r}")
        if "observed_route" not in note or "output_fields_present" not in note:
            errors.append("forward_test_notes entry missing observed_route or output_fields_present.")

    return errors


def _reachable_router_auto_routes(router_matrix: dict) -> set[str]:
    route_to_targets: set[str] = set()
    for rule in router_matrix.get("routing_rules", []):
        route_to_targets.update(rule.get("route_to") or [])
    for entry in router_matrix.get("phase_flow", []):
        default_skill = entry.get("default_skill")
        if default_skill:
            route_to_targets.add(default_skill)
    return route_to_targets


def validate_fixture(
    fixture: dict,
    *,
    registry_skills: dict[str, dict[str, str]],
    router_matrix: dict,
    repo_root: Path = REPO_ROOT,
    fixture_path: Path | None = None,
) -> list[str]:
    errors: list[str] = []

    if fixture_path is not None:
        raw_text = json.dumps(fixture)
        if SCAFFOLD_MARKER in raw_text:
            errors.append(
                f"{fixture_path.relative_to(repo_root).as_posix()} contains an unresolved "
                f"`{SCAFFOLD_MARKER}` scaffold marker."
            )

    errors.extend(_validate_shape(fixture))
    if errors:
        return errors

    skill_name = fixture["skill_name"]
    skill_entry = registry_skills.get(skill_name)
    if skill_entry is None:
        errors.append(f"skill_name `{skill_name}` does not resolve to a registered skill.")
        return errors

    canonical_path = repo_root / skill_entry["canonical_path"]
    if not canonical_path.exists():
        errors.append(f"canonical_path for `{skill_name}` does not exist: {skill_entry['canonical_path']}")
        return errors

    skill_text = canonical_path.read_text(encoding="utf-8")
    if SCAFFOLD_MARKER in skill_text:
        errors.append(
            f"{skill_entry['canonical_path']} still contains an unresolved `{SCAFFOLD_MARKER}` scaffold marker."
        )

    output_contract_match = re.search(
        r"## Output Contract\n(.*?)(?:\n## |\Z)", skill_text, flags=re.S
    )
    output_contract_text = output_contract_match.group(1) if output_contract_match else ""
    for field in fixture["required_output_fields"]:
        if field not in output_contract_text:
            errors.append(
                f"required_output_field `{field}` not found in {skill_name}'s `## Output Contract` section."
            )

    spec_sources_path = canonical_path.parent / "references" / "spec-sources.md"
    spec_sources_text = ""
    if spec_sources_path.exists():
        spec_sources_text = spec_sources_path.read_text(encoding="utf-8")
        if SCAFFOLD_MARKER in spec_sources_text:
            errors.append(
                f"{spec_sources_path.relative_to(repo_root).as_posix()} still contains an unresolved "
                f"`{SCAFFOLD_MARKER}` scaffold marker."
            )
    else:
        errors.append(
            f"references/spec-sources.md not found for `{skill_name}`: "
            f"{spec_sources_path.relative_to(repo_root).as_posix()}"
        )

    for source in fixture["required_sources"]:
        if source not in spec_sources_text:
            errors.append(
                f"required_source `{source}` not found in {skill_name}'s references/spec-sources.md."
            )

    reachable_routes = _reachable_router_auto_routes(router_matrix)
    user_triggered_only_names = {
        name for name, entry in registry_skills.items() if entry["trigger_mode"] == "user_triggered_only"
    }

    for prompt_case in fixture["positive_prompts"]:
        expected_route = prompt_case["expected_route"]
        target_entry = registry_skills.get(expected_route)
        if target_entry is None:
            errors.append(f"positive expected_route `{expected_route}` does not resolve to a registered skill.")
            continue

        if target_entry["trigger_mode"] == "user_triggered_only":
            if expected_route in reachable_routes:
                errors.append(
                    f"positive expected_route `{expected_route}` is `user_triggered_only` but appears in "
                    "an automatic route or phase default."
                )
        else:
            if expected_route not in reachable_routes:
                errors.append(
                    f"positive expected_route `{expected_route}` is `router_auto` but is unreachable "
                    "by any machine rule or phase default."
                )

    for prompt_case in fixture["negative_prompts"]:
        expected_route = prompt_case["expected_route"]
        if expected_route not in registry_skills:
            errors.append(f"negative expected_route `{expected_route}` does not resolve to a registered skill.")

    for note in fixture.get("forward_test_notes", []) or []:
        observed_route = note.get("observed_route")
        if observed_route and observed_route not in registry_skills:
            errors.append(
                f"forward_test_notes observed_route `{observed_route}` does not resolve to a registered skill."
            )

    return errors


def validate_all(*, repo_root: Path = REPO_ROOT) -> int:
    registry = load_registry(REGISTRY_PATH)
    skills, registry_errors = validate_registry(registry)
    if registry_errors:
        print("validate_skill_evals: registry validation failed", file=sys.stderr)
        for error in registry_errors:
            print(f" - {error}", file=sys.stderr)
        return 1

    registry_skills = {entry["skill_name"]: entry for entry in skills}
    router_matrix = load_router_matrix(ROUTER_MATRIX_PATH)

    fixture_paths = sorted(p for p in FIXTURES_DIR.glob("*.json") if p.name != "schema.json")

    all_errors: list[str] = []
    for fixture_path in fixture_paths:
        fixture = load_fixture(fixture_path)
        errors = validate_fixture(
            fixture,
            registry_skills=registry_skills,
            router_matrix=router_matrix,
            repo_root=repo_root,
            fixture_path=fixture_path,
        )
        for error in errors:
            all_errors.append(f"{fixture_path.relative_to(repo_root).as_posix()}: {error}")

    if all_errors:
        print("validate_skill_evals: validation failed", file=sys.stderr)
        for error in all_errors:
            print(f" - {error}", file=sys.stderr)
        return 1

    print(f"validate_skill_evals: check passed for {len(fixture_paths)} fixtures")
    return 0


def main() -> int:
    return validate_all()


if __name__ == "__main__":
    raise SystemExit(main())
