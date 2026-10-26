"""Persistent Android automation transport contract, not a device acceptance test."""
import io
import json
import os
import socket
import sys
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'tools/i18n/e2e'))
import android_device as device

class PersistentProbeTest(unittest.TestCase):
    def test_persistent_probe_reads_real_hierarchy_without_one_shot_uiautomator(self):
        xml = '<hierarchy><node text="Deep Focus" bounds="[0,1][200,60]"/></hierarchy>'
        connection = MagicMock()
        connection.makefile.return_value.__enter__.return_value = io.BytesIO(
            (json.dumps({'xml': xml})+'\n').encode())
        with patch.dict(os.environ, {'DF13_UI_PORT': '38383'}), patch('socket.create_connection') as connect, \
             patch.object(device.subprocess, 'run', side_effect=AssertionError('one-shot dump loses the WebView connection')):
            connect.return_value.__enter__.return_value = connection
            nodes = device.dump()
        self.assertTrue(device.has_visible(nodes, 'Deep Focus'))
        connection.sendall.assert_called_once_with(b'DUMP\n')

    def test_persistent_probe_error_never_uses_stale_hierarchy(self):
        connection = MagicMock()
        connection.makefile.return_value.__enter__.return_value = io.BytesIO(
            b'{"error":"null root"}\n')
        with patch.dict(os.environ, {'DF13_UI_PORT': '38383'}), patch('socket.create_connection') as connect:
            connect.return_value.__enter__.return_value = connection
            with self.assertRaisesRegex(AssertionError, 'null root'):
                device.dump()

if __name__ == '__main__':
    unittest.main()
