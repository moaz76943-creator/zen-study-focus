"""Unit tests for DF13-C source contracts; these are NEVER Android E2E evidence."""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "tools" / "i18n" / "e2e" / "scenarios"))

from fixtures import records, fixture_summary
from functional import assert_changed, assert_stable, west_digits, normalize_clock, classify


class FixtureContract(unittest.TestCase):
    def test_exact_sizes_and_deterministic_distinct_ids(self):
        sizes = {"task": 1000, "note": 5000, "session": 10000}
        for kind, count in sizes.items():
            first = list(records(kind, count))
            second = list(records(kind, count))
            self.assertEqual(first, second)
            self.assertEqual(len(first), count)
            self.assertEqual(len({x["id"] for x in first}), count)
            self.assertTrue(all(x["synthetic"] is True for x in first))
            self.assertTrue(all(x["id"].startswith("DF13C_TEST_ONLY_") for x in first))

    def test_invalid_size_or_kind_fails_closed(self):
        for kind, count in (("unknown", 5), ("task", 1001), ("task", -1)):
            with self.subTest(kind=kind, count=count):
                with self.assertRaises(ValueError):
                    list(records(kind, count))

    def test_summary_never_reports_performance_pass(self):
        summary = fixture_summary()
        self.assertEqual(summary["performance_status"], "NOT_TESTED")
        self.assertEqual(summary["counts"], {"task": 1000, "note": 5000, "session": 10000})


class AssertionContract(unittest.TestCase):
    def test_no_change_is_a_failure_not_a_pass(self):
        with self.assertRaises(AssertionError):
            assert_changed("25:00", "25:00", "timer")
        self.assertTrue(assert_changed("25:00", "24:58", "timer"))

    def test_paused_clock_drift_is_rejected(self):
        self.assertTrue(assert_stable(1497, 1497, tolerance=1))
        with self.assertRaises(AssertionError):
            assert_stable(1497, 1487, tolerance=1)

    def test_strict_clock_and_digit_detection(self):
        self.assertEqual(normalize_clock("24:59"), 1499)
        for bad in ("0:99", "٠١:٢٠", "24:90", "15:15:15"):
            with self.subTest(bad=bad):
                with self.assertRaises(ValueError):
                    normalize_clock(bad)
        self.assertEqual(west_digits("Focus 25:00"), [])
        self.assertEqual(west_digits("Focus ٢٥:٠٠"), ["٢", "٥", "٠", "٠"])

    def test_report_cannot_promote_missing_device_evidence(self):
        self.assertEqual(classify("REAL_ANDROID_ASSERTIONS", verified=True), "PASS")
        self.assertEqual(classify("REAL_ANDROID_ASSERTIONS", verified=False), "FAIL")
        self.assertEqual(classify("SOURCE_ONLY", verified=True), "NOT_TESTED")
        self.assertEqual(classify("REQUIRES_HOOK", verified=True), "NOT_TESTED")


if __name__ == "__main__":
    unittest.main()
