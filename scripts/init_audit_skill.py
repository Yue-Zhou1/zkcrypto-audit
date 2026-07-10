#!/usr/bin/env python3
"""Scaffold a new audit skill's canonical files and matching evaluation fixture.

This intentionally leaves explicit scaffold markers (the literal string
`SCAFFOLD_TODO`) in every generated file. `validate_skill_evals.py` rejects
any fixture or skill file containing that marker, so a scaffold can never be
committed unfinished.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.orchestration_metadata import VALID_PHASES, VALID_TRIGGER_MODES  # noqa: E402


SKILL_NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

SCAFFOLD_MARKER = "SCAFFOLD_TODO"


class InitAuditSkillError(ValueError):
    pass


def _validate_skill_name(skill_name: str) -> None:
    if not SKILL_NAME_RE.match(skill_name):
        raise InitAuditSkillError(
            f"skill name `{skill_name}` must be lowercase hyphenated (e.g. `example-auditor`)."
        )


def _skill_md_text(*, skill_name: str, category: str, checklist: str, workflow: str) -> str:
    return f"""---
name: {skill_name}
description: >
  {SCAFFOLD_MARKER}: one to three sentences describing when this skill applies
  and what invariant it protects. Replace before committing.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# {skill_name}

{SCAFFOLD_MARKER}: one-paragraph domain summary.

## When to Use

- {SCAFFOLD_MARKER}: list concrete positive trigger conditions

## When NOT to Use

- {SCAFFOLD_MARKER}: list explicit exclusions and the neighboring skill each routes to

## Core Review Areas

1. {SCAFFOLD_MARKER}

## Workflow

### Phase 1: {SCAFFOLD_MARKER}

- Read `references/{checklist}`
- Execute `workflows/{workflow}`

### Phase 2: {SCAFFOLD_MARKER}

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`

### Phase 4: Handoff

- {SCAFFOLD_MARKER}: describe the next route(s)

## Output Contract

Produce a handoff that includes:

- {SCAFFOLD_MARKER}: list every required output field name literally, one per line

## Reference Index

- [references/{checklist}](references/{checklist})
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/{workflow}](workflows/{workflow})
"""


def _checklist_text(*, skill_name: str) -> str:
    return f"""# {skill_name} Checklist

{SCAFFOLD_MARKER}: replace with concrete, source-backed checklist items.

- {SCAFFOLD_MARKER}
"""


def _finding_patterns_text(*, skill_name: str) -> str:
    return f"""# {skill_name} Finding Patterns

{SCAFFOLD_MARKER}: replace with concrete finding patterns and root causes.

- {SCAFFOLD_MARKER}
"""


def _spec_sources_text(*, skill_name: str) -> str:
    return f"""# {skill_name} Spec Sources

{SCAFFOLD_MARKER}: list the authoritative standards/papers this skill's
checklist claims are backed by. Distinguish normative from informative
material and pin the exact version/section referenced.

- {SCAFFOLD_MARKER}
"""


def _workflow_text(*, skill_name: str, workflow: str) -> str:
    return f"""# {workflow}

{SCAFFOLD_MARKER}: replace with the concrete, executable review workflow for
{skill_name}.

1. {SCAFFOLD_MARKER}
"""


def _openai_yaml_text(*, skill_name: str, trigger_mode: str) -> str:
    user_triggered_suffix = (
        " User-triggered only — never auto-invoked by the audit flow."
        if trigger_mode == "user_triggered_only"
        else ""
    )
    short_description = f"{SCAFFOLD_MARKER}: 1-2 sentence capability summary.{user_triggered_suffix}"
    default_prompt = f"Use {skill_name} for this task. {SCAFFOLD_MARKER}: describe the target.{user_triggered_suffix}"
    return (
        f"display_name: {skill_name}\n"
        f"short_description: {short_description}\n"
        f"default_prompt: {default_prompt}\n"
    )


def _fixture_dict(*, skill_name: str) -> dict:
    # `expected_route` is schema-constrained to lowercase-hyphenated names, so
    # the negative-route placeholder below cannot be the literal scaffold
    # marker string. It is still an obviously-fake route, and the `prompt`
    # fields carry the literal marker so the scaffold-marker scan still
    # rejects this fixture until every field is replaced.
    return {
        "skill_name": skill_name,
        "positive_prompts": [
            {"prompt": f"{SCAFFOLD_MARKER}: a prompt that should select {skill_name}.", "expected_route": skill_name},
            {"prompt": f"{SCAFFOLD_MARKER}: a second prompt that should select {skill_name}.", "expected_route": skill_name},
        ],
        "negative_prompts": [
            {
                "prompt": f"{SCAFFOLD_MARKER}: a nearby prompt that should route elsewhere.",
                "expected_route": "scaffold-todo-replace-me",
            },
            {
                "prompt": f"{SCAFFOLD_MARKER}: a second nearby prompt that should route elsewhere.",
                "expected_route": "scaffold-todo-replace-me",
            },
        ],
        "required_sources": [f"{SCAFFOLD_MARKER}: a governing standard or primary paper"],
        "required_output_fields": [f"{SCAFFOLD_MARKER}_field"],
    }


def init_audit_skill(
    *,
    skill_name: str,
    category: str,
    checklist: str,
    workflow: str,
    phase: str,
    trigger_mode: str,
    repo_root: Path = REPO_ROOT,
) -> list[Path]:
    _validate_skill_name(skill_name)

    if phase not in VALID_PHASES:
        raise InitAuditSkillError(f"phase `{phase}` must be one of {sorted(VALID_PHASES)}.")
    if trigger_mode not in VALID_TRIGGER_MODES:
        raise InitAuditSkillError(
            f"trigger-mode `{trigger_mode}` must be one of {sorted(VALID_TRIGGER_MODES)}."
        )

    skill_dir = repo_root / "plugins" / category / "skills" / skill_name
    if skill_dir.exists():
        raise InitAuditSkillError(f"skill directory already exists: {skill_dir.relative_to(repo_root).as_posix()}")

    fixture_path = repo_root / "tests" / "fixtures" / "skill-evals" / f"{skill_name}.json"
    if fixture_path.exists():
        raise InitAuditSkillError(
            f"evaluation fixture already exists: {fixture_path.relative_to(repo_root).as_posix()}"
        )

    references_dir = skill_dir / "references"
    workflows_dir = skill_dir / "workflows"
    agents_dir = skill_dir / "agents"

    written: list[Path] = []

    def _write(path: Path, text: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        written.append(path)

    _write(skill_dir / "SKILL.md", _skill_md_text(
        skill_name=skill_name, category=category, checklist=checklist, workflow=workflow
    ))
    _write(references_dir / checklist, _checklist_text(skill_name=skill_name))
    _write(references_dir / "finding-patterns.md", _finding_patterns_text(skill_name=skill_name))
    _write(references_dir / "spec-sources.md", _spec_sources_text(skill_name=skill_name))
    _write(workflows_dir / workflow, _workflow_text(skill_name=skill_name, workflow=workflow))
    _write(agents_dir / "openai.yaml", _openai_yaml_text(skill_name=skill_name, trigger_mode=trigger_mode))

    fixture_path.parent.mkdir(parents=True, exist_ok=True)
    fixture_path.write_text(json.dumps(_fixture_dict(skill_name=skill_name), indent=2) + "\n", encoding="utf-8")
    written.append(fixture_path)

    return written


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scaffold a new audit skill's canonical files and evaluation fixture."
    )
    parser.add_argument("skill_name", help="Lowercase hyphenated skill name, e.g. example-auditor")
    parser.add_argument("--category", required=True, help="Plugin category directory name")
    parser.add_argument("--checklist", required=True, help="Checklist reference filename")
    parser.add_argument("--workflow", required=True, help="Workflow filename")
    parser.add_argument("--phase", required=True, choices=sorted(VALID_PHASES))
    parser.add_argument("--trigger-mode", required=True, dest="trigger_mode", choices=sorted(VALID_TRIGGER_MODES))
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        written = init_audit_skill(
            skill_name=args.skill_name,
            category=args.category,
            checklist=args.checklist,
            workflow=args.workflow,
            phase=args.phase,
            trigger_mode=args.trigger_mode,
        )
    except InitAuditSkillError as exc:
        print(f"init_audit_skill: {exc}", file=sys.stderr)
        return 1

    print(f"init_audit_skill: wrote {len(written)} files for `{args.skill_name}`")
    for path in written:
        print(f" - {path.relative_to(REPO_ROOT).as_posix()}")
    print(
        "init_audit_skill: replace every "
        f"`{SCAFFOLD_MARKER}` marker before running or committing this skill's fixture."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
