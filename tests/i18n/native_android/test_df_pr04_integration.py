import unittest
from pathlib import Path
from xml.etree import ElementTree as ET
R=Path(__file__).resolve().parents[3]
J=R/'android/app/src/main/java/com/zenstudy/focus'
class PR04NativeSafety(unittest.TestCase):
 def test_package_id_and_saf(self):
  src=(J/'MainActivity.java').read_text()
  self.assertIn('"com.zenstudy.focus".equals(getPackageName())',src)
  self.assertNotIn('com.deepfocus.study',src)
  for s in ('REQUEST_BACKUP_IMPORT','ACTION_OPEN_DOCUMENT','MAX_BACKUP_IMPORT_BYTES','backupImportPickerOpen','verifyAndRestoreBackupCode','JSONObject.quote(backupCode)'): self.assertIn(s,src)
 def test_consent_on_user_timer_start_only(self):
  src=(J/'MainActivity.java').read_text()
  oncreate=src.split('protected void onCreate(',1)[1].split('private void requestNotificationPermissionForTimer()',1)[0]
  self.assertNotIn('requestPermissions(',oncreate)
  self.assertIn('runOnUiThread(() -> requestNotificationPermissionForTimer())',src)
 def test_native_sync_after_language_persist(self):
  src=(R/'android/app/src/main/assets/web/app.js').read_text()
  body=src.split('function applyLanguage(code)',1)[1].split('function generateEncryptedBackupCode()',1)[0]
  self.assertLess(body.index("saveFortressData('zen_fortress_cfg_v21', cfg)"),body.index('window.ZenNative.setNativeLocale(meta.code)'))
  self.assertIn('cfg.lang=previousLang',body)
  self.assertIn('if (el.isContentEditable',body)
 def test_native_resources_and_hebrew_excluded(self):
  x=[]
  for l in ('','-ar','-fa','-ur','-de','-es','-fr'):
   f=R/('android/app/src/main/res/values'+l+'/strings.xml')
   d={t.attrib['name']:''.join(t.itertext()) for t in ET.parse(f).getroot().findall('string')}
   for k in ('native_backup_import_picker_unavailable','native_backup_import_failed','native_notification_time_up'): self.assertTrue(d.get(k),(l,k))
   x.append(set(d))
  for keys in x[1:]:self.assertEqual(keys,x[0])
  for l in ('he','iw'):self.assertFalse((R/('android/app/src/main/res/values-'+l)).exists())
  native=(J/'NativeLocaleStrings.java').read_text()
  self.assertIn('"he".equals(code)',native)
  self.assertIn('"iw".equals(code)',native)
 def test_v21_native_session_preserved(self):
  receiver=(J/'FocusAlarmReceiver.java').read_text()
  self.assertIn('zen_native_timer_alarm_v21',receiver)
  self.assertIn('lastNotified',receiver)
  self.assertIn('refreshLocale(Context context)',receiver)

 def test_api30_smoke_avoids_nonessential_adb_settings_failure(self):
  workflow=(R/'.github/workflows/df_pr04_api30_api35_smoke.yml').read_text()
  # Regression: run 40246699557 reached API30 boot but the emulator-runner
  # died setting window_animation_scale (ADB Broken pipe) before app launch.
  self.assertIn('disable-animations: false',workflow)
  self.assertNotIn('disable-animations: true',workflow)
  self.assertIn('set -eu',workflow)
  self.assertIn('adb shell pidof com.zenstudy.focus',workflow)

 def test_api30_package_manager_transient_failure_retries_then_fails_closed(self):
  workflow=(R/'.github/workflows/df_pr04_api30_api35_smoke.yml').read_text()
  # Real API30 job 40294077475 returned ADB PackageManager Broken pipe.
  self.assertIn('for attempt in 1 2 3',workflow)
  self.assertIn('timeout 40 adb wait-for-device',workflow)
  self.assertIn('test "$installed" -eq 1',workflow)
  self.assertIn('adb shell pm list packages',workflow)
