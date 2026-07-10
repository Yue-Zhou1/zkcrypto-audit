"""Regression tests for generated routing-document regions."""

from __future__ import annotations

from contextlib import redirect_stderr
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from scripts import sync_router_docs


class SyncRouterDocsTests(unittest.TestCase):
    def test_check_detects_generated_region_drift_and_sync_repairs_it(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            routing_path = root / "routing-matrix.md"
            flow_path = root / "full-audit-flow.md"
            routing_path.write_text(
                sync_router_docs.ROUTING_MATRIX_DOC_PATH.read_text(encoding="utf-8").replace(
                    "| Situation | Route |", "| stale | route |", 1
                ),
                encoding="utf-8",
            )
            flow_path.write_text(
                sync_router_docs.FULL_AUDIT_FLOW_DOC_PATH.read_text(encoding="utf-8"),
                encoding="utf-8",
            )

            with (
                patch.object(sync_router_docs, "ROUTING_MATRIX_DOC_PATH", routing_path),
                patch.object(sync_router_docs, "FULL_AUDIT_FLOW_DOC_PATH", flow_path),
            ):
                stderr = StringIO()
                with redirect_stderr(stderr):
                    self.assertEqual(sync_router_docs.sync_router_docs(check_mode=True), 1)
                self.assertIn("drift detected", stderr.getvalue())

                self.assertEqual(sync_router_docs.sync_router_docs(check_mode=False), 0)
                self.assertEqual(sync_router_docs.sync_router_docs(check_mode=True), 0)


if __name__ == "__main__":
    unittest.main()
