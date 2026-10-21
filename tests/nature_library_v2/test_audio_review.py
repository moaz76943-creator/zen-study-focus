"""Ensure exported offline Android listening sheet is safe and truthful."""
import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location("audio_review", ROOT / "tools/nature_audio/build_audio_review.py")
review=importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)

class OfflineReviewTests(unittest.TestCase):
    def test_native_audio_controls_for_verified_files_only(self):
        records=[{"id":"ocean","file":"Ocean_Waves_on_a_Tropical_Beach.ogg",
                  "author":"Jarrod stanley","license":"CC0-1.0",
                  "license_evidence":"https://commons.wikimedia.org/wiki/File:Ocean_Waves_on_a_Tropical_Beach.ogg"},
                 {"id":"river","file":"Sanna_river_rapids.ogg",
                  "author":"Jarrod stanley","license":"CC0-1.0",
                  "license_evidence":"https://commons.wikimedia.org/wiki/File:Sanna_river_rapids.ogg"}]
        html=review.render_html(records)
        self.assertEqual(html.count("<audio "), 2)
        self.assertIn("stopAllAudio", html)
        self.assertNotIn("<audio controls",html)
        self.assertIn("offline", html.lower())
        self.assertIn("Ocean_Waves_on_a_Tropical_Beach.ogg", html)
        self.assertNotIn("autoplay", html.lower())

    def test_known_rights_conflict_has_no_audio_or_play_control(self):
        record={"id":"ocean","file":"Ocean.ogg","author":"source author","license":"CC0-1.0",
                "license_evidence":"https://commons.wikimedia.org/wiki/File:Ocean.ogg",
                "review_warnings":["BLOCKED_RIGHTS: conflicting original music metadata"]}
        text=review.render_html([record])
        self.assertNotIn('<audio ',text)
        self.assertNotIn('data-play>',text)
        self.assertIn('BLOCKED_RIGHTS',text)

    def test_public_build_stamp_rejects_markup_and_never_claims_an_unstamped_local_review_is_ci(self):
        rows=[{"id":"rain","file":"Rain.ogg","author":"fixture","license":"PD-author",
               "license_evidence":"https://commons.wikimedia.org/wiki/File:Rain.ogg"}]
        self.assertIn('LOCAL_REVIEW_UNSTAMPED',review.render_html(rows))
        self.assertIn('content="'+('a'*40)+'"',review.render_html(rows,'a'*40))
        with self.assertRaises(ValueError):review.render_html(rows,'<script>')

    def test_source_description_is_escaped_not_html(self):
        rows=[{"id":"rain", "file":"Rain.ogg", "author":"<script>alert(1)</script>",
               "license":"PD-author",
               "license_evidence":"https://commons.wikimedia.org/wiki/File:Rain.ogg"}]
        html=review.render_html(rows)
        self.assertNotIn("<script>alert(1)</script>",html)
        self.assertIn("&lt;script&gt;",html)

if __name__=="__main__":
    unittest.main()
