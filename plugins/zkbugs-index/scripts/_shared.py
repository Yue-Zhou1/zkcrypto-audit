"""Shared constants and helpers for zkbugs-index scripts."""

from __future__ import annotations

import logging
import pathlib
import subprocess

VULN_ALIASES: dict[str, str] = {
    # under_constrained
    "missing constraint": "under_constrained",
    "unconstrained": "under_constrained",
    "unconstrained witness": "under_constrained",
    "assigned but not constrained": "under_constrained",
    "under-constrained": "under_constrained",
    "underconstrained": "under_constrained",
    # over_constrained
    "completeness violation": "over_constrained",
    "false rejection": "over_constrained",
    "over-constrained": "over_constrained",
    "overconstrained": "over_constrained",
    # fiat_shamir_weak
    "frozen heart": "fiat_shamir_weak",
    "weak fiat-shamir": "fiat_shamir_weak",
    "incomplete transcript": "fiat_shamir_weak",
    "fiat-shamir": "fiat_shamir_weak",
    # nonce_reuse
    "deterministic nonce": "nonce_reuse",
    "repeated randomness": "nonce_reuse",
    "nonce reuse": "nonce_reuse",
    # arithmetic_overflow
    "modular overflow": "arithmetic_overflow",
    "wrap-around": "arithmetic_overflow",
    "field overflow": "arithmetic_overflow",
    "integer overflow": "arithmetic_overflow",
    # missing_range_check
    "range violation": "missing_range_check",
    "missing bounds check": "missing_range_check",
    "missing range check": "missing_range_check",
    # missing_nullifier
    "missing uniqueness check": "missing_nullifier",
    "replay attack": "missing_nullifier",
    "double spend": "missing_nullifier",
    # trusted_setup_leak
    "ceremony violation": "trusted_setup_leak",
    "crs misuse": "trusted_setup_leak",
    "toxic waste": "trusted_setup_leak",
    # prover_input_injection
    "malicious prover input": "prover_input_injection",
    "unvalidated advice": "prover_input_injection",
    # lookup_table_mismatch
    "table mismatch": "lookup_table_mismatch",
    "lookup misconfiguration": "lookup_table_mismatch",
    # missing_public_input
    "hidden public input": "missing_public_input",
    "missing instance variable": "missing_public_input",
    # soundness_error
    "forgery": "soundness_error",
    "fake proof": "soundness_error",
    # privacy_leak
    "information leakage": "privacy_leak",
    "witness extraction": "privacy_leak",
    # subgroup_attack
    "missing subgroup check": "subgroup_attack",
    "point validation": "subgroup_attack",
    "small subgroup": "subgroup_attack",
    # timing_side_channel
    "variable-time operation": "timing_side_channel",
    "timing leak": "timing_side_channel",
    # configuration_error
    "misconfiguration": "configuration_error",
    "wrong curve parameters": "configuration_error",
    # soundness_error (upstream catch-all categories)
    "computational issues": "soundness_error",
    "backend issue": "soundness_error",
}

CANONICAL_VULN_TYPES = {
    "under_constrained",
    "over_constrained",
    "fiat_shamir_weak",
    "nonce_reuse",
    "arithmetic_overflow",
    "missing_range_check",
    "missing_nullifier",
    "trusted_setup_leak",
    "prover_input_injection",
    "lookup_table_mismatch",
    "missing_public_input",
    "soundness_error",
    "privacy_leak",
    "subgroup_attack",
    "timing_side_channel",
    "configuration_error",
    "unknown",
}


def ensure_repo(
    repo_url: str | None,
    local_path: str | None,
    branch: str,
    cache_dir: pathlib.Path,
    *,
    logger: logging.Logger | None = None,
) -> pathlib.Path | None:
    """Clone or locate a repo. Returns the local path, or None if unavailable."""
    if local_path:
        path = pathlib.Path(local_path).expanduser().resolve()
        if path.exists():
            if logger:
                logger.info(f"Using local repo at {path}")
            return path
        if logger:
            logger.error(f"Local path does not exist: {path}")
        return None

    if not repo_url:
        return None

    repo_slug = repo_url.rstrip("/").split("/")[-2] + "_" + repo_url.rstrip("/").split("/")[-1]
    clone_dir = cache_dir / repo_slug

    if clone_dir.exists():
        if logger:
            logger.info(f"Pulling latest from {repo_url} into {clone_dir}")
        subprocess.run(
            ["git", "-C", str(clone_dir), "pull", "--ff-only"],
            check=False,
            capture_output=True,
            text=True,
        )
        return clone_dir

    if logger:
        logger.info(f"Cloning {repo_url} (branch: {branch}) into {clone_dir}")
    cache_dir.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        ["git", "clone", "--depth", "1", "--branch", branch, repo_url, str(clone_dir)],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        if logger:
            logger.error(f"Clone failed: {result.stderr}")
        return None

    return clone_dir
