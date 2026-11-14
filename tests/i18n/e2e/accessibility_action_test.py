"""Real UIAutomation click transport must not replay a physical tap."""
import io
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch,MagicMock
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'tools/i18n/e2e'))
import android_device as device

class AccessibilityActionTest(unittest.TestCase):
    def test_clickable_virtual_node_uses_validated_native_action(self):
        node={'class':'android.widget.Button','text':'Notes','resource-id':'navNotes',
              'clickable':'true','bounds':'[119,340][170,385]'}
        connection=MagicMock()
        connection.makefile.return_value.__enter__.return_value=io.BytesIO(b'{"clicked":true}\n')
        with patch.dict(os.environ,{'DF13_UI_PORT':'38383'}),patch('socket.create_connection') as connect, \
             patch.object(device,'shell') as shell,patch.object(device.time,'sleep'):
            connect.return_value.__enter__.return_value=connection
            device.tap_node(node)
        connect.assert_called_once()
        self.assertTrue(connection.sendall.call_args.args[0].startswith(b'CLICK '))
        shell.assert_not_called()

    def test_rejected_action_is_not_repeated_as_a_coordinate_tap(self):
        node={'class':'android.widget.Button','text':'Save','clickable':'true','bounds':'[10,600][200,650]'}
        connection=MagicMock()
        connection.makefile.return_value.__enter__.return_value=io.BytesIO(b'{"error":"ambiguous or blocked by dialog"}\n')
        with patch.dict(os.environ,{'DF13_UI_PORT':'38383'}),patch('socket.create_connection') as connect, \
             patch.object(device,'shell') as shell,patch.object(device.time,'sleep'):
            connect.return_value.__enter__.return_value=connection
            with self.assertRaisesRegex(AssertionError,'ambiguous or blocked'):
                device.tap_node(node)
        shell.assert_not_called()

if __name__=='__main__':unittest.main()
