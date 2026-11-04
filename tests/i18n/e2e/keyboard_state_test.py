"""Only dismiss a positively observed IME; Back must not dismiss app dialogs."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'tools/i18n/e2e'))
import android_device as device

class KeyboardStateTest(unittest.TestCase):
    def test_current_ime_state_wins_over_historical_entries(self):
        self.assertFalse(device.keyboard_shown('mInputShown=false\nHistory: mInputShown=true'))
        self.assertTrue(device.keyboard_shown('mInputShown=true\nHistory: mInputShown=false'))

    def test_unrecognized_state_does_not_authorize_back(self):
        self.assertIsNone(device.keyboard_shown('service unavailable'))
        self.assertTrue(device.keyboard_shown('mIsInputViewShown=true'))

if __name__=='__main__':unittest.main()
