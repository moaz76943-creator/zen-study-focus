"""Isolation tests for disposable Android sound QA builds."""
import importlib.util
import json
import pathlib
import tempfile
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location("qa_build",ROOT/"tools/nature_audio/prepare_audioqa_android.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class IsolatedAPKTests(unittest.TestCase):
 def test_qa_build_has_different_package_and_does_not_bundle_legacy_web_assets(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp)
   java=root/"android/app/src/main/java/com/zenstudy/focus/MainActivity.java"
   gradle=root/"android/app/build.gradle"
   manifest=root/"android/app/src/main/AndroidManifest.xml"
   web=root/"android/app/src/main/assets/web"
   for f in (java,gradle,manifest):
    f.parent.mkdir(parents=True,exist_ok=True)
   java.write_text('if (Build.VERSION.SDK_INT >= 33) {}\nif (!"com.zenstudy.focus".equals(getPackageName())) {}\nwebView.loadUrl("file:///android_asset/web/index.html");',encoding="utf-8")
   gradle.write_text('applicationId "com.zenstudy.focus"',encoding="utf-8")
   manifest.write_text('<manifest><uses-permission android:name="android.permission.INTERNET" /><application android:label="Deep Focus"><service android:name=".FocusTimerService" /></application></manifest>',encoding="utf-8")
   web.mkdir(parents=True)
   (web/"app.js").write_text('existing legacy app',encoding="utf-8")
   audio_dir=root/"audio_candidates/commons_intake"
   audio_dir.mkdir(parents=True)
   content=b"OggS"+b"abc"*5000
   (audio_dir/"Rain.ogg").write_bytes(content)
   (audio_dir/"index.html").write_text('<!doctype html>QA original sound',encoding="utf-8")
   import hashlib
   sha1=hashlib.sha1(content).hexdigest()
   sha256=hashlib.sha256(content).hexdigest()
   data={"items":[{"id":"rain","file":"Rain.ogg","source_sha1":sha1,"source_sha256":sha256},
      {"id":"ocean","file":"Ocean.ogg","source_sha1":"0"*40,"source_sha256":"0"*64,
       "review_warnings":["BLOCKED_RIGHTS: conflicting origin"]}]}
   f=root/"tools/nature_audio/commons_intake.json"
   f.parent.mkdir(parents=True,exist_ok=True)
   f.write_text(json.dumps(data),encoding="utf-8")
   (audio_dir/"qa_report.json").write_text(json.dumps([{"id":"rain","original_sha1":sha1,"original_sha256":sha256,"status":"QUARANTINED_NOT_APPROVED"},{"id":"ocean","status":"BLOCKED_RIGHTS","original_downloaded":False}]),encoding="utf-8")
   mod.prepare(root)
   self.assertIn('com.zenstudy.focus.audioqa',gradle.read_text())
   self.assertIn('audio_review/index.html',java.read_text())
   self.assertNotIn('com.zenstudy.focus".equals',java.read_text())
   self.assertIn('Deep Focus Audio QA',manifest.read_text())
   self.assertNotIn('android.permission.INTERNET',manifest.read_text())
   self.assertFalse((web/"app.js").exists())
   self.assertTrue((web/"audio_review/Rain.ogg").exists())
   self.assertFalse((web/"audio_review/Ocean.ogg").exists())
   self.assertTrue((web/"audio_review/index.html").exists())

if __name__=="__main__": unittest.main()
