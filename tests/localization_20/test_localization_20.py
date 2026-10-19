"""Exercise the same Node suite inside the repository's existing Python CI gate."""
from pathlib import Path
import subprocess
import unittest


class TwentyLanguageLocalization(unittest.TestCase):
    def test_node_localization_contract(self):
        repo = Path(__file__).resolve().parents[2]
        test_file = repo / "tests/localization_20/localization_20.test.cjs"
        result = subprocess.run(
            ["node", "--test", str(test_file)], cwd=repo,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, timeout=35, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout)


if __name__ == "__main__":
    unittest.main()
