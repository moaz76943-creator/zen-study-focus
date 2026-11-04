"""Crash metadata must remain useful without disclosing dump memory or names."""
import io
import struct
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'tools/i18n/e2e'))
from emulator_crash import summarize, collect, cgroup_snapshot

class CrashMetadataTest(unittest.TestCase):
    def test_classifies_faulting_graphics_module_without_publishing_paths_or_memory(self):
        buffer=bytearray(1024)
        struct.pack_into('<4sIIIIIQ',buffer,0,b'MDMP',0,2,32,0,0,0)
        struct.pack_into('<III',buffer,32,6,168,64)
        struct.pack_into('<III',buffer,44,4,112,256)
        struct.pack_into('<I',buffer,64+8,11)
        struct.pack_into('<Q',buffer,64+24,0x1234)
        struct.pack_into('<I',buffer,256,1)
        struct.pack_into('<QI',buffer,260,0x1000,0x1000)
        struct.pack_into('<I',buffer,280,500)
        name='/private/NEVER_PRINT_THIS/libvulkan_swiftshader.so'.encode('utf-16-le')
        struct.pack_into('<I',buffer,500,len(name));buffer[504:504+len(name)]=name
        buffer[800:820]=b'UNRELATED_DUMP_BYTES'
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'test.dmp';path.write_bytes(buffer)
            result=summarize(path)
        self.assertEqual(result['exception_code'],11)
        self.assertEqual(result['module_category'],'GRAPHICS')
        self.assertEqual(result['module_offset'],'0x234')
        self.assertNotIn('NEVER_PRINT_THIS',str(result))
        self.assertNotIn('UNRELATED_DUMP_BYTES',str(result))
        self.assertNotIn('libvulkan',str(result))

    def test_cgroup_limits_and_oom_events_are_numeric_metadata_only(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/'memory.max').write_text('4294967296')
            (root/'memory.events').write_text('oom 2\noom_kill 1\n')
            (root/'memory.current').write_text('DO_NOT_PRINT_THIS')
            result=cgroup_snapshot(root)
        self.assertEqual(result['memory.max'],4294967296)
        self.assertEqual(result['memory.events']['oom_kill'],1)
        self.assertEqual(result['memory.current'],'UNAVAILABLE')
        self.assertNotIn('DO_NOT_PRINT_THIS',str(result))

    def test_truncated_dump_is_a_diagnostic_failure_not_a_pass(self):
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory)/'partial.dmp').write_bytes(b'MDMP')
            result=collect(directory)
        self.assertFalse(result['crashes'][0]['parsed'])

if __name__=='__main__': unittest.main()
