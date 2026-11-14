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

    def test_dead_emulator_cannot_create_cascading_locale_failures(self):
        results = {"navigation": {
            "status":"FAIL", "failure_kind":"INFRASTRUCTURE",
            "error":"ADB emulator transport was lost on all four hierarchy attempts; probe evidence captured"}}
        executed, snapshots = [], []
        self.assertFalse(record(results, "locale_ar",
                                lambda: executed.append("should_not_run"),
                                lambda: snapshots.append(dict(results))))
        self.assertEqual(executed, [])
        self.assertEqual(results["navigation"]["status"], "FAIL")
        self.assertEqual(results["locale_ar"]["status"], "NOT_TESTED")
        self.assertIn("ADB transport lost", results["locale_ar"]["reason"])
        self.assertEqual(snapshots[0]["locale_ar"]["status"], "NOT_TESTED")

    def test_accessibility_assertion_on_connected_device_does_not_hide_later_tests(self):
        results = {"navigation": {
            "status":"FAIL", "failure_kind":"ASSERTION_REQUIRES_TRIAGE",
            "error":"WebView did not expose a complete accessibility hierarchy"}}
        self.assertTrue(record(results, "locale_en", lambda:"Independent real result"))
        self.assertEqual(results["locale_en"]["status"], "PASS")

    def test_nav_label_does_not_prove_section_content(self):
        nodes=[{"text":"Tasks","content-desc":"","hint":"","resource-id":"","bounds":"[0,1][5,5]"}]
        self.assertIsNotNone(visible(nodes,"Tasks"))
        self.assertIsNone(visible(nodes,"Add study, workout"))

    def test_concurrent_push_does_not_cancel_android_runtime(self):
        workflow = (Path(__file__).resolve().parents[3] / ".github/workflows/i18n_e2e.yml").read_text()
        self.assertIn("group: df13-e2e-${{ github.ref }}", workflow)
        self.assertIn("cancel-in-progress: false", workflow)
        self.assertNotIn("cancel-in-progress: true", workflow)

    def test_emulator_tracing_is_opt_in_not_an_uncontrolled_test_dependency(self):
        runner = (Path(__file__).resolve().parents[3] / "tools/i18n/e2e/run_android.sh").read_text()
        workflow = (Path(__file__).resolve().parents[3] / ".github/workflows/i18n_e2e.yml").read_text()
        self.assertIn('"${DF13_ATTACH_STRACE:-0}" == 1', runner)
        self.assertIn("PTRACE_NOT_ATTACHED", runner)
        self.assertIn("EMULATOR_CRASH_METADATA.json", runner)
        self.assertIn("EMULATOR_HOST_FAILURES.txt", runner)
        self.assertNotIn("sudo apt-get install -y --no-install-recommends strace", workflow)

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
        self.assertIn("gpu: swiftshader", api35)
        self.assertIn("-gpu swiftshader -feature -Vulkan", api35)
        # Match executable matrix settings, not comments documenting failed trials.
        active_api35 = "\n".join(
            row.strip() for row in api35.splitlines()
            if row.strip().startswith(("gpu:", "emulator_options:"))
        )
        self.assertNotIn("swiftshader_indirect", active_api35)
        self.assertIn("gpu: swiftshader_indirect", api30)
        self.assertIn("boot_timeout: 1200", api35)
        self.assertIn("emulator-build: ${{ matrix.emulator_build }}", workflow)
        self.assertIn("emulator-options: ${{ matrix.emulator_options }}", workflow)
        self.assertIn("cancel-in-progress: false", workflow)

if __name__=="__main__":
    unittest.main()
