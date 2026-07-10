#!/usr/bin/env python3
"""Generate routing-matrix.md and full-audit-flow.md generated regions from the
machine-readable router matrix and skill registry."""

from __future__ import annotations

import argparse
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
    validate_router_reachability,
)


ROUTING_MATRIX_DOC_PATH = (
    REPO_ROOT
    / "plugins"
    / "core-audit-flow"
    / "skills"
    / "crypto-audit-router"
    / "references"
    / "routing-matrix.md"
)
FULL_AUDIT_FLOW_DOC_PATH = (
    REPO_ROOT
    / "plugins"
    / "core-audit-flow"
    / "skills"
    / "crypto-audit-router"
    / "workflows"
    / "full-audit-flow.md"
)

ROUTING_RULES_BEGIN = "<!-- BEGIN GENERATED ROUTING RULES -->"
ROUTING_RULES_END = "<!-- END GENERATED ROUTING RULES -->"
DOMAIN_SKILLS_BEGIN = "<!-- BEGIN GENERATED DOMAIN SKILLS -->"
DOMAIN_SKILLS_END = "<!-- END GENERATED DOMAIN SKILLS -->"

CATEGORY_DISPLAY_NAMES = {
    "zk-and-vm-auditors": "ZK and VM auditors",
    "crypto-primitive-auditors": "Crypto primitive auditors",
    "protocol-auditors": "Protocol auditors",
    "post-quantum-auditors": "Post-quantum auditors",
    "implementation-safety": "Implementation safety",
}

# File order in which domain categories are presented; matches the existing
# full-audit-flow.md prose and the registry's category grouping order.
CATEGORY_ORDER = [
    "zk-and-vm-auditors",
    "crypto-primitive-auditors",
    "protocol-auditors",
    "post-quantum-auditors",
    "implementation-safety",
]

# core-audit-flow's sole `phase: domain` skill (spec-delta-checker) is called
# out by the hand-written sentence immediately above the generated region
# ("Use spec-delta-checker whenever..."), not by a per-category auditor
# bucket, so it is intentionally excluded from this breakdown.
DOMAIN_CATEGORY_EXCLUSIONS = {"core-audit-flow"}


def render_routing_rules_table(router_matrix: dict) -> str:
    lines = ["| Situation | Route |", "|---|---|"]
    for rule in router_matrix.get("routing_rules", []):
        predicate = rule["predicate"]
        targets = " ".join(f"`{target}`" for target in rule.get("route_to", []))
        lines.append(f"| {predicate} | {targets} |")
    return "\n".join(lines)


def render_domain_skills_by_category(skills: list[dict[str, str]]) -> str:
    skills_by_category: dict[str, list[str]] = {}
    for entry in skills:
        if entry["phase"] != "domain" or entry["plugin_category"] in DOMAIN_CATEGORY_EXCLUSIONS:
            continue
        skills_by_category.setdefault(entry["plugin_category"], []).append(entry["skill_name"])

    lines: list[str] = []
    for category in CATEGORY_ORDER:
        skill_names = skills_by_category.get(category, [])
        if not skill_names:
            continue
        display_name = CATEGORY_DISPLAY_NAMES.get(category, category)
        rendered_names = ", ".join(f"`{name}`" for name in skill_names)
        lines.append(f"- **{display_name}**: {rendered_names}")

    known_categories = set(CATEGORY_ORDER)
    extra_categories = sorted(set(skills_by_category) - known_categories)
    for category in extra_categories:
        display_name = CATEGORY_DISPLAY_NAMES.get(category, category)
        rendered_names = ", ".join(f"`{name}`" for name in skills_by_category[category])
        lines.append(f"- **{display_name}**: {rendered_names}")

    return "\n".join(lines)


def _replace_generated_region(text: str, *, begin: str, end: str, body: str) -> tuple[str, list[str]]:
    pattern = re.compile(
        re.escape(begin) + r"\n.*?\n" + re.escape(end),
        flags=re.S,
    )
    if not pattern.search(text):
        return text, [f"Generated region markers `{begin}` / `{end}` not found."]

    replacement = f"{begin}\n{body}\n{end}"
    return pattern.sub(replacement, text, count=1), []


def sync_router_docs(*, check_mode: bool) -> int:
    errors: list[str] = []

    registry = load_registry(REGISTRY_PATH)
    skills, registry_errors = validate_registry(registry)
    errors.extend(registry_errors)

    router_matrix = load_router_matrix(ROUTER_MATRIX_PATH)

    reachability_errors = validate_router_reachability(skills, router_matrix)
    errors.extend(reachability_errors)

    if errors:
        print("sync_router_docs: validation failed", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1

    routing_table = render_routing_rules_table(router_matrix)
    domain_skills = render_domain_skills_by_category(skills)

    routing_matrix_text = ROUTING_MATRIX_DOC_PATH.read_text(encoding="utf-8")
    updated_routing_matrix_text, region_errors = _replace_generated_region(
        routing_matrix_text,
        begin=ROUTING_RULES_BEGIN,
        end=ROUTING_RULES_END,
        body=routing_table,
    )
    errors.extend(region_errors)

    full_audit_flow_text = FULL_AUDIT_FLOW_DOC_PATH.read_text(encoding="utf-8")
    updated_full_audit_flow_text, region_errors = _replace_generated_region(
        full_audit_flow_text,
        begin=DOMAIN_SKILLS_BEGIN,
        end=DOMAIN_SKILLS_END,
        body=domain_skills,
    )
    errors.extend(region_errors)

    if errors:
        print("sync_router_docs: validation failed", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1

    if check_mode:
        drift = False
        if updated_routing_matrix_text != routing_matrix_text:
            print(
                "sync_router_docs: drift detected in "
                f"{ROUTING_MATRIX_DOC_PATH.relative_to(REPO_ROOT).as_posix()}",
                file=sys.stderr,
            )
            drift = True
        if updated_full_audit_flow_text != full_audit_flow_text:
            print(
                "sync_router_docs: drift detected in "
                f"{FULL_AUDIT_FLOW_DOC_PATH.relative_to(REPO_ROOT).as_posix()}",
                file=sys.stderr,
            )
            drift = True

        if drift:
            return 1

        print(f"sync_router_docs: check passed for {len(skills)} skills")
        return 0

    if updated_routing_matrix_text != routing_matrix_text:
        ROUTING_MATRIX_DOC_PATH.write_text(updated_routing_matrix_text, encoding="utf-8")
    if updated_full_audit_flow_text != full_audit_flow_text:
        FULL_AUDIT_FLOW_DOC_PATH.write_text(updated_full_audit_flow_text, encoding="utf-8")

    print(f"sync_router_docs: synchronized generated regions for {len(skills)} skills")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate or check routing-matrix.md / full-audit-flow.md generated regions."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate generated regions instead of writing files.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    return sync_router_docs(check_mode=args.check)


if __name__ == "__main__":
    raise SystemExit(main())
