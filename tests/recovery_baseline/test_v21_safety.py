"""DF-003: include scoped v21 safety checks in existing Python discovery without editing CI."""
import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]

class TestV21RecoveryBaseline(unittest.TestCase):
    def test_disposable_v21_safety_suite(self):
        result = subprocess.run(
            ["node", "--test", "tests/recovery_baseline/v21_safety.test.cjs"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        self.assertEqual(
            result.returncode, 0,
            "Node v21 safety suite failed:\n" + result.stdout + "\n" + result.stderr,
        )
