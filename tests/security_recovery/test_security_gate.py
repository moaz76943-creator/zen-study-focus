"""CI adapter: included by existing python unittest discovery without workflow edits."""
import pathlib
import subprocess
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent


class SecurityRecoveryGate(unittest.TestCase):
    def test_node_security_contracts(self):
        suites = sorted(str(p) for p in HERE.glob("*.test.cjs"))
        self.assertGreaterEqual(len(suites), 3, "Security suite was not discovered")
        process = subprocess.run(
            ["node", "--test", *suites], cwd=ROOT,
            capture_output=True, text=True, timeout=60, check=False,
        )
        self.assertEqual(
            process.returncode, 0,
            "Security gate blocked this SHA. Review the P0/P1 findings; do not skip tests.\n"
            + process.stdout[-18000:] + "\n" + process.stderr[-6000:],
        )


if __name__ == "__main__":
    unittest.main()
