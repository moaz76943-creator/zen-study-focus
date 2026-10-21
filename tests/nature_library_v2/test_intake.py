"""Audio source pin tests (no Internet and no local audio required)."""
import importlib.util
import pathlib
import unittest

MODULE = pathlib.Path(__file__).resolve().parents[2] / "tools/nature_audio/collect_commons_audio.py"
spec = importlib.util.spec_from_file_location("collect_commons_audio", MODULE)
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)

class PinnedOriginalTests(unittest.TestCase):
    def test_known_sound_bytes_match_both_hashes(self):
        sample = b"OggS" + b"test-original" * 24
        import hashlib
        self.assertTrue(audio.verify_original_bytes(sample, hashlib.sha1(sample).hexdigest(), hashlib.sha256(sample).hexdigest()))

    def test_source_hash_change_rejected(self):
        sample = b"OggS" + b"audio" * 44
        with self.assertRaises(ValueError):
            audio.verify_original_bytes(sample, "0" * 40, "0" * 64)

    def test_missing_sha256_is_not_shippable(self):
        with self.assertRaises(ValueError):
            audio.verify_original_bytes(b"OggSabc", "0" * 40, None)

if __name__=="__main__":
    unittest.main()
