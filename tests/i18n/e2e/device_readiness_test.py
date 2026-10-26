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

    def test_exact_navigation_wins_over_section_heading(self):
        heading = {'text': 'Tasks Studio', 'bounds': '[10,100][200,150]'}
        navigation = {'text': 'Tasks', 'bounds': '[10,720][60,780]'}
        self.assertIs(device.visible([heading, navigation], 'Tasks'), navigation)

    def test_combined_webview_language_button_exposes_iso(self):
        header = {'text': 'AR Arabic • العربية', 'bounds': '[10,10][180,45]'}
        self.assertTrue(device.has_iso_badge([header], 'ar'))
        self.assertFalse(device.has_iso_badge([header], 'fr'))

    def test_search_input_cannot_prove_a_saved_task(self):
        field = {'text': 'DF13_TASK_123', 'class': 'android.widget.EditText', 'bounds': '[10,100][200,150]'}
        self.assertFalse(device.has_record([field], 'DF13_TASK_123'))
        record = {'text': 'DF13_TASK_123', 'class': 'android.view.View', 'bounds': '[10,200][200,250]'}
        self.assertTrue(device.has_record([field, record], 'DF13_TASK_123'))

    def test_partly_clipped_editor_field_keeps_a_tappable_area(self):
        field = {'text': '', 'resource-id': 'inpNoteTitle', 'bounds': '[-15,174][408,211]'}
        self.assertTrue(device.is_visible_node(field))
        self.assertIs(device.visible([field], 'inpNoteTitle'), field)

    def test_navigation_uses_native_resource_id_before_duplicate_calendar_tab(self):
        from unittest.mock import patch
        tab = {'text': 'Calendar', 'bounds': '[10,300][100,350]'}
        nav = {'text': 'Calendar', 'resource-id': 'navCalendar', 'bounds': '[60,700][120,750]'}
        with patch.object(device, 'dump', return_value=[tab,nav]), patch.object(device, 'tap_node') as tap:
            device.click('Calendar')
        tap.assert_called_once_with(nav)

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
