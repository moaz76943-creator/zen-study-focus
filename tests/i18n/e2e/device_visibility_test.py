"""Regression: empty UIAutomator XML nodes are present, not false/absent.

This is source-only evidence. It does not claim a real Android test passed.
"""
import sys
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools" / "i18n" / "e2e"))

from android_device import has_visible, has_iso_badge


class AndroidElementPresenceRegression(unittest.TestCase):
    def test_leaf_heading_is_not_reported_missing(self):
        leaf = ET.Element("node", {"text": "Deep Focus", "bounds": "[0,0][200,60]"})
        self.assertEqual(len(leaf), 0)
        self.assertTrue(has_visible([leaf], "Deep Focus"))
        self.assertFalse(has_visible([leaf], "Notes"))

    def test_leaf_language_badge_is_not_reported_missing(self):
        leaf = ET.Element("node", {"text": "AR", "bounds": "[0,60][120,100]"})
        self.assertEqual(len(leaf), 0)
        self.assertTrue(has_iso_badge([leaf], "ar"))
        self.assertFalse(has_iso_badge([leaf], "de"))


if __name__ == "__main__":
    unittest.main()
