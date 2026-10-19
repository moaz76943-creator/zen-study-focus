"""Deep Focus branding regression and upgrade-compatibility checks."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


class BrandingTests(unittest.TestCase):
    def test_visible_app_name_survives_language_changes(self):
        manifest = read("android/app/src/main/AndroidManifest.xml")
        index = read("android/app/src/main/assets/web/index.html")
        app = read("android/app/src/main/assets/web/app.js")
        self.assertIn('android:label="Deep Focus: Study & Work Timer"', manifest)
        self.assertIn('<title>Deep Focus: Study & Work Timer</title>', index)
        self.assertIn('id="hdrMainTitle">Deep Focus</h1>', index)
        self.assertIn("document.getElementById('hdrMainTitle').textContent = 'Deep Focus';", app)
        self.assertIn("document.getElementById('hdrSubTitle').textContent = d.sub;", app)
        self.assertEqual(len("Deep Focus: Study & Work Timer"), 30)

    def test_notifications_sharing_policies_and_release_labels(self):
        paths = (
            "android/app/src/main/java/com/zenstudy/focus/FocusTimerService.java",
            "android/app/src/main/java/com/zenstudy/focus/MainActivity.java",
            "docs/index.html", "docs/privacy.html", "privacy.html",
            "docs/MEDIA_LICENSES.md",
        )
        for path in paths:
            with self.subTest(path=path):
                body = read(path)
                self.assertIn("Deep Focus", body)
                self.assertNotIn("ZEN FOCUS", body)
                self.assertNotIn("Zen Study Focus Pro", body)
        workflow = read(".github/workflows/build_apk.yml")
        self.assertIn("DeepFocus-Test-APK-and-Unsigned-AAB", workflow)
        self.assertIn("DeepFocus-Signed-Play-Release", workflow)
        for gate in ("ZEN_RELEASE_APPROVED_SHA", "ZEN_DEVICE_QA_APPROVED",
                     "ZEN_MEDIA_LICENSES_APPROVED", "ZEN_UPLOAD_KEYSTORE_BASE64"):
            self.assertIn(gate, workflow)

    def test_existing_data_formats_and_android_identity_are_preserved(self):
        app = read("android/app/src/main/assets/web/app.js")
        native = read("android/app/src/main/java/com/zenstudy/focus/MainActivity.java")
        gradle = read("android/app/build.gradle")
        self.assertIn('applicationId "com.zenstudy.focus"', gradle)
        for key in ("zen_fortress_cfg_v21", "zen_fortress_tasks_v21",
                    "zen_fortress_notes_v21", "ZEN21::", "window.ZenNative"):
            self.assertIn(key, app)
        self.assertIn("com.zenstudy.focus", native)
        self.assertIn("deep-focus-backup-", app)
        self.assertIn('"deep-focus-"', native)

    def test_old_public_app_name_removed(self):
        paths = (
            "android/app/src/main/AndroidManifest.xml",
            "android/app/src/main/assets/web/index.html",
            "android/app/src/main/assets/web/app.js",
            "android/app/src/main/java/com/zenstudy/focus/FocusTimerService.java",
            "android/app/src/main/java/com/zenstudy/focus/MainActivity.java",
            "docs/index.html", "docs/privacy.html", "privacy.html",
        )
        for path in paths:
            with self.subTest(path=path):
                body = read(path)
                self.assertNotIn("ZEN FOCUS", body)
                self.assertNotIn("Zen Study Focus Pro", body)


if __name__ == "__main__":
    unittest.main()
