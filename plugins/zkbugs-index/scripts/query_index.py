#!/usr/bin/env python3
"""
query_index.py — Fast lookup against the zkbugs sharded index.

Usage:
    python query_index.py --dsl circom --vuln under_constrained --limit 5
    python query_index.py --keyword "assigned but not constrained" --limit 3
    python query_index.py --similar "polynomial commitment missing degree check" --dsl halo2
    python query_index.py --source org --citable --format json
    python query_index.py --id zkbugs/iden3/circomlib/some-bug
    python query_index.py --stats
"""

import argparse
import json
import pathlib
import sys

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
DEFAULT_CONFIG = SCRIPT_DIR.parent / "config" / "config.json"
DEFAULT_INDEX_DIR = SCRIPT_DIR.parent / "index"


def resolve_index_dir(args_index_dir: pathlib.Path | None, config_path: pathlib.Path) -> pathlib.Path:
    """Resolve the index directory from args or config."""
    if args_index_dir:
        p = pathlib.Path(args_index_dir)
        return p if p.is_absolute() else (SCRIPT_DIR.parent / p).resolve()

    if config_path.exists():
        with open(config_path) as f:
            config = json.load(f)
        idx = config.get("index_dir", "./index")
        p = pathlib.Path(idx)
        return p if p.is_absolute() else (SCRIPT_DIR.parent / p).resolve()

    return DEFAULT_INDEX_DIR


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------

def load_shard(index_dir: pathlib.Path, shard_type: str, key: str) -> list[dict]:
    """Load a single shard file. Returns empty list if not found."""
    path = index_dir / shard_type / f"{key}.json"
    if not path.exists():
        return []
    with open(path) as f:
        return json.load(f)


def load_all_entries(index_dir: pathlib.Path) -> list[dict]:
    """Load all entries from all DSL shards (fallback for unfiltered queries)."""
    entries = []
    dsl_dir = index_dir / "by_dsl"
    if not dsl_dir.exists():
        return entries
    for shard_file in sorted(dsl_dir.glob("*.json")):
        with open(shard_file) as f:
            entries.extend(json.load(f))
    return entries


def load_entry_by_id(entry_id: str, index_dir: pathlib.Path) -> dict | None:
    """Find a specific entry by ID across all shards."""
    for entry in load_all_entries(index_dir):
        if entry.get("id") == entry_id:
            return entry
    return None


# ---------------------------------------------------------------------------
# Filtering
# ---------------------------------------------------------------------------

def apply_filters(candidates: list[dict], *,
                  keyword: str | None = None,
                  source: str | None = None,
                  citable: bool = False) -> list[dict]:
    """Apply keyword, source, and citable filters to a candidate list."""
    results = candidates

    # Source filter
    if source == "upstream":
        results = [c for c in results if c.get("upstream")]
    elif source == "org":
        results = [c for c in results if not c.get("upstream")]

    # Citable: only disclosed entries
    if citable:
        results = [c for c in results if c.get("disclosure_state") == "disclosed"]

    # Keyword filter on root_cause
    if keyword:
        kw_lower = keyword.lower()
        results = [c for c in results if kw_lower in c.get("root_cause", "").lower()]

    return results


def rank_results(results: list[dict]) -> list[dict]:
    """Sort results by relevance: reproduced first, then soundness impact, then severity."""
    severity_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3, "Informational": 4}
    return sorted(results, key=lambda x: (
        not x.get("reproduced", False),
        x.get("impact", "") != "Soundness",
        severity_order.get(x.get("severity", "Medium"), 2),
    ))


# ---------------------------------------------------------------------------
# Semantic search
# ---------------------------------------------------------------------------

def query_similar(description: str, index_dir: pathlib.Path,
                  dsl: str | None = None, limit: int = 5) -> list[dict]:
    """Find bugs with similar root cause via embedding similarity."""
    embeddings_path = index_dir / "embeddings.npy"
    ids_path = index_dir / "embedding_ids.json"

    if not embeddings_path.exists() or not ids_path.exists():
        print("ERROR: Embeddings not built. Run: python build_index.py --rebuild",
              file=sys.stderr)
        print("       (with semantic_search.enabled = true in config.json)", file=sys.stderr)
        sys.exit(1)

    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np
    except ImportError:
        print("ERROR: sentence-transformers required for --similar queries.", file=sys.stderr)
        print("       Install: pip install sentence-transformers numpy", file=sys.stderr)
        sys.exit(1)

    # Load config model name
    config_path = SCRIPT_DIR.parent / "config" / "config.json"
    model_name = "all-MiniLM-L6-v2"
    if config_path.exists():
        with open(config_path) as f:
            cfg = json.load(f)
        model_name = cfg.get("semantic_search", {}).get("model", model_name)

    model = SentenceTransformer(model_name)
    query_emb = model.encode([description], normalize_embeddings=True)

    corpus_emb = np.load(str(embeddings_path))
    scores = (corpus_emb @ query_emb.T).flatten()

    # Over-fetch to allow DSL filtering
    top_k = min(limit * 5, len(scores))
    top_indices = scores.argsort()[-top_k:][::-1]

    with open(ids_path) as f:
        ids = json.load(f)

    results = []
    for idx in top_indices:
        entry = load_entry_by_id(ids[idx], index_dir)
        if entry is None:
            continue
        if dsl and entry.get("dsl") != dsl:
            continue
        entry["similarity_score"] = round(float(scores[idx]), 4)
        results.append(entry)
        if len(results) >= limit:
            break

    return results


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def format_table(entries: list[dict]) -> str:
    """Format entries as a readable table."""
    if not entries:
        return "No results found."

    lines = []
    for i, e in enumerate(entries, 1):
        sim = f" (sim: {e['similarity_score']})" if "similarity_score" in e else ""
        src = "upstream" if e.get("upstream") else "org"
        reproduced = "PoC" if e.get("reproduced") else "no-PoC"
        lines.append(f"  {i}. [{e.get('severity', '?'):>8}] [{src}] [{reproduced}]{sim}")
        lines.append(f"     ID:    {e.get('id', '?')}")
        lines.append(f"     DSL:   {e.get('dsl', '?')}  |  Type: {e.get('vuln_type', '?')}  |  Impact: {e.get('impact', '?')}")
        root = e.get("root_cause", "")
        if len(root) > 120:
            root = root[:117] + "..."
        lines.append(f"     Cause: {root}")
        loc = e.get("location", {})
        if isinstance(loc, dict) and loc.get("file"):
            lines.append(f"     File:  {loc.get('file', '')} {('L' + str(loc['line'])) if loc.get('line') else ''}")
        lines.append("")

    return "\n".join(lines)


def format_brief(entries: list[dict]) -> str:
    """One-line-per-entry format for quick scanning."""
    if not entries:
        return "No results found."
    lines = []
    for e in entries:
        root = e.get("root_cause", "")[:80]
        lines.append(f"{e.get('id', '?')} | {e.get('dsl', '?')} | {e.get('vuln_type', '?')} | {root}")
    return "\n".join(lines)


def format_json(entries: list[dict]) -> str:
    """Full JSON output."""
    return json.dumps(entries, indent=2)


def print_stats(index_dir: pathlib.Path):
    """Print index statistics from manifest."""
    manifest_path = index_dir / "manifest.json"
    if not manifest_path.exists():
        print("No index built yet. Run: python build_index.py --config ../config/config.json")
        return

    with open(manifest_path) as f:
        m = json.load(f)

    print(f"\nzkbugs-index statistics")
    print(f"  Built at:       {m.get('built_at', 'unknown')}")
    print(f"  Schema version: {m.get('schema_version', 'unknown')}")
    print(f"  Total entries:  {m.get('count', 0)}")
    print(f"  Upstream:       {m.get('upstream_count', 0)}")
    print(f"  Org/local:      {m.get('org_count', 0)}")
    print(f"\n  By DSL:")
    for dsl, count in m.get("by_dsl", {}).items():
        print(f"    {dsl:20s} {count}")
    print(f"\n  By vulnerability type:")
    for vuln, count in m.get("by_vuln_type", {}).items():
        print(f"    {vuln:30s} {count}")

    # Check for embeddings
    if (index_dir / "embeddings.npy").exists():
        print(f"\n  Semantic search: enabled")
    else:
        print(f"\n  Semantic search: disabled (no embeddings)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Query the zkbugs-index for known ZK vulnerabilities",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --dsl circom --vuln under_constrained --limit 5
  %(prog)s --keyword "assigned but not constrained" --limit 3
  %(prog)s --similar "polynomial degree check missing" --dsl halo2
  %(prog)s --source org --citable --format brief
  %(prog)s --stats
        """,
    )
    # Filters
    parser.add_argument("--dsl", type=str, help="Filter by DSL (circom, noir, halo2, cairo, zkvm, etc.)")
    parser.add_argument("--vuln", type=str, help="Filter by vulnerability type (see VULN-TAXONOMY.md)")
    parser.add_argument("--keyword", type=str, help="Substring match on root_cause field")
    parser.add_argument("--similar", type=str, help="Semantic similarity search on root_cause")
    parser.add_argument("--id", type=str, help="Lookup a specific entry by ID")

    # Source filters
    parser.add_argument("--source", choices=["upstream", "org", "all"], default="all",
                        help="Filter by source (default: all)")
    parser.add_argument("--citable", action="store_true",
                        help="Only return disclosed entries (safe for reports)")

    # Output
    parser.add_argument("--limit", type=int, default=5,
                        help="Max results (default: 5, 0 = unlimited)")
    parser.add_argument("--format", choices=["json", "table", "brief"], default="table",
                        help="Output format (default: table)")

    # Paths
    parser.add_argument("--index-dir", type=pathlib.Path, default=None,
                        help="Path to index directory")
    parser.add_argument("--config", type=pathlib.Path, default=DEFAULT_CONFIG,
                        help="Path to config.json")

    # Stats
    parser.add_argument("--stats", action="store_true", help="Print index statistics")

    args = parser.parse_args()
    index_dir = resolve_index_dir(args.index_dir, args.config)

    # Stats mode
    if args.stats:
        print_stats(index_dir)
        return

    # ID lookup mode
    if args.id:
        entry = load_entry_by_id(args.id, index_dir)
        if entry:
            print(format_json([entry]) if args.format == "json" else format_table([entry]))
        else:
            print(f"Entry not found: {args.id}", file=sys.stderr)
            sys.exit(1)
        return

    # Semantic search mode
    if args.similar:
        results = query_similar(args.similar, index_dir, dsl=args.dsl, limit=args.limit or 5)
        results = apply_filters(results, source=args.source, citable=args.citable)
        formatter = {"json": format_json, "table": format_table, "brief": format_brief}[args.format]
        print(formatter(results))
        return

    # Validate that at least one filter is provided
    if not args.dsl and not args.vuln and not args.keyword:
        print("ERROR: Specify at least --dsl, --vuln, --keyword, --similar, or --id", file=sys.stderr)
        print("       Full corpus scan is intentionally blocked. Use --stats for overview.", file=sys.stderr)
        sys.exit(1)

    # Load candidates from the most specific shard
    if args.dsl and args.vuln:
        # Intersect: load DSL shard, then filter by vuln type
        candidates = load_shard(index_dir, "by_dsl", args.dsl.lower())
        candidates = [c for c in candidates if c.get("vuln_type") == args.vuln]
    elif args.dsl:
        candidates = load_shard(index_dir, "by_dsl", args.dsl.lower())
    elif args.vuln:
        candidates = load_shard(index_dir, "by_vuln_type", args.vuln)
    else:
        # keyword-only: must scan all
        candidates = load_all_entries(index_dir)

    # Apply remaining filters
    candidates = apply_filters(candidates, keyword=args.keyword,
                               source=args.source, citable=args.citable)

    # Rank and limit
    candidates = rank_results(candidates)
    if args.limit > 0:
        candidates = candidates[:args.limit]

    # Output
    formatter = {"json": format_json, "table": format_table, "brief": format_brief}[args.format]
    print(formatter(candidates))


if __name__ == "__main__":
    main()
