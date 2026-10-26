"""Source regressions for real UIAutomator races; no Android PASS inferred."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'tools/i18n/e2e'))
import android_device as device


class DeviceReadinessTest(unittest.TestCase):
    def test_hidden_duplicate_does_not_shadow_visible_navigation(self):
        hidden = {'text': 'Tasks', 'bounds': '[0,0][0,0]'}
        shown = {'text': 'Tasks', 'bounds': '[12,700][60,750]'}
        self.assertIs(device.visible([hidden, shown], 'Tasks'), shown)
        self.assertFalse(device.has_visible([hidden], 'Tasks'))

    def test_empty_iso_badge_is_not_visible(self):
        self.assertFalse(device.has_iso_badge([{'text': 'AR', 'bounds': '[0,0][0,0]'}], 'ar'))

    def test_dump_waits_for_webview_virtual_children(self):
        native = '<hierarchy><node class="android.webkit.WebView" text="" bounds="[0,0][393,800]"/></hierarchy>'
        ready = '<hierarchy><node class="android.webkit.WebView"><node text="Deep Focus" bounds="[10,10][200,60]"/></node></hierarchy>'
        responses = [SimpleNamespace(returncode=0, stdout=s, stderr='')
                     for s in ('UI hierchary dumped', native, 'UI hierchary dumped', ready)]
        with patch.object(device.subprocess, 'run', side_effect=responses) as run, patch.object(device.time, 'sleep'):
            nodes = device.dump()
        self.assertEqual(run.call_count, 4)
        self.assertTrue(device.has_visible(nodes, 'Deep Focus'))

    def test_dump_rejects_empty_hierarchy(self):
        responses = [SimpleNamespace(returncode=0, stdout=s, stderr='')
                     for _ in range(4) for s in ('dumped', '<hierarchy/>')]
        with patch.object(device.subprocess, 'run', side_effect=responses), patch.object(device.time, 'sleep'):
            with self.assertRaises(AssertionError):
                device.dump()


if __name__ == '__main__':
    unittest.main()
