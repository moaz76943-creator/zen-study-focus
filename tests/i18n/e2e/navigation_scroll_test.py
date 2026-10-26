"""Regressions derived from API30 native sort-popup and Analytics evidence."""
import re
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'tools/i18n/e2e'))
import android_device as device

class NavigationScrollTest(unittest.TestCase):
    def test_record_scroll_does_not_start_on_native_form_controls(self):
        frame = {'bounds': '[0,0][393,800]'}
        spinner = {'class': 'android.widget.Spinner', 'bounds': '[14,494][379,652]'}
        with patch.object(device, 'dump', side_effect=[[frame,spinner],[frame]]), \
             patch.object(device, 'shell') as shell, patch.object(device.time, 'sleep'):
            device.reveal(lambda nodes: len(nodes) == 1)
        args = shell.call_args.args
        self.assertEqual(args[:2], ('input','swipe'))
        x, y = args[2:4]
        self.assertFalse(14 <= x <= 379 and 494 <= y <= 652,
                         'a down event on the native select opens its popup before scrolling')

    def test_modal_scroll_keeps_the_gesture_inside_the_dialog(self):
        frame = {'bounds': '[0,0][393,800]'}
        with patch.object(device, 'dump', side_effect=[[frame],[frame]]), \
             patch.object(device, 'shell') as shell, patch.object(device.time, 'sleep'):
            device.reveal(lambda nodes: device.dump.call_count == 2, gutter=False)
        self.assertEqual(shell.call_args.args[2], 393 // 2)

    def test_analytics_markers_match_the_actual_english_studio(self):
        source = (ROOT / 'android/app/src/main/assets/web/analytics_studio.js').read_text()
        english = source.split('const EN=Object.freeze({',1)[1].split('});',1)[0]
        fields = dict(re.findall(r"\b(title|minutes):'([^']+)'",english))
        markers = dict(device.NAVIGATION_CASES)['Analytics']
        self.assertEqual(set(markers),set(fields.values()))

if __name__ == '__main__':
    unittest.main()
