import json
import tempfile
import unittest
from pathlib import Path

from emu.services.investigation_store import (
    InvestigationStore,
    JsonlIntegrityError,
    QuestionConflictError,
    SidecarPathError,
    WriteConflictError,
)


def _write_session(path: Path, payload: dict) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")
    return path.stat().st_mtime_ns


class InvestigationStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self._temp_dir = tempfile.TemporaryDirectory()
        self.repo_root = Path(self._temp_dir.name)
        self.session_path = "eng/eng.json"
        self.session_file = self.repo_root / "zk-findings" / "sessions" / self.session_path
        self.session_mtime = _write_session(
            self.session_file,
            {
                "engagement_id": "eng",
                "targets": [],
                "trust_boundaries": [],
                "open_findings": [],
                "verified_findings": [],
                "next_steps": [],
            },
        )
        self.store = InvestigationStore(self.repo_root)

    def tearDown(self) -> None:
        self._temp_dir.cleanup()

    def test_rejects_sidecar_without_matching_session(self) -> None:
        with self.assertRaises(SidecarPathError):
            self.store.read_questions("eng/missing.json")

    def test_refuses_to_write_jsonl_when_existing_line_is_malformed(self) -> None:
        self.store.create_question(self.session_path, self.store.read_questions(self.session_path)["mtime_ns"], "first")
        questions_file = self.session_file.with_suffix(".questions.jsonl")
        questions_file.write_text(questions_file.read_text() + "{bad json\n")

        with self.assertRaises(JsonlIntegrityError):
            self.store.create_question(self.session_path, questions_file.stat().st_mtime_ns, "second")

    def test_detects_question_write_conflict(self) -> None:
        initial = self.store.read_questions(self.session_path)
        self.store.create_question(self.session_path, initial["mtime_ns"], "first")

        with self.assertRaises(WriteConflictError):
            self.store.create_question(self.session_path, initial["mtime_ns"], "second")

    def test_import_candidate_writes_unverified_finding(self) -> None:
        questions = self.store.read_questions(self.session_path)
        created = self.store.create_question(self.session_path, questions["mtime_ns"], "Missing subgroup check?")
        pending = self.store.buffer_candidate(
            self.session_path,
            created["mtime_ns"],
            self.store.read_pending(self.session_path)["mtime_ns"],
            "Q-01",
            {"summary": "Missing subgroup check", "severity": "High", "owner_skill": "ecc-pairing-auditor"},
        )

        self.store.import_pending(
            self.session_path,
            self.session_file.stat().st_mtime_ns,
            self.store.read_questions(self.session_path)["mtime_ns"],
            pending["mtime_ns"],
            ["Q-01"],
        )

        session = json.loads(self.session_file.read_text())
        self.assertEqual(session["open_findings"][0]["id"], "F-01")
        self.assertEqual(session["open_findings"][0]["status"], "unverified")
        self.assertNotEqual(session["open_findings"][0]["status"], "verified")

    def test_import_reuses_existing_question_finding_ref_after_partial_import(self) -> None:
        created = self.store.create_question(self.session_path, self.store.read_questions(self.session_path)["mtime_ns"], "Missing subgroup check?")
        pending = self.store.buffer_candidate(
            self.session_path,
            created["mtime_ns"],
            self.store.read_pending(self.session_path)["mtime_ns"],
            "Q-01",
            {"summary": "Missing subgroup check", "severity": "High", "owner_skill": "ecc-pairing-auditor"},
        )
        self.store.update_question(
            self.session_path,
            self.store.read_questions(self.session_path)["mtime_ns"],
            "Q-01",
            {"finding_ref": "F-07", "status": "candidate"},
        )

        # Recovery diagnostic: link written but finding absent must surface on the
        # questions read path the board uses, not only on read_pending.
        diagnostics = self.store.read_questions(self.session_path)["diagnostics"]
        self.assertTrue(any("F-07" in d["message"] for d in diagnostics))

        self.store.import_pending(
            self.session_path,
            self.session_file.stat().st_mtime_ns,
            self.store.read_questions(self.session_path)["mtime_ns"],
            pending["mtime_ns"],
            ["Q-01"],
        )

        session = json.loads(self.session_file.read_text())
        self.assertEqual(session["open_findings"][0]["id"], "F-07")

    def test_buffer_rejects_duplicate_question_id(self) -> None:
        created = self.store.create_question(self.session_path, self.store.read_questions(self.session_path)["mtime_ns"], "Missing subgroup check?")
        pending_mtime = self.store.read_pending(self.session_path)["mtime_ns"]
        self.store.buffer_candidate(
            self.session_path,
            created["mtime_ns"],
            pending_mtime,
            "Q-01",
            {"summary": "Missing subgroup check"},
        )

        with self.assertRaises(QuestionConflictError):
            self.store.buffer_candidate(
                self.session_path,
                self.store.read_questions(self.session_path)["mtime_ns"],
                self.store.read_pending(self.session_path)["mtime_ns"],
                "Q-01",
                {"summary": "Duplicate"},
            )


if __name__ == "__main__":
    unittest.main()
