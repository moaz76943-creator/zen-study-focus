"""Verify API35 does not require the instrumentation process that crashes its emulator.

This is a source contract only; the actual Android test must still run.
"""
import pathlib
import subprocess
import unittest

SCRIPT = (pathlib.Path(__file__).resolve().parents[3]
          / 'tools/i18n/e2e/run_android.sh').read_text()


class AccessibilityTransportStrategyTest(unittest.TestCase):
    def test_api35_uses_adb_uiautomator_without_instrumentation(self):
        self.assertIn('if [[ "$API" == 35 ]]; then\n  unset DF13_UI_PORT', SCRIPT)
        self.assertIn('PROBE_MODE.txt', SCRIPT)
        self.assertIn('API35_ADB_UIAUTOMATOR', SCRIPT)

    def test_runner_is_valid_bash_with_nested_python_heredoc(self):
        script = pathlib.Path(__file__).resolve().parents[3] / 'tools/i18n/e2e/run_android.sh'
        subprocess.run(['bash', '-n', str(script)], check=True, capture_output=True, text=True)

    def test_api30_keeps_persistent_probe_and_its_handshake(self):
        self.assertIn('adb shell am instrument -w com.zenstudy.focus.e2e/.AccessibilityProbe', SCRIPT)
        self.assertIn('export DF13_UI_PORT=38383', SCRIPT)
        self.assertIn("connection.sendall(b'PING\\n')", SCRIPT)

if __name__ == '__main__':
    unittest.main()
