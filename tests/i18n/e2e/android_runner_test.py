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

    def test_valid_success_records_evidence_and_timing(self):
        results={}
        self.assertTrue(record(results,"screen_marker",lambda:"genuine marker"))
        self.assertEqual(results["screen_marker"]["detail"],"genuine marker")
        self.assertGreaterEqual(results["screen_marker"]["duration_ms"],0)

    def test_nav_label_does_not_prove_section_content(self):
        nodes=[{"text":"Tasks","content-desc":"","hint":"","resource-id":"","bounds":"[0,1][5,5]"}]
        self.assertIsNotNone(visible(nodes,"Tasks"))
        self.assertIsNone(visible(nodes,"Add study, workout"))

if __name__=="__main__":
    unittest.main()
