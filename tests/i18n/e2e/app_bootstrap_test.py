"""Cold-launch static HTML must not count as initialized application state."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'tools/i18n/e2e'))
import android_device as device

class AppBootstrapTest(unittest.TestCase):
    def test_restart_waits_past_static_html_for_the_initialized_locale_control(self):
        initial=[{'text':'EN English','class':'android.widget.Button','clickable':'true','bounds':'[10,10][180,45]'}]
        ready=[{'text':'AR Arabic • العربية','class':'android.widget.Button','clickable':'true','bounds':'[10,10][180,45]'}]
        with patch.object(device,'shell'),patch.object(device.time,'sleep'), \
             patch.object(device,'current_console_evidence',return_value=[]),patch.object(device,'dump',side_effect=[initial,ready]) as dump:
            nodes=device.restart()
        self.assertIs(nodes,ready)
        self.assertEqual(dump.call_count,2)

if __name__=='__main__':unittest.main()
