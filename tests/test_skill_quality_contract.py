"""Regression tests for skill-evaluation fixture contracts."""

from __future__ import annotations

from copy import deepcopy
import sys
import unittest
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
from scripts.validate_skill_evals import load_fixture, validate_fixture  # noqa: E402


class SkillQualityContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        skills, errors = validate_registry(load_registry(REGISTRY_PATH))
        if errors:
            raise AssertionError(errors)
        cls.registry_skills = {entry["skill_name"]: entry for entry in skills}
        cls.router_matrix = load_router_matrix(ROUTER_MATRIX_PATH)

    def validate_named_fixture(self, filename: str, fixture: dict) -> list[str]:
        return validate_fixture(
            fixture,
            registry_skills=self.registry_skills,
            router_matrix=self.router_matrix,
            fixture_path=REPO_ROOT / "tests" / "fixtures" / "skill-evals" / filename,
        )

    def test_positive_routes_must_select_the_fixture_skill(self) -> None:
        fixture = deepcopy(
            load_fixture(REPO_ROOT / "tests" / "fixtures" / "skill-evals" / "onchain-verifier-auditor.json")
        )
        for prompt_case in fixture["positive_prompts"]:
            prompt_case["expected_route"] = "randomness-auditor"

        errors = self.validate_named_fixture("onchain-verifier-auditor.json", fixture)

        self.assertTrue(any("must equal skill_name" in error for error in errors), errors)

    def test_user_triggered_positive_prompt_must_name_the_skill(self) -> None:
        fixture = deepcopy(
            load_fixture(
                REPO_ROOT
                / "tests"
                / "fixtures"
                / "skill-evals"
                / "differential-test-harness-gen.json"
            )
        )
        for prompt_case in fixture["positive_prompts"]:
            prompt_case["prompt"] = "Build a differential crypto test harness for this target."

        errors = self.validate_named_fixture("differential-test-harness-gen.json", fixture)

        self.assertTrue(any("must explicitly name" in error for error in errors), errors)

    def test_user_triggered_prompt_is_checked_even_when_its_route_is_wrong(self) -> None:
        fixture = deepcopy(
            load_fixture(
                REPO_ROOT
                / "tests"
                / "fixtures"
                / "skill-evals"
                / "differential-test-harness-gen.json"
            )
        )
        for prompt_case in fixture["positive_prompts"]:
            prompt_case["expected_route"] = "randomness-auditor"
            prompt_case["prompt"] = "Build a differential crypto test harness for this target."

        errors = self.validate_named_fixture("differential-test-harness-gen.json", fixture)

        self.assertTrue(any("must equal skill_name" in error for error in errors), errors)
        self.assertTrue(any("must explicitly name" in error for error in errors), errors)

    def test_forward_test_notes_must_match_declared_route_and_fields(self) -> None:
        fixture = deepcopy(
            load_fixture(REPO_ROOT / "tests" / "fixtures" / "skill-evals" / "onchain-verifier-auditor.json")
        )
        fixture["forward_test_notes"] = [
            {
                "prompt_kind": "positive",
                "observed_route": "randomness-auditor",
                "output_fields_present": [],
            },
            {
                "prompt_kind": "negative",
                "observed_route": "randomness-auditor",
                "output_fields_present": [],
            },
        ]

        errors = self.validate_named_fixture("onchain-verifier-auditor.json", fixture)

        self.assertTrue(any("positive forward-test observed_route" in error for error in errors), errors)
        self.assertTrue(any("missing required output fields" in error for error in errors), errors)
        self.assertTrue(any("negative forward-test observed_route" in error for error in errors), errors)

    def test_forward_test_notes_require_positive_and_negative_observations(self) -> None:
        fixture = deepcopy(
            load_fixture(REPO_ROOT / "tests" / "fixtures" / "skill-evals" / "onchain-verifier-auditor.json")
        )
        fixture["forward_test_notes"] = [fixture["forward_test_notes"][0], fixture["forward_test_notes"][0]]

        errors = self.validate_named_fixture("onchain-verifier-auditor.json", fixture)

        self.assertTrue(any("negative forward-test" in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
