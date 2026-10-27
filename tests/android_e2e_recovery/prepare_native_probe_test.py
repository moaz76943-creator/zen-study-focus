import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('prepare_native_probe', Path(__file__).with_name('prepare_native_probe.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class NativeProbeResourceTest(unittest.TestCase):
    def test_exact_allowlist_tracks_actual_resource_without_capturing_other_text(self):
        with tempfile.TemporaryDirectory() as directory:
            probe = Path(directory) / 'Probe.java'
            resources = Path(directory) / 'strings.xml'
            resources.write_text('<resources><string name="native_backup_import_failed">Unable to read backup; existing data unchanged</string></resources>')
            probe.write_text('if (!"Unable to read backup; data unchanged".equals(string(text))) continue;')
            module.prepare(probe, resources)
            expected = 'if (!"Unable to read backup; existing data unchanged".equals(string(text))) continue;'
            self.assertEqual(probe.read_text(), expected)
            module.prepare(probe, resources)
            self.assertEqual(probe.read_text(), expected)

    def test_missing_resource_or_changed_probe_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            probe, resources = Path(directory) / 'Probe.java', Path(directory) / 'strings.xml'
            probe.write_text('unreviewed probe')
            resources.write_text('<resources/>')
            with self.assertRaises(ValueError): module.prepare(probe, resources)
            resources.write_text('<resources><string name="native_backup_import_failed">Rejected</string></resources>')
            with self.assertRaises(ValueError): module.prepare(probe, resources)
            self.assertEqual(probe.read_text(), 'unreviewed probe')


if __name__ == '__main__':
    unittest.main()
