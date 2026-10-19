"""Run opt-in numeral Node regressions via existing Python CI discovery."""
from pathlib import Path
import shutil
import subprocess
import unittest


class WesternNumeralsTests(unittest.TestCase):
    def test_node_unicode_dom_svg_csv(self):
        node = shutil.which("node")
        self.assertIsNotNone(node, "Node required for Unicode checks")
        base = Path(__file__).resolve().parents[2]
        suite = base / "tests" / "ascii_numerals" / "ascii_numerals.test.cjs"
        result = subprocess.run([node, "--test", str(suite)], cwd=base,
                                text=True, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, timeout=30, check=False)
        self.assertEqual(result.returncode, 0, result.stdout)
