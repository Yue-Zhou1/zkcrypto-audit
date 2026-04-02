#!/usr/bin/env python3
"""
contribute_bug.py — Write new findings to the zkbugs-index and manage disclosure lifecycle.

Usage:
    # Add a new finding (defaults to under_embargo)
    python contribute_bug.py \\
        --dsl circom --vuln under_constrained --impact Soundness --severity Critical \\
        --root-cause "Signal X assigned with <-- but constrained on different variable Y" \\
        --repo "https://github.com/target/project" --commit abc123 \\
        --file circuits/foo.circom --line 42 \\
        --engagement "client-slug" --found-by zk-circuit-auditor

    # Promote a finding
    python contribute_bug.py --id local/circom/client-slug/signal-x-under-constrained --promote reported
    python contribute_bug.py --id org/circom/client-slug/signal-x-under-constrained --promote fixed --fix-commit def456
    python contribute_bug.py --id org/circom/client-slug/signal-x-under-constrained --promote disclosed --fix-commit def456 --disclose

    # List local findings
    python contribute_bug.py --list
    python contribute_bug.py --list --state under_embargo
"""

import argparse
import json
import pathlib
import re
import sys
from datetime import datetime, timezone
from _shared import CANONICAL_VULN_TYPES, ensure_repo

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
DEFAULT_CONFIG = SCRIPT_DIR.parent / "config" / "zkbugs-sources.json"
DEFAULT_INDEX_DIR = SCRIPT_DIR.parent / "index"

VALID_IMPACTS = {"Soundness", "Completeness", "Privacy", "DoS"}
VALID_SEVERITIES = {"Critical", "High", "Medium", "Low", "Informational"}
VALID_STATES = {"under_embargo", "reported", "fixed", "disclosed", "coordinated"}

# Valid state transitions: current_state -> set of allowed next states
STATE_TRANSITIONS = {
    "under_embargo": {"reported"},
    "reported":      {"fixed", "coordinated"},
    "fixed":         {"disclosed", "coordinated"},
    "coordinated":   {"disclosed"},
    "disclosed":     set(),  # terminal
}


def load_config(config_path: pathlib.Path) -> dict:
    if not config_path.exists():
        return {}
    with open(config_path) as f:
        return json.load(f)


def resolve_index_dir(config_path: pathlib.Path) -> pathlib.Path:
    config = load_config(config_path)
    if config:
        idx = config.get("index_dir", "./index")
        p = pathlib.Path(idx)
        return p if p.is_absolute() else (SCRIPT_DIR.parent / p).resolve()
    return DEFAULT_INDEX_DIR


def resolve_configured_path(path_value: str | None, fallback: pathlib.Path) -> pathlib.Path:
    if not path_value:
        return fallback.resolve()
    path = pathlib.Path(path_value)
    return path if path.is_absolute() else (SCRIPT_DIR.parent / path).resolve()


def resolve_org_repo(config_path: pathlib.Path) -> pathlib.Path | None:
    config = load_config(config_path)
    org_cfg = config.get("org", {})
    cache_dir = resolve_configured_path(config.get("cache_dir"), SCRIPT_DIR.parent / ".cache")
    return ensure_repo(
        org_cfg.get("repo_url"),
        org_cfg.get("local_path"),
        org_cfg.get("branch", "main"),
        cache_dir,
    )


def org_repo_configured(config_path: pathlib.Path) -> bool:
    config = load_config(config_path)
    org_cfg = config.get("org", {})
    return bool(org_cfg.get("repo_url") or org_cfg.get("local_path"))


def slugify(text: str) -> str:
    """Create a URL-safe slug from text."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:60].rstrip("-")


# ---------------------------------------------------------------------------
# Local findings storage
# ---------------------------------------------------------------------------

def load_local_findings(index_dir: pathlib.Path) -> list[dict]:
    """Load all local findings."""
    path = index_dir / "local_findings" / "findings.json"
    if not path.exists():
        return []
    with open(path) as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def save_local_findings(findings: list[dict], index_dir: pathlib.Path):
    """Save local findings back to disk."""
    path = index_dir / "local_findings" / "findings.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(findings, f, indent=2)


def org_entry_path(org_repo_dir: pathlib.Path, entry_id: str) -> pathlib.Path:
    parts = entry_id.split("/", 3)
    if len(parts) != 4 or parts[0] != "org":
        raise ValueError(f"Unsupported org entry id format: {entry_id}")
    _, dsl, engagement_slug, finding_slug = parts
    return org_repo_dir / "findings" / dsl / engagement_slug / f"{finding_slug}.json"


def load_org_findings(org_repo_dir: pathlib.Path) -> list[dict]:
    findings = []
    for json_file in sorted(org_repo_dir.rglob("*.json")):
        if ".git" in json_file.parts:
            continue
        try:
            with open(json_file) as f:
                data = json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
        if isinstance(data, dict) and "id" in data and "dsl" in data:
            findings.append(data)
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and "id" in item and "dsl" in item:
                    findings.append(item)
    return findings


def save_org_finding(entry: dict, org_repo_dir: pathlib.Path):
    path = org_entry_path(org_repo_dir, entry["id"])
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(entry, f, indent=2)


def delete_org_finding(entry_id: str, org_repo_dir: pathlib.Path):
    path = org_entry_path(org_repo_dir, entry_id)
    if path.exists():
        path.unlink()


def find_org_finding(entry_id: str, org_repo_dir: pathlib.Path) -> tuple[dict | None, pathlib.Path | None]:
    derived_path = org_entry_path(org_repo_dir, entry_id)
    if derived_path.exists():
        with open(derived_path) as f:
            return json.load(f), derived_path

    for json_file in sorted(org_repo_dir.rglob("*.json")):
        if ".git" in json_file.parts:
            continue
        try:
            with open(json_file) as f:
                data = json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
        if isinstance(data, dict) and data.get("id") == entry_id:
            return data, json_file

    return None, None


def update_shard(shard_path: pathlib.Path, entry: dict):
    """Add or update an entry in a shard file."""
    existing = []
    if shard_path.exists():
        with open(shard_path) as f:
            existing = json.load(f)

    # Replace if same ID exists, otherwise append
    found = False
    for i, e in enumerate(existing):
        if e.get("id") == entry["id"]:
            existing[i] = entry
            found = True
            break
    if not found:
        existing.append(entry)

    shard_path.parent.mkdir(parents=True, exist_ok=True)
    with open(shard_path, "w") as f:
        json.dump(existing, f, indent=2)


def remove_from_shard(shard_path: pathlib.Path, entry_id: str):
    """Remove an entry from a shard file by ID."""
    if not shard_path.exists():
        return
    with open(shard_path) as f:
        existing = json.load(f)
    existing = [e for e in existing if e.get("id") != entry_id]
    with open(shard_path, "w") as f:
        json.dump(existing, f, indent=2)


# ---------------------------------------------------------------------------
# Create new finding
# ---------------------------------------------------------------------------

def create_finding(args, index_dir: pathlib.Path):
    """Create a new finding and store it."""
    # Validate inputs
    vuln = args.vuln.lower().replace("-", "_").replace(" ", "_")
    if vuln not in CANONICAL_VULN_TYPES:
        print(f"ERROR: Unknown vuln type '{args.vuln}'. See VULN-TAXONOMY.md", file=sys.stderr)
        print(f"       Valid types: {sorted(CANONICAL_VULN_TYPES)}", file=sys.stderr)
        sys.exit(1)

    if args.impact and args.impact not in VALID_IMPACTS:
        print(f"ERROR: Invalid impact '{args.impact}'. Must be one of: {VALID_IMPACTS}", file=sys.stderr)
        sys.exit(1)

    if args.severity and args.severity not in VALID_SEVERITIES:
        print(f"ERROR: Invalid severity '{args.severity}'. Must be one of: {VALID_SEVERITIES}", file=sys.stderr)
        sys.exit(1)

    state = args.state or "under_embargo"
    if state not in VALID_STATES:
        print(f"ERROR: Invalid state '{state}'. Must be one of: {VALID_STATES}", file=sys.stderr)
        sys.exit(1)

    # Generate ID
    engagement_slug = slugify(args.engagement) if args.engagement else "untagged"
    cause_slug = slugify(args.root_cause[:40])
    use_org_repo = state != "under_embargo" and org_repo_configured(args.config)
    namespace = "org" if use_org_repo else "local"
    entry_id = f"{namespace}/{args.dsl.lower()}/{engagement_slug}/{cause_slug}"

    # Check for duplicate
    findings = load_local_findings(index_dir)
    for f in findings:
        if f.get("id") == entry_id:
            print(f"ERROR: Entry with ID '{entry_id}' already exists.", file=sys.stderr)
            print(f"       Use --promote to update state, or change --root-cause for a different slug.", file=sys.stderr)
            sys.exit(1)
    if use_org_repo:
        org_repo_dir = resolve_org_repo(args.config)
        if org_repo_dir is None:
            print("ERROR: org repo is configured but unavailable.", file=sys.stderr)
            sys.exit(1)
        existing_org_entry, _ = find_org_finding(entry_id, org_repo_dir)
        if existing_org_entry is not None:
            print(f"ERROR: Entry with ID '{entry_id}' already exists in the org repo.", file=sys.stderr)
            sys.exit(1)

    entry = {
        "id":               entry_id,
        "dsl":              args.dsl.lower(),
        "vuln_type":        vuln,
        "impact":           args.impact or "",
        "severity":         args.severity or "Medium",
        "root_cause":       args.root_cause,
        "location": {
            "repo":         args.repo or "",
            "commit":       args.commit or None,
            "file":         args.file or "",
            "line":         args.line or None,
        },
        "reproduced":       args.poc or False,
        "poc_available":    args.poc or False,
        "fix_commit":       None,
        "disclosure_state": state,
        "engagement":       args.engagement or "",
        "found_by":         args.found_by or "manual",
        "source":           "org",
        "upstream":         False,
        "added_at":         datetime.now(timezone.utc).isoformat(),
        "disclosed_at":     None,
        "notes":            args.notes or "",
    }

    if use_org_repo:
        save_org_finding(entry, org_repo_dir)
    else:
        findings.append(entry)
        save_local_findings(findings, index_dir)

    # If not under_embargo, also insert into shard indexes for queryability
    if state != "under_embargo":
        update_shard(index_dir / "by_dsl" / f"{entry['dsl']}.json", entry)
        update_shard(index_dir / "by_vuln_type" / f"{entry['vuln_type']}.json", entry)

    print(f"Created: {entry_id}")
    print(f"  State: {state}")
    if state == "under_embargo":
        print(f"  Stored in local_findings/ only (not queryable by others)")
    elif use_org_repo:
        print(f"  Stored in org findings repo and shard indexes")
    else:
        print(f"  Inserted into shard indexes (queryable)")


# ---------------------------------------------------------------------------
# Promote finding
# ---------------------------------------------------------------------------

def promote_finding(args, index_dir: pathlib.Path):
    """Promote a finding to a new disclosure state."""
    org_repo_dir = resolve_org_repo(args.config) if org_repo_configured(args.config) else None
    findings = load_local_findings(index_dir)
    target = None
    target_idx = None
    target_storage = None

    for i, f in enumerate(findings):
        if f.get("id") == args.id:
            target = f
            target_idx = i
            target_storage = "local"
            break

    if target is None and args.id.startswith("org/"):
        if org_repo_dir is None:
            print("ERROR: org repo entry requested but no org repo is available.", file=sys.stderr)
            sys.exit(1)
        target, _ = find_org_finding(args.id, org_repo_dir)
        if target is not None:
            target_storage = "org"

    if target is None:
        print(f"ERROR: Entry not found: {args.id}", file=sys.stderr)
        print(f"       Use --list to see available entries.", file=sys.stderr)
        sys.exit(1)

    if target.get("upstream"):
        print(f"ERROR: Cannot promote upstream entries. Only org/local findings can be promoted.", file=sys.stderr)
        sys.exit(1)

    current_state = target.get("disclosure_state", "under_embargo")
    new_state = args.promote
    previous_id = target["id"]
    previous_dsl = target["dsl"]
    previous_vuln_type = target["vuln_type"]

    # Validate transition
    allowed = STATE_TRANSITIONS.get(current_state, set())
    if new_state not in allowed:
        print(f"ERROR: Cannot transition from '{current_state}' to '{new_state}'.", file=sys.stderr)
        print(f"       Allowed transitions: {current_state} → {allowed or 'none (terminal)'}", file=sys.stderr)
        sys.exit(1)

    # State-specific validations
    if new_state == "fixed":
        if not args.fix_commit:
            print(f"ERROR: --fix-commit required to promote to 'fixed'.", file=sys.stderr)
            sys.exit(1)
        target["fix_commit"] = args.fix_commit

    if new_state == "disclosed":
        if not args.disclose:
            print(f"ERROR: --disclose flag required to promote to 'disclosed'.", file=sys.stderr)
            print(f"       This is a safety gate. Disclosed findings become public.", file=sys.stderr)
            sys.exit(1)
        if not target.get("fix_commit") and not args.fix_commit:
            print(f"ERROR: fix_commit must be set before disclosure.", file=sys.stderr)
            sys.exit(1)
        if args.fix_commit:
            target["fix_commit"] = args.fix_commit

        # Redaction
        target["disclosed_at"] = datetime.now(timezone.utc).isoformat()
        if args.public_notes is not None:
            target["public_notes"] = args.public_notes
            target.pop("notes", None)
        else:
            print("WARNING: No --public-notes provided. Private notes will be removed on disclosure.", file=sys.stderr)
            print("         Re-run with --public-notes to add a public description.", file=sys.stderr)
            target.pop("notes", None)
        # Redact engagement for public entry
        target.pop("engagement", None)
        if isinstance(target.get("location"), dict) and not args.public_repo:
            target["location"].pop("repo", None)

    if new_state == "coordinated":
        if not args.justification:
            print(f"ERROR: --justification required for coordinated embargo.", file=sys.stderr)
            sys.exit(1)
        target["coordinated_justification"] = args.justification
        target["coordinated_at"] = datetime.now(timezone.utc).isoformat()

    # Apply state change
    target["disclosure_state"] = new_state
    if current_state == "under_embargo" and new_state == "reported" and org_repo_dir is not None and target_storage == "local":
        target["id"] = "org/" + previous_id[len("local/"):]
        findings.pop(target_idx)
        save_local_findings(findings, index_dir)
        save_org_finding(target, org_repo_dir)
        target_storage = "org"
    elif target_storage == "local":
        findings[target_idx] = target
        save_local_findings(findings, index_dir)
    elif target_storage == "org":
        if org_repo_dir is None:
            print("ERROR: org repo became unavailable during promotion.", file=sys.stderr)
            sys.exit(1)
        save_org_finding(target, org_repo_dir)

    # Update shard indexes
    # under_embargo entries are NOT in shards; all other states are
    if previous_id != target["id"]:
        remove_from_shard(index_dir / "by_dsl" / f"{previous_dsl}.json", previous_id)
        remove_from_shard(index_dir / "by_vuln_type" / f"{previous_vuln_type}.json", previous_id)
    if current_state == "under_embargo" and new_state != "under_embargo":
        # First time entering shards
        update_shard(index_dir / "by_dsl" / f"{target['dsl']}.json", target)
        update_shard(index_dir / "by_vuln_type" / f"{target['vuln_type']}.json", target)
    elif new_state != "under_embargo":
        # Update existing shard entries
        update_shard(index_dir / "by_dsl" / f"{target['dsl']}.json", target)
        update_shard(index_dir / "by_vuln_type" / f"{target['vuln_type']}.json", target)

    if previous_id != target["id"]:
        print(f"Promoted: {previous_id} -> {target['id']}")
    else:
        print(f"Promoted: {args.id}")
    print(f"  {current_state} → {new_state}")
    if new_state == "disclosed":
        print(f"  Entry is now PUBLIC and citable in reports.")


# ---------------------------------------------------------------------------
# List findings
# ---------------------------------------------------------------------------

def list_findings(args, index_dir: pathlib.Path):
    """List local/org findings."""
    findings = load_local_findings(index_dir)
    org_repo_dir = resolve_org_repo(args.config) if org_repo_configured(args.config) else None
    if org_repo_dir is not None:
        findings.extend(load_org_findings(org_repo_dir))

    if args.state:
        findings = [f for f in findings if f.get("disclosure_state") == args.state]
    if args.dsl:
        findings = [f for f in findings if f.get("dsl") == args.dsl.lower()]

    if not findings:
        print("No findings found.")
        return

    print(f"\n  {len(findings)} finding(s):\n")
    for f in findings:
        state = f.get("disclosure_state", "?")
        severity = f.get("severity", "?")
        root = f.get("root_cause", "")[:80]
        print(f"  [{severity:>12}] [{state:>14}] {f.get('id', '?')}")
        print(f"               {f.get('dsl', '?')} | {f.get('vuln_type', '?')} | {root}")
        print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Add findings to zkbugs-index and manage disclosure lifecycle",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # -- Global options --
    parser.add_argument("--config", type=pathlib.Path, default=DEFAULT_CONFIG)
    parser.add_argument("--index-dir", type=pathlib.Path, default=None)

    # -- Create mode (default when --dsl is provided) --
    parser.add_argument("--dsl", type=str, help="DSL of the finding")
    parser.add_argument("--vuln", type=str, help="Vulnerability type (see VULN-TAXONOMY.md)")
    parser.add_argument("--impact", type=str, help="Impact: Soundness, Completeness, Privacy, DoS")
    parser.add_argument("--severity", type=str, help="Severity: Critical, High, Medium, Low, Informational")
    parser.add_argument("--root-cause", type=str, help="Root cause description")
    parser.add_argument("--repo", type=str, help="Target repository URL")
    parser.add_argument("--commit", type=str, help="Vulnerable commit SHA")
    parser.add_argument("--file", type=str, help="File path within the target repo")
    parser.add_argument("--line", type=str, help="Line number or range")
    parser.add_argument("--engagement", type=str, help="Engagement/project slug (internal)")
    parser.add_argument("--found-by", type=str, help="Tool or auditor that found this")
    parser.add_argument("--state", type=str, default="under_embargo",
                        help="Initial disclosure state (default: under_embargo)")
    parser.add_argument("--poc", action="store_true", help="PoC is available")
    parser.add_argument("--notes", type=str, help="Internal auditor notes")

    # -- Promote mode --
    parser.add_argument("--id", type=str, help="Entry ID to promote")
    parser.add_argument("--promote", type=str, help="New disclosure state")
    parser.add_argument("--fix-commit", type=str, help="Fix commit SHA (required for fixed/disclosed)")
    parser.add_argument("--disclose", action="store_true",
                        help="Safety gate: required to promote to disclosed")
    parser.add_argument("--justification", type=str,
                        help="Justification for coordinated embargo")
    parser.add_argument("--public-notes", type=str,
                        help="Public notes (replaces private notes on disclosure)")
    parser.add_argument("--public-repo", action="store_true",
                        help="Keep location.repo on disclosure because the target project is public")

    # -- List mode --
    parser.add_argument("--list", action="store_true", help="List local findings")

    args = parser.parse_args()

    # Resolve index dir
    if args.index_dir:
        index_dir = args.index_dir if args.index_dir.is_absolute() else (SCRIPT_DIR.parent / args.index_dir).resolve()
    else:
        index_dir = resolve_index_dir(args.config)

    # Route to the right handler
    if args.list:
        list_findings(args, index_dir)
    elif args.id and args.promote:
        promote_finding(args, index_dir)
    elif args.dsl and args.vuln and args.root_cause:
        create_finding(args, index_dir)
    else:
        parser.print_help()
        print("\nModes:")
        print("  Create:  --dsl X --vuln Y --root-cause Z [options]")
        print("  Promote: --id X --promote STATE [--fix-commit, --disclose, --justification]")
        print("  List:    --list [--state STATE] [--dsl DSL]")
        sys.exit(1)


if __name__ == "__main__":
    main()
