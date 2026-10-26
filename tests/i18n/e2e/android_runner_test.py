"""Runner reporting tests; all real-device E2E remains on Android."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[3]/"tools"/"i18n"/"e2e"))
from android_device import record, visible

class AndroidReportingTest(unittest.TestCase):
    def test_failure_is_not_silently_marked_pass_and_checkpoint_runs(self):
        results, checkpoints = {}, []
        def fail():
            raise AssertionError("sample failure")
        self.assertFalse(record(results,"note_persistence",fail,
                                lambda:checkpoints.append(dict(results))))
        self.assertEqual(results["note_persistence"]["status"],"FAIL")
        self.assertIn("sample failure",results["note_persistence"]["error"])
        self.assertEqual(checkpoints[0]["note_persistence"]["status"],"FAIL")

    def test_transport_timeout_is_separate_from_app_assertions(self):
        results={}
        def timeout():
            raise TimeoutError('device connection timed out')
        self.assertFalse(record(results,'android_transport',timeout))
        self.assertEqual(results['android_transport']['failure_kind'],'INFRASTRUCTURE')
        self.assertEqual(results['android_transport']['status'],'FAIL')

    def test_valid_success_records_evidence_and_timing(self):
        results={}
        self.assertTrue(record(results,"screen_marker",lambda:"genuine marker"))
        self.assertEqual(results["screen_marker"]["detail"],"genuine marker")
        self.assertGreaterEqual(results["screen_marker"]["duration_ms"],0)

    def test_nav_label_does_not_prove_section_content(self):
        nodes=[{"text":"Tasks","content-desc":"","hint":"","resource-id":"","bounds":"[0,1][5,5]"}]
        self.assertIsNotNone(visible(nodes,"Tasks"))
        self.assertIsNone(visible(nodes,"Add study, workout"))

    def test_concurrent_push_does_not_cancel_android_runtime(self):
        workflow = (Path(__file__).resolve().parents[3] / ".github/workflows/i18n_e2e.yml").read_text()
        self.assertIn("group: df13-e2e-${{ github.ref }}", workflow)
        self.assertIn("cancel-in-progress: false", workflow)
        self.assertNotIn("cancel-in-progress: true", workflow)

    def test_api35_alternate_emulator_profile_is_isolated_from_api30(self):
        workflow = (Path(__file__).resolve().parents[3] / ".github/workflows/i18n_e2e.yml").read_text()
        matrix = workflow.split("      matrix:", 1)[1].split("    steps:", 1)[0]
        api30 = matrix.split("          - api: 30", 1)[1].split("          - api: 35", 1)[0]
        api35 = matrix.split("          - api: 35", 1)[1]
        self.assertIn("runner: ubuntu-24.04", api30)
        self.assertIn("emulator_build: 15004761", api30)
        self.assertIn("runner: ubuntu-26.04", api35)
        self.assertIn("emulator_build: 16428233", api35)
        self.assertIn("ram: 3072M", api35)
        self.assertIn("boot_timeout: 1200", api35)
        self.assertIn("emulator-build: ${{ matrix.emulator_build }}", workflow)
        self.assertIn("emulator-options: ${{ matrix.emulator_options }}", workflow)
        self.assertIn("cancel-in-progress: false", workflow)

if __name__=="__main__":
    unittest.main()
