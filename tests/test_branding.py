"""Deep Focus branding / identity regression checks (kept in sync with the real project layout)."""
import re
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
WEB = "android/app/src/main/assets/web/"
JAVA = "android/app/src/main/java/com/zenstudy/focus/"


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


class BrandingTests(unittest.TestCase):
    def test_visible_app_name(self):
        self.assertIn('android:label="Deep Focus"', read("android/app/src/main/AndroidManifest.xml"))
        self.assertRegex(read(WEB + "index.html"), r"(?i)<title>\s*Deep Focus")

    def test_android_identity_and_storage_keys_preserved(self):
        gradle = read("android/app/build.gradle")
        self.assertRegex(gradle, r"applicationId\s+[\"']com\.deepfocus\.study[\"']")
        app = read(WEB + "app.js")
        for key in ("zen_fortress_cfg_v21", "zen_fortress_tasks_v21", "zen_fortress_notes_v21", "window.ZenNative"):
            self.assertIn(key, app)

    def test_old_public_app_name_removed(self):
        paths = ["android/app/src/main/AndroidManifest.xml", WEB + "index.html", WEB + "app.js",
                 JAVA + "MainActivity.java", "docs/index.html", "docs/privacy.html", "privacy.html"]
        for path in paths:
            with self.subTest(path=path):
                body = read(path)
                self.assertNotIn("ZEN FOCUS", body)
                self.assertNotIn("Zen Study Focus Pro", body)

    def test_referenced_files_exist(self):
        for path in (JAVA + "MainActivity.java", JAVA + "FocusAlarmReceiver.java", "docs/privacy.html",
                     ".github/workflows/build_aab.yml"):
            with self.subTest(path=path):
                self.assertTrue((ROOT / path).is_file(), path)


if __name__ == "__main__":
    unittest.main()
