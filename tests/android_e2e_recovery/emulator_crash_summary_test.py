import importlib.util
from pathlib import Path
import struct
import unittest

spec = importlib.util.spec_from_file_location('emulator_crash_summary', Path(__file__).with_name('emulator_crash_summary.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CrashMetadataTest(unittest.TestCase):
    def test_exception_identifies_module_without_paths_or_memory(self):
        data = bytearray(512)
        data[:4] = b'MDMP'
        struct.pack_into('<II', data, 8, 2, 32)
        struct.pack_into('<III', data, 32, 6, 32, 64)
        struct.pack_into('<III', data, 44, 4, 112, 128)
        struct.pack_into('<I', data, 72, 11)
        struct.pack_into('<Q', data, 88, 0x1234)
        struct.pack_into('<I', data, 128, 1)
        struct.pack_into('<QI', data, 132, 0x1000, 0x1000)
        struct.pack_into('<I', data, 152, 300)
        name = '/private/DO_NOT_EMIT/libemulator.so'.encode('utf-16le')
        struct.pack_into('<I', data, 300, len(name))
        data[304:304 + len(name)] = name
        result = module.summarize(data)
        self.assertEqual(result, {'status': 'EXCEPTION_RECORDED', 'exception_code': '0xb', 'module': 'libemulator.so', 'module_offset': '0x234'})
        self.assertNotIn('DO_NOT_EMIT', str(result))

    def test_untrusted_or_truncated_directories_are_rejected(self):
        with self.assertRaises(ValueError): module.summarize(b'not a dump')
        data = bytearray(32)
        data[:4] = b'MDMP'
        struct.pack_into('<II', data, 8, 2, 32)
        with self.assertRaises(ValueError): module.summarize(data)


if __name__ == '__main__':
    unittest.main()
