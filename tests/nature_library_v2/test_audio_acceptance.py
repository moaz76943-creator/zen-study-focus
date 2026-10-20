"""Evidence gates: hostile metadata, real PCM metrics and honest required-slot coverage."""
import importlib.util
import pathlib
import unittest
import json
import struct

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('intake_acceptance', ROOT/'tools/nature_audio/collect_commons_audio.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class AudioAcceptanceTests(unittest.TestCase):
    def test_license_is_an_allowlist_not_a_substring(self):
        self.assertEqual(mod.validate_license('CC0-1.0', {'LicenseShortName': {'value': 'CC0'}}), 'CC0')
        self.assertEqual(mod.validate_license('PD-author', {'LicenseShortName': {'value': 'Public domain'}}), 'Public domain')
        for declared, actual in [('CC-BY-NC', 'Public domain'), ('PD-author', 'Not public domain'),
                                  ('CC0-1.0', 'CC BY-SA 4.0'), ('PD-author', 'Public domain mark disputed')]:
            with self.subTest(declared=declared,actual=actual), self.assertRaises(ValueError):
                mod.validate_license(declared, {'LicenseShortName': {'value': actual}})

    def test_pcm_metrics_detect_clipping_dc_silence_and_wrap_jump(self):
        # Numerical unit fixture only, never shipped or called a nature recording.
        data = struct.pack('<8f', 0,0,.25,.25,.25,.25,1,-1)
        out=mod.pcm_metrics([data[:16], data[16:]], channels=2, sample_rate=4)
        self.assertEqual(out['frames'],4)
        self.assertEqual(out['duration_seconds'],1)
        self.assertEqual(out['clipped_samples'],2)
        self.assertEqual(out['silent_frames'],1)
        self.assertEqual(out['boundary_jump_peak'],1)
        self.assertNotEqual(out['pcm_sha256'],mod.pcm_metrics([b'\0'*32],2,4)['pcm_sha256'])
        self.assertEqual(out['perceptual_loop_review'],'NOT_TESTED')

    def test_loop_recipe_is_bounded_and_uses_original_edges_without_synthetic_sources(self):
        graph=mod.loop_filter(30,1,.7)
        self.assertIn('acrossfade=d=1',graph)
        self.assertIn('atrim=start=1:end=29',graph)
        self.assertIn('volume=0.7',graph)
        self.assertNotIn('sine',graph)
        for args in [(1,1,.7),(30,0,.7),(30,1,2),(float('nan'),1,.7)]:
            with self.subTest(args=args),self.assertRaises(ValueError):mod.loop_filter(*args)

    def test_pcm_metrics_reject_partial_nonfinite_and_empty_audio(self):
        for chunks in [[], [b'123'], [struct.pack('<f',float('nan'))], [struct.pack('<f',float('inf'))]]:
            with self.subTest(chunks=chunks),self.assertRaises(ValueError):
                mod.pcm_metrics(chunks,1,48000)

    def test_twenty_files_do_not_satisfy_twenty_different_required_slots(self):
        manifest=json.loads((ROOT/'tools/nature_audio/commons_intake.json').read_text())
        coverage=mod.required_coverage(manifest)
        self.assertEqual(len(coverage),20)
        self.assertEqual(len({r['slot_id'] for r in coverage}),20)
        for slot in coverage:
            self.assertFalse(slot['ready'])
        missing={r['slot_id'] for r in coverage if r['status']=='MISSING'}
        self.assertTrue({'waterfall','coastal_wind','fire','rain_soft','night_crickets'}<=missing)
        self.assertTrue(all(r['status']!='AVAILABLE' for r in coverage))

    def test_one_source_cannot_fill_multiple_requested_slots(self):
        manifest={'items':[{'id':'one'}], 'required_slots':[
            {'slot_id':'ocean','candidate_id':'one'}, {'slot_id':'waves_calm','candidate_id':'one'}]}
        with self.assertRaises(ValueError):mod.required_coverage(manifest)

if __name__=='__main__':unittest.main()
