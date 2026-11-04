import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'tools/i18n/e2e'))
from android_device import console_evidence, AppRuntimeError, failure_kind

class ConsoleEvidenceTest(unittest.TestCase):
    def test_only_static_asset_location_and_error_kind_are_retained(self):
        raw='I chromium: [INFO:CONSOLE(449)] "Uncaught TypeError: DO_NOT_PUBLISH", source: file:///android_asset/web/app.js (449)'
        result=console_evidence(raw)
        self.assertEqual(result[0]['line'],449)
        self.assertEqual(result[0]['kind'],'TypeError')
        self.assertNotIn('DO_NOT_PUBLISH',str(result))
        self.assertEqual(failure_kind(AppRuntimeError(result)),'APP_RUNTIME')

    def test_regular_console_messages_are_not_app_failures(self):
        self.assertEqual(console_evidence('[INFO:CONSOLE(12)] "Audio playback waiting for tap"'),[])

if __name__=='__main__':unittest.main()
