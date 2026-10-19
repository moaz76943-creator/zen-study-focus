"""Ensure the Node focus workflow suite runs in existing Python CI discovery."""
import pathlib
import subprocess
import unittest

class FocusWorkflowTests(unittest.TestCase):
    def test_focus_workflows(self):
        script = pathlib.Path(__file__).with_name("test_focus_workflows.cjs")
        result = subprocess.run(
            ["node", "--test", str(script)],
            capture_output=True, text=True, timeout=45, check=False
        )
        self.assertEqual(result.returncode, 0, result.stdout + "\n" + result.stderr)
