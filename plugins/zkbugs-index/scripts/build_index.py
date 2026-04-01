#!/usr/bin/env python3
"""
build_index.py — Build sharded indexes from upstream zkbugs repo and org findings.

Run once at install time, re-run with --rebuild when upstream updates.

Usage:
    python build_index.py --config ../config/zkbugs-sources.json
    python build_index.py --config ../config/zkbugs-sources.json --rebuild
    python build_index.py --upstream-path /local/path/to/zkbugs
    python build_index.py --diff-upstream
"""

import argparse
import json
import logging
import pathlib
import shutil
import sys
from datetime import datetime, timezone
from _shared import CANONICAL_VULN_TYPES, VULN_ALIASES, ensure_repo

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
DEFAULT_CONFIG = SCRIPT_DIR.parent / "config" / "zkbugs-sources.json"
DEFAULT_INDEX_DIR = SCRIPT_DIR.parent / "index"

def normalize_vuln_type(raw: str) -> str:
    """Normalize a vulnerability description to a canonical type key."""
    cleaned = raw.strip().lower()

    # Direct match against canonical types
    if cleaned.replace("-", "_").replace(" ", "_") in CANONICAL_VULN_TYPES:
        return cleaned.replace("-", "_").replace(" ", "_")

    # Alias lookup (exact)
    if cleaned in VULN_ALIASES:
        return VULN_ALIASES[cleaned]

    # Substring match
    for alias, canonical in VULN_ALIASES.items():
        if alias in cleaned or cleaned in alias:
            return canonical

    log.warning(f"Unknown vulnerability type: '{raw}' — mapped to 'unknown'")
    return "unknown"


def infer_severity(impact: str) -> str:
    """Infer severity from impact category (best-effort heuristic)."""
    impact_lower = impact.strip().lower() if impact else ""
    if "soundness" in impact_lower:
        return "Critical"
    if "privacy" in impact_lower:
        return "High"
    if "completeness" in impact_lower:
        return "Medium"
    if "dos" in impact_lower:
        return "Medium"
    return "Medium"


# ---------------------------------------------------------------------------
# Upstream ingestion
# ---------------------------------------------------------------------------

def ingest_upstream_entry(raw: dict, bug_key: str, source_file: str) -> dict | None:
    """Map a single zksecurity/zkbugs entry to our canonical schema."""
    required_fields = ["Id", "DSL", "Vulnerability", "Impact"]
    for field in required_fields:
        if field not in raw:
            log.warning(f"Skipping entry '{bug_key}' in {source_file}: missing '{field}'")
            return None

    # Flatten upstream Location dict {Path, Function, Line} into canonical strings
    raw_loc = raw.get("Location", "")
    if isinstance(raw_loc, dict):
        file_path = raw_loc.get("Path", "")
        line = raw_loc.get("Line", "") or None
        if line:
            try:
                line = int(line)
            except (ValueError, TypeError):
                line = None
    else:
        file_path = str(raw_loc)
        line = None

    # Flatten upstream Source dict into a source link string
    raw_src = raw.get("Source", "")
    if isinstance(raw_src, dict):
        # Source keys: "Audit Report", "Bug Tracker", "GitHub Security Advisory"
        # Each has {"Source Link": url, "Bug ID": id}
        for _src_type, src_val in raw_src.items():
            if isinstance(src_val, dict):
                raw_src = src_val.get("Source Link", "")
                break
            else:
                raw_src = str(src_val)
                break

    return {
        "id":               f"zkbugs/{raw['Id']}",
        "dsl":              raw["DSL"].strip().lower(),
        "vuln_type":        normalize_vuln_type(raw["Vulnerability"]),
        "impact":           raw.get("Impact", ""),
        "severity":         infer_severity(raw.get("Impact", "")),
        "root_cause":       raw.get("Root Cause", ""),
        "location": {
            "repo":         raw_src,
            "commit":       raw.get("Commit"),
            "file":         file_path,
            "line":         line,
        },
        "reproduced":       raw.get("Reproduced", False),
        "poc_available":    raw.get("Reproduced", False),
        "fix_commit":       raw.get("Fix Commit"),
        "disclosure_state": "disclosed",
        "source":           "upstream",
        "upstream":         True,
        "added_at":         None,
    }


def parse_upstream_repo(repo_path: pathlib.Path, entry_glob: str,
                        exclude_paths: list[str]) -> list[dict]:
    """Walk the upstream repo and extract all bug entries."""
    bugs = []
    exclude_set = set(exclude_paths)

    for json_file in sorted(repo_path.rglob(entry_glob)):
        # Skip excluded paths
        rel = json_file.relative_to(repo_path)
        if any(part in exclude_set for part in rel.parts):
            continue

        try:
            with open(json_file) as f:
                data = json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            log.warning(f"Skipping {json_file}: {e}")
            continue

        # The upstream format: top-level keys are bug names, values are bug objects
        if isinstance(data, dict):
            # Check if this looks like a bug entry (has expected fields) or a container
            if "Id" in data and "DSL" in data:
                # Single entry at top level
                entry = ingest_upstream_entry(data, data.get("Id", json_file.stem), str(rel))
                if entry:
                    bugs.append(entry)
            else:
                # Container: keys are bug names
                for bug_key, bug_data in data.items():
                    if not isinstance(bug_data, dict):
                        continue
                    if "Id" not in bug_data and "DSL" not in bug_data:
                        continue
                    entry = ingest_upstream_entry(bug_data, bug_key, str(rel))
                    if entry:
                        bugs.append(entry)

        elif isinstance(data, list):
            for i, item in enumerate(data):
                if isinstance(item, dict):
                    entry = ingest_upstream_entry(item, f"{json_file.stem}_{i}", str(rel))
                    if entry:
                        bugs.append(entry)

    return bugs


# ---------------------------------------------------------------------------
# Local/org findings ingestion
# ---------------------------------------------------------------------------

def load_local_findings(index_dir: pathlib.Path) -> list[dict]:
    """Load findings from local_findings/ directory."""
    local_dir = index_dir / "local_findings"
    findings = []
    if not local_dir.exists():
        return findings

    for json_file in sorted(local_dir.glob("*.json")):
        if json_file.name == ".gitkeep":
            continue
        try:
            with open(json_file) as f:
                data = json.load(f)
            if isinstance(data, list):
                findings.extend(data)
            elif isinstance(data, dict):
                findings.append(data)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            log.warning(f"Skipping local finding {json_file}: {e}")

    return findings


def ingest_org_entry(raw: dict, source_file: str) -> dict | None:
    """Validate and normalize a canonical org finding entry."""
    required_fields = ["id", "dsl", "vuln_type", "impact", "severity", "root_cause"]
    for field in required_fields:
        if field not in raw:
            log.warning(f"Skipping org finding '{source_file}': missing '{field}'")
            return None

    entry = dict(raw)
    entry["dsl"] = str(entry["dsl"]).strip().lower()
    entry["vuln_type"] = normalize_vuln_type(str(entry["vuln_type"]))
    entry["source"] = "org"
    entry["upstream"] = False
    return entry


def parse_org_repo(repo_path: pathlib.Path) -> list[dict]:
    """Walk the org findings repo and extract canonical findings."""
    findings = []
    for json_file in sorted(repo_path.rglob("*.json")):
        if ".git" in json_file.parts:
            continue
        try:
            with open(json_file) as f:
                data = json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            log.warning(f"Skipping org finding {json_file}: {e}")
            continue

        rel = str(json_file.relative_to(repo_path))
        if isinstance(data, dict):
            entry = ingest_org_entry(data, rel)
            if entry:
                findings.append(entry)
        elif isinstance(data, list):
            for i, item in enumerate(data):
                if not isinstance(item, dict):
                    continue
                entry = ingest_org_entry(item, f"{rel}#{i}")
                if entry:
                    findings.append(entry)

    return findings


# ---------------------------------------------------------------------------
# Index building
# ---------------------------------------------------------------------------

def build_sharded_index(bugs: list[dict], index_dir: pathlib.Path):
    """Build by_dsl/ and by_vuln_type/ sharded JSON files."""
    by_dsl: dict[str, list[dict]] = {}
    by_vuln: dict[str, list[dict]] = {}

    for bug in bugs:
        dsl = bug.get("dsl", "unknown")
        vuln = bug.get("vuln_type", "unknown")
        by_dsl.setdefault(dsl, []).append(bug)
        by_vuln.setdefault(vuln, []).append(bug)

    # Write DSL shards
    dsl_dir = index_dir / "by_dsl"
    dsl_dir.mkdir(parents=True, exist_ok=True)
    for dsl, entries in by_dsl.items():
        with open(dsl_dir / f"{dsl}.json", "w") as f:
            json.dump(entries, f, indent=2)

    # Write vuln type shards
    vuln_dir = index_dir / "by_vuln_type"
    vuln_dir.mkdir(parents=True, exist_ok=True)
    for vuln, entries in by_vuln.items():
        with open(vuln_dir / f"{vuln}.json", "w") as f:
            json.dump(entries, f, indent=2)

    # Write manifest
    dsl_counts = {k: len(v) for k, v in sorted(by_dsl.items())}
    vuln_counts = {k: len(v) for k, v in sorted(by_vuln.items())}
    upstream_count = sum(1 for b in bugs if b.get("upstream"))
    org_count = sum(1 for b in bugs if not b.get("upstream"))

    manifest = {
        "count":          len(bugs),
        "upstream_count": upstream_count,
        "org_count":      org_count,
        "schema_version": "1.0",
        "built_at":       datetime.now(timezone.utc).isoformat(),
        "by_dsl":         dsl_counts,
        "by_vuln_type":   vuln_counts,
    }
    with open(index_dir / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)

    log.info(f"Index built: {len(bugs)} entries ({upstream_count} upstream, {org_count} org)")
    log.info(f"  DSLs: {dsl_counts}")
    log.info(f"  Vuln types: {vuln_counts}")


def save_upstream_snapshot(bugs: list[dict], index_dir: pathlib.Path):
    """Save raw upstream entries for diff-upstream comparisons."""
    snapshot_dir = index_dir / "upstream_raw"
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    upstream_only = [b for b in bugs if b.get("upstream")]
    with open(snapshot_dir / "zkbugs_snapshot.json", "w") as f:
        json.dump(upstream_only, f, indent=2)


def build_embeddings(bugs: list[dict], index_dir: pathlib.Path, model_name: str):
    """Build embedding index for semantic search (optional)."""
    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np
    except ImportError:
        log.warning("sentence-transformers not installed — skipping embeddings. "
                    "Install with: pip install sentence-transformers numpy")
        return

    log.info(f"Building embeddings with {model_name}...")
    model = SentenceTransformer(model_name)

    texts = [
        f"[{b['dsl']}] [{b['vuln_type']}] {b['root_cause']}"
        for b in bugs
    ]
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=True)

    np.save(str(index_dir / "embeddings.npy"), embeddings)
    with open(index_dir / "embedding_ids.json", "w") as f:
        json.dump([b["id"] for b in bugs], f, indent=2)

    log.info(f"Embeddings built: {len(texts)} entries")


# ---------------------------------------------------------------------------
# Diff upstream
# ---------------------------------------------------------------------------

def diff_upstream(repo_path: pathlib.Path, index_dir: pathlib.Path,
                  entry_glob: str, exclude_paths: list[str]):
    """Show entries in upstream that are not in the current snapshot."""
    snapshot_file = index_dir / "upstream_raw" / "zkbugs_snapshot.json"
    if not snapshot_file.exists():
        log.error("No upstream snapshot found. Run --rebuild first.")
        sys.exit(1)

    with open(snapshot_file) as f:
        existing = json.load(f)
    existing_ids = {e["id"] for e in existing}

    current = parse_upstream_repo(repo_path, entry_glob, exclude_paths)
    current_ids = {e["id"] for e in current}

    new_ids = current_ids - existing_ids
    removed_ids = existing_ids - current_ids

    if new_ids:
        print(f"\n  {len(new_ids)} NEW entries in upstream:")
        for bug in current:
            if bug["id"] in new_ids:
                print(f"    + {bug['id']} [{bug['dsl']}] {bug['vuln_type']}: "
                      f"{bug['root_cause'][:60]}...")
    if removed_ids:
        print(f"\n  {len(removed_ids)} entries REMOVED from upstream:")
        for rid in sorted(removed_ids):
            print(f"    - {rid}")
    if not new_ids and not removed_ids:
        print("\n  Index is current with upstream.")

    if new_ids:
        print(f"\nRun: python build_index.py --rebuild  to incorporate changes.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def load_config(config_path: pathlib.Path) -> dict:
    """Load and validate config file."""
    if not config_path.exists():
        log.error(f"Config not found: {config_path}")
        log.error("Copy config/zkbugs-sources.json and set your repo URLs.")
        sys.exit(1)

    with open(config_path) as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description="Build zkbugs-index from upstream repo and org findings")
    parser.add_argument("--config", type=pathlib.Path, default=DEFAULT_CONFIG,
                        help="Path to zkbugs-sources.json")
    parser.add_argument("--upstream-path", type=pathlib.Path, default=None,
                        help="Override: local path to upstream repo (skip clone)")
    parser.add_argument("--index-dir", type=pathlib.Path, default=None,
                        help="Override: output index directory")
    parser.add_argument("--rebuild", action="store_true",
                        help="Rebuild index (re-ingests upstream, preserves local findings)")
    parser.add_argument("--diff-upstream", action="store_true",
                        help="Show new entries in upstream since last build")
    parser.add_argument("--no-embeddings", action="store_true",
                        help="Skip building embeddings even if enabled in config")
    args = parser.parse_args()

    config = load_config(args.config)
    upstream_cfg = config.get("upstream", {})
    org_cfg = config.get("org", {})
    index_dir = pathlib.Path(args.index_dir or config.get("index_dir", DEFAULT_INDEX_DIR))
    if not index_dir.is_absolute():
        index_dir = (SCRIPT_DIR.parent / index_dir).resolve()
    cache_dir = (SCRIPT_DIR.parent / config.get("cache_dir", ".cache")).resolve()
    semantic_cfg = config.get("semantic_search", {})

    entry_glob = upstream_cfg.get("entry_glob", "**/*.json")
    exclude_paths = upstream_cfg.get("exclude_paths", [])

    # Resolve upstream repo
    upstream_path = args.upstream_path
    if upstream_path is None:
        upstream_path = ensure_repo(
            upstream_cfg.get("repo_url"),
            upstream_cfg.get("local_path"),
            upstream_cfg.get("branch", "main"),
            cache_dir,
            logger=log,
        )

    if upstream_path is None:
        log.error("No upstream repo available. Set upstream.repo_url or --upstream-path.")
        sys.exit(1)

    # Diff mode
    if args.diff_upstream:
        diff_upstream(upstream_path, index_dir, entry_glob, exclude_paths)
        return

    # Parse upstream
    log.info(f"Parsing upstream repo at {upstream_path}...")
    upstream_bugs = parse_upstream_repo(upstream_path, entry_glob, exclude_paths)
    log.info(f"Found {len(upstream_bugs)} upstream entries")

    org_findings = []
    org_path = ensure_repo(
        org_cfg.get("repo_url"),
        org_cfg.get("local_path"),
        org_cfg.get("branch", "main"),
        cache_dir,
        logger=log,
    )
    if org_path is not None:
        log.info(f"Parsing org findings repo at {org_path}...")
        org_findings = parse_org_repo(org_path)
        log.info(f"Found {len(org_findings)} org entries")
    elif org_cfg.get("repo_url") or org_cfg.get("local_path"):
        log.warning("Org findings repo configured but unavailable; continuing without it")

    # Load local findings (preserved across rebuilds)
    local_findings = load_local_findings(index_dir)
    if local_findings:
        log.info(f"Loaded {len(local_findings)} local/org findings")

    # Merge
    all_bugs = upstream_bugs + org_findings + local_findings

    # Deduplicate by ID (local findings take precedence)
    seen_ids: dict[str, dict] = {}
    for bug in all_bugs:
        bug_id = bug.get("id", "")
        if bug_id in seen_ids and not bug.get("upstream"):
            # Local finding overrides upstream
            seen_ids[bug_id] = bug
        elif bug_id not in seen_ids:
            seen_ids[bug_id] = bug
    all_bugs = list(seen_ids.values())

    # Clean existing shard files before rebuild (but not local_findings/)
    if args.rebuild:
        for subdir in ["by_dsl", "by_vuln_type"]:
            shard_dir = index_dir / subdir
            if shard_dir.exists():
                shutil.rmtree(shard_dir)

    # Build index
    build_sharded_index(all_bugs, index_dir)
    save_upstream_snapshot(upstream_bugs, index_dir)

    # Build embeddings (optional)
    if semantic_cfg.get("enabled") and not args.no_embeddings:
        build_embeddings(all_bugs, index_dir, semantic_cfg.get("model", "all-MiniLM-L6-v2"))

    log.info("Done.")


if __name__ == "__main__":
    main()
