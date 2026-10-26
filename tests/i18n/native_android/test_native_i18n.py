"""Static regression gates for the Android-native localization seam.

Run: python3 -m unittest discover -s tests/i18n/native_android -p 'test_*.py' -v
These checks do NOT replace Gradle compilation or API30/API35 device tests.
"""
import re
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
APP = ROOT / "android/app/src/main"
JAVA = APP / "java/com/zenstudy/focus"
RES = APP / "res"
LOCALES = ("ar", "fa", "ur", "de", "es", "fr")

REQUIRED = {
    "app_name",
    "native_focus_session",
    "native_channel_active_name",
    "native_channel_active_description",
    "native_channel_done_name",
    "native_channel_done_description",
    "native_notification_active",
    "native_notification_time_up",
    "native_notification_title",
    "native_backup_picker_unavailable",
    "native_backup_import_picker_unavailable",
    "native_backup_import_failed",
    "native_backup_exported",
    "native_backup_save_failed",
    "native_share_subject",
    "native_share_chooser",
    "native_backup_share_subject",
    "native_backup_share_chooser",
    "native_backup_privacy_warning",
    "native_backup_copy_heading",
    "native_share_unavailable",
}

def read_values(folder):
    root = ET.parse(RES / folder / "strings.xml").getroot()
    return {el.attrib["name"]: "".join(el.itertext()) for el in root.findall("string")}

class NativeAndroidI18nTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.activity = (JAVA / "MainActivity.java").read_text(encoding="utf-8")
        cls.receiver = (JAVA / "FocusAlarmReceiver.java").read_text(encoding="utf-8")
        cls.locale = (JAVA / "NativeLocaleStrings.java").read_text(encoding="utf-8")
        cls.main_values = read_values("values")

    def test_default_resource_is_complete(self):
        self.assertEqual(set(self.main_values), REQUIRED)
        for key, value in self.main_values.items():
            with self.subTest(key=key):
                self.assertTrue(value.strip(), key)

    def test_critical_translations_are_complete_and_keep_placeholders(self):
        for language in LOCALES:
            values = read_values("values-" + language)
            self.assertEqual(set(values), REQUIRED, language)
            for key, default in self.main_values.items():
                with self.subTest(language=language, key=key):
                    self.assertTrue(values[key].strip())
                    self.assertEqual(re.findall(r"%\d+\$s", default),
                                     re.findall(r"%\d+\$s", values[key]))

    def test_every_java_string_resource_exists(self):
        for filename in ("MainActivity.java", "FocusAlarmReceiver.java"):
            source = (JAVA / filename).read_text(encoding="utf-8")
            for key in set(re.findall(r"R\.string\.(\w+)", source)):
                with self.subTest(filename=filename, key=key):
                    self.assertIn(key, self.main_values)

    def test_no_user_visible_messages_hardcoded_in_java(self):
        joined = self.activity + self.receiver
        for phrase in (
            "File picker unavailable; use Share Backup",
            "Backup exported; keep the unencrypted file private",
            "Unable to save backup; existing data unchanged",
            "Focus session in progress",
            "Deep Focus — Time is up",
            "Active Focus Timer",
            "Focus Timer Completion",
            "Share Deep Focus via",
            "Save Backup to Gmail / Google Drive",
        ):
            with self.subTest(phrase=phrase):
                self.assertNotIn('"' + phrase + '"', joined)

    def test_webview_file_access_remains_disabled(self):
        # Lane 00 disabled raw file access; do not regress this on rebasing.
        self.assertIn("settings.setAllowFileAccess(false);", self.activity)
        self.assertIn("settings.setAllowFileAccessFromFileURLs(false);", self.activity)
        self.assertIn("settings.setAllowUniversalAccessFromFileURLs(false);", self.activity)

    def test_notification_permission_is_not_requested_on_launch(self):
        startup = self.activity.split("protected void onCreate", 1)[1].split("private void requestNotificationPermissionForTimer", 1)[0]
        self.assertNotIn("requestPermissions(", startup)
        self.assertIn("Manifest.permission.POST_NOTIFICATIONS", self.activity)
        self.assertIn("requestPermissions(", self.activity)
        self.assertIn("onRequestPermissionsResult", self.activity)
        self.assertIn("FocusAlarmReceiver.refreshLocale(this)", self.activity)

    def test_native_language_bridge_and_hebrew_guard(self):
        self.assertRegex(self.activity, r"@JavascriptInterface\s+public void setNativeLocale")
        self.assertIn("zen_native_locale_i18n_v1", self.locale)
        self.assertIn('"he"', self.locale)
        self.assertIn('"iw"', self.locale)
        self.assertIn("createConfigurationContext", self.locale)
        # Never mutate the WebView v21 storage schema.
        self.assertNotIn("zen_fortress_cfg_v21", self.locale)

    def test_saf_export_does_not_change_existing_backup_protocol(self):
        self.assertIn('startsWith("ZEN21::")', self.activity)
        self.assertIn("Intent.ACTION_CREATE_DOCUMENT", self.activity)
        self.assertIn("REQUEST_BACKUP_EXPORT = 7410", self.activity)
        self.assertIn('getBytes(StandardCharsets.UTF_8)', self.activity)
        self.assertIn('openOutputStream(data.getData(), "w")', self.activity)

    def test_no_hebrew_resources_or_new_permissions(self):
        self.assertFalse((RES / "values-he").exists())
        self.assertFalse((RES / "values-iw").exists())
        manifest = (APP / "AndroidManifest.xml").read_text(encoding="utf-8")
        self.assertNotIn("SCHEDULE_EXACT_ALARM", manifest)
        self.assertNotIn("READ_EXTERNAL_STORAGE", manifest)
        self.assertNotIn("MANAGE_EXTERNAL_STORAGE", manifest)
        self.assertNotIn("FOREGROUND_SERVICE", manifest)

if __name__ == "__main__":
    unittest.main()
