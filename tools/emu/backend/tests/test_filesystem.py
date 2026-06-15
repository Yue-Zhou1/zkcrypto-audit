import tempfile
import unittest
from pathlib import Path

from emu.services.filesystem import FilesystemService, TargetPathError


class FilesystemServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self._temp_dir = tempfile.TemporaryDirectory()
        self.repo_root = Path(self._temp_dir.name)
        self.service = FilesystemService(self.repo_root)

    def tearDown(self) -> None:
        self._temp_dir.cleanup()

    def test_validate_raises_on_missing_path(self) -> None:
        with self.assertRaises(TargetPathError):
            self.service.validate_target(str(self.repo_root / "does-not-exist"))

    def test_validate_raises_on_non_directory(self) -> None:
        file_path = self.repo_root / "a-file"
        file_path.write_text("x")
        with self.assertRaises(TargetPathError):
            self.service.validate_target(str(file_path))

    def test_validate_raises_on_relative_path(self) -> None:
        with self.assertRaises(TargetPathError):
            self.service.validate_target("relative/path")
