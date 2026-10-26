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

 def test_api30_smoke_runs_real_bash_file_and_avoids_unstable_animation_settings(self):
  workflow=(R/'.github/workflows/df_pr04_api30_api35_smoke.yml').read_text()
  from subprocess import run
  script=R/'tests/i18n/native_android/df_pr04_smoke.sh'
  self.assertIn('disable-animations: false',workflow)
  self.assertNotIn('disable-animations: true',workflow)
  self.assertIn('script: bash tests/i18n/native_android/df_pr04_smoke.sh',workflow)
  self.assertNotIn('script: |',workflow)
  self.assertEqual(run(['bash','-n',str(script)],capture_output=True,text=True).returncode,0)
  source=script.read_text()
  self.assertIn('set -euo pipefail',source)
  self.assertIn('for attempt in 1 2 3; do',source)
  self.assertIn('timeout 40 adb wait-for-device',source)
  self.assertIn('test "$installed" -eq 1',source)
  self.assertIn('adb shell pm list packages',source)
  self.assertIn('adb shell pidof com.zenstudy.focus',source)

 def test_package_service_is_ready_before_attempting_to_install(self):
  # API30 run 40297710521 had sys.boot_completed=1 but no 'package'
  # Android service; three installation retries alone cannot fix that state.
  source=(R/'tests/i18n/native_android/df_pr04_smoke.sh').read_text()
  self.assertIn('adb shell service check package',source)
  self.assertIn('Service package: found',source)
  self.assertIn('test',source)
  self.assertIn('if [ "$ready" -ne 1 ]; then',source)
  self.assertLess(source.index('Service package: found'),source.index('if adb install -r'))
  self.assertIn("runtime NOT_TESTED",source)
