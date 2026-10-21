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
        self.assertIn('[0:a]asetpts=N/SR/TB,asplit',graph)
        self.assertIn('concat=n=2:v=0:a=1,asetpts=N/SR/TB',graph)
        self.assertNotIn('sine',graph)
        for args in [(1,1,.7),(30,0,.7),(30,1,2),(float('nan'),1,.7)]:
            with self.subTest(args=args),self.assertRaises(ValueError):mod.loop_filter(*args)

    def test_pcm_metrics_reject_partial_nonfinite_and_empty_audio(self):
        for chunks in [[], [b'123'], [struct.pack('<f',float('nan'))], [struct.pack('<f',float('inf'))]]:
            with self.subTest(chunks=chunks),self.assertRaises(ValueError):
                mod.pcm_metrics(chunks,1,48000)

    def test_twenty_files_do_not_satisfy_twenty_different_required_slots(self):
        manifest=json.loads((ROOT/'tools/nature_audio/commons_intake.json').read_text())
        manifest.pop('replacement_candidates',None)
        for slot in manifest['required_slots']:slot.pop('replacement_candidate_id',None)
        coverage=mod.required_coverage(manifest)
        self.assertEqual(len(coverage),20)
        self.assertEqual(len({r['slot_id'] for r in coverage}),20)
        for slot in coverage:
            self.assertFalse(slot['ready'])
        missing={r['slot_id'] for r in coverage if r['status']=='MISSING'}
        self.assertTrue({'waterfall','coastal_wind','fire','rain_soft','night_crickets'}<=missing)
        self.assertTrue(all(r['status']!='AVAILABLE' for r in coverage))

    def test_requested_cohort_is_fail_closed_until_all_twenty_have_distinct_sources(self):
        manifest=json.loads((ROOT/'tools/nature_audio/commons_intake.json').read_text())
        coverage=mod.required_coverage(manifest)
        self.assertEqual(sum(r['status']=='CANDIDATE' for r in coverage),20)
        selected=mod.requested_sources(manifest)
        self.assertEqual(len({r['source_sha256'] for r in selected}),20)
        for slot in manifest['required_slots']:
            if slot['slot_id']=='coastal_wind':slot.pop('replacement_candidate_id',None)
        with self.assertRaisesRegex(ValueError,'coastal_wind'):
            mod.requested_sources(manifest)
        self.assertTrue(all(not r['ready'] for r in coverage))

    def test_different_identifiers_cannot_hide_reused_original_bytes(self):
        manifest=json.loads((ROOT/'tools/nature_audio/commons_intake.json').read_text())
        selected=mod.requested_sources(manifest)
        first=selected[0]['id']
        for source in manifest['replacement_candidates']+manifest['items']:
            if source['id']==first:source['source_sha256']=selected[1]['source_sha256']
        with self.assertRaisesRegex(ValueError,'Reused bytes'):
            mod.requested_sources(manifest)

    def test_one_source_cannot_fill_multiple_requested_slots(self):
        manifest={'items':[{'id':'one'}], 'required_slots':[
            {'slot_id':'ocean','candidate_id':'one'}, {'slot_id':'waves_calm','candidate_id':'one'}]}
        with self.assertRaises(ValueError):mod.required_coverage(manifest)

if __name__=='__main__':unittest.main()

class FirstPartyRightsTests(unittest.TestCase):
    PAGE='https://bigsoundbank.com/sea-waves-s0698.html'
    HTML='''<link rel="canonical" href="https://bigsoundbank.com/sea-waves-s0698.html">
    <meta name="description" content="Waves recorded at the Atlantic Ocean.">
    <audio><source type="audio/ogg" src="/UPLOAD/ogg/698.ogg?v=d"></audio>
    <h2>License</h2><p>CC0 (public domain): Free and royalty-free</p>
    <h2>Technical details</h2><p><strong>Conditions</strong>: Outdoor<br>
    <strong>Author</strong>: <a>Joseph SARDIN</a><br><strong>Sound number</strong>: 698</p>
    <h2>Other interesting files</h2>'''
    def test_official_page_binds_actual_author_to_exact_publisher_audio(self):
        out=mod.parse_bigsound_page(self.HTML,self.PAGE,698)
        self.assertEqual(out['author'],'Joseph SARDIN')
        self.assertEqual(out['original_url'],'https://bigsoundbank.com/UPLOAD/ogg/698.ogg?v=d')
        self.assertIn('Atlantic Ocean',out['description'])
        self.assertEqual(out['human_listening'],'NOT_TESTED')
        self.assertFalse(out['ready'])
    def test_rights_in_another_section_do_not_license_this_recording(self):
        text=self.HTML.replace('CC0 (public domain): Free and royalty-free','CC BY-NC 4.0')+'<footer>CC0 (public domain): Free and royalty-free</footer>'
        with self.assertRaises(ValueError):mod.parse_bigsound_page(text,self.PAGE,698)
    def test_source_redirect_or_number_mismatch_is_rejected(self):
        for page,ident in [('https://evil.test/sea-waves-s0698.html',698),(self.PAGE,699)]:
            with self.assertRaises(ValueError):mod.parse_bigsound_page(self.HTML,page,ident)
    def test_a_global_site_author_is_not_the_sound_recordist(self):
        out=mod.parse_bigsound_page('<meta name="author" content="Wrong Person">'+self.HTML,self.PAGE,698)
        self.assertEqual(out['author'],'Joseph SARDIN')

class OfficialPreviewIdentityTests(unittest.TestCase):
    PAGE='https://freesound.org/people/Recordist/sounds/123456/'
    HTML='''<meta property="og:url" content="https://freesound.org/people/Recordist/sounds/123456/">
      <meta property="og:audio:artist" content="Recordist">
      <a title="Go to the full license text" href="https://creativecommons.org/publicdomain/zero/1.0/">Creative Commons0</a>
      <div data-sound-id="123456" data-ogg="https://cdn.freesound.org/previews/123/123456_987-lq.ogg"></div>
      <p>Recorded real light rain.</p>'''
    def test_official_published_preview_is_not_claimed_as_raw_recording_master(self):
        receipt=mod.parse_freesound_page(self.HTML,self.PAGE,'Recordist',123456,'Recorded real light rain.')
        self.assertIn('PREVIEW_NOT_RECORDER_MASTER',receipt['source_variant'])
        self.assertFalse(receipt['ready'])
    def test_related_cc0_link_cannot_override_a_restricted_current_sound(self):
        bad=self.HTML.replace('publicdomain/zero/1.0/','licenses/by-nc/4.0/')+'<footer><a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a></footer>'
        with self.assertRaises(ValueError):mod.parse_freesound_page(bad,self.PAGE,'Recordist',123456,'Recorded real light rain.')
    def test_wrong_artist_or_other_sound_preview_is_rejected(self):
        for text in [self.HTML.replace('content="Recordist"','content="Other"'),self.HTML.replace('123456_987','123455_987')]:
            with self.assertRaises(ValueError):mod.parse_freesound_page(text,self.PAGE,'Recordist',123456,'Recorded real light rain.')
