"""Record bounded operation metadata to locate VM loss without payloads."""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'tools/i18n/e2e'))
import android_device as device

class AdbTraceTest(unittest.TestCase):
    def test_text_input_payload_and_output_never_enter_trace(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ,{'DF13_EVIDENCE_DIR':directory}), patch.object(device.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout='private output',stderr='')):
                device.adb('shell','input','text','private authored text')
            records=[json.loads(row) for row in (Path(directory)/'ADB_OPERATIONS.jsonl').read_text().splitlines()]
        self.assertEqual([r['event'] for r in records],['start','end'])
        self.assertEqual(records[0]['operation'],'shell input')
        self.assertNotIn('private',json.dumps(records))

    def test_timeout_retains_last_operation_without_exception_payload(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ,{'DF13_EVIDENCE_DIR':directory}), patch.object(device.subprocess,'run',side_effect=device.subprocess.TimeoutExpired('private command',45)):
                with self.assertRaises(device.subprocess.TimeoutExpired): device.adb('shell','wm','size','393x800')
            records=[json.loads(row) for row in (Path(directory)/'ADB_OPERATIONS.jsonl').read_text().splitlines()]
        self.assertEqual(records[-1]['event'],'timeout')
        self.assertEqual(records[-1]['operation'],'shell wm')
        self.assertNotIn('private',json.dumps(records))
