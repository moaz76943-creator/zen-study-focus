"""Pre-release regression gates for the Zen Focus Android WebView app."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "android/app/src/main/assets/web"
APP = (WEB / "app.js").read_text(encoding="utf-8")
INDEX = (WEB / "index.html").read_text(encoding="utf-8")
GRADLE = (ROOT / "android/app/build.gradle").read_text(encoding="utf-8")


class ReleaseGuardTests(unittest.TestCase):
    def test_android_target_sdk(self):
        self.assertRegex(GRADLE, r"targetSdk\s+36")
        self.assertRegex(GRADLE, r"compileSdk\s+36")
        self.assertNotIn("signingConfig signingConfigs.debug", GRADLE)

    def test_user_content_is_escaped(self):
        self.assertIn("function escapeHtmlText(", APP)
        self.assertIn("escapeHtmlText(toWest(t.title))", APP)
        self.assertIn("escapeHtmlText(toWest(n.body))", APP)

    def test_no_fake_stats_or_tap_to_fabricate_sessions(self):
        self.assertNotIn("cfg.todayMins + 300", APP)
        self.assertNotIn("125.6K", INDEX)
        self.assertNotIn("↑ +18% this week", INDEX)
        self.assertIn("completedTimerIds", APP)
        self.assertIn("sessionHistory", APP)
        self.assertIn("restoreTimerSession();", APP)

    def test_export_disclosure(self):
        self.assertIn("They are NOT encrypted", INDEX)

    def test_nature_audio_files_are_not_html_error_pages(self):
        invalid = []
        for sound in sorted((WEB / "sounds").glob("*.ogg")):
            with sound.open("rb") as fh:
                if fh.read(4) != b"OggS":
                    invalid.append(sound.name)
        self.assertEqual([], invalid, "Invalid OGG assets (often HTML 404): " + ", ".join(invalid))

    def test_photo_assets_are_real_images(self):
        invalid = []
        for photo in sorted((WEB / "images").glob("*.jpg")):
            with photo.open("rb") as fh:
                if fh.read(3) != bytes.fromhex("ffd8ff"):
                    invalid.append(photo.name)
        self.assertEqual([], invalid, "Invalid JPEG assets: " + ", ".join(invalid))


if __name__ == "__main__":
    unittest.main()
