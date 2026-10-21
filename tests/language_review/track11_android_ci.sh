#!/usr/bin/env bash
# Disposable GitHub Actions Android emulator ONLY. No access to the user's phone.
set -euo pipefail
report="$RUNNER_TEMP/track11-android"
mkdir -p "$report"
diagnostics() {
  timeout 20s adb exec-out screencap -p > "$report/android-final.png" || true
  timeout 20s adb logcat -d -s AndroidRuntime chromium > "$report/android-logcat.txt" || true
  timeout 15s adb shell dumpsys webviewupdate > "$report/webview-version.txt" || true
  timeout 10s adb shell getprop ro.build.version.sdk > "$report/device-api.txt" || true
  timeout 10s adb shell pm path com.zenstudy.focus > "$report/installed-apk.txt" || true
  adb forward --remove tcp:9222 >/dev/null 2>&1 || true
  printf '%s\n' 'REAL_ANDROID_TALKBACK=NOT_TESTED' 'NATIVE_DIALOG_TRANSLATION=NOT_TESTED' \
    'SAF_BACKUP_RESTORE=NOT_TESTED' 'HUMAN_TRANSLATION_REVIEW=NOT_TESTED' \
    'RELEASE_APPROVED=NO' > "$report/RELEASE_GATES.txt"
}
trap diagnostics EXIT
cp android/app/build/outputs/apk/debug/app-debug.apk "$report/app-debug.apk"
sha256sum "$report/app-debug.apk" > "$report/installed-apk.sha256"
adb install "$report/app-debug.apk"
adb shell pm grant com.zenstudy.focus android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
adb shell am start -n com.zenstudy.focus/.MainActivity
sleep 7
connect_cdp() {
  local pid
  pid="$(adb shell pidof com.zenstudy.focus | tr -d '\r' | awk '{print $1}')"
  test -n "$pid"
  adb forward --remove tcp:9222 >/dev/null 2>&1 || true
  adb forward tcp:9222 "localabstract:webview_devtools_remote_$pid"
}
connect_cdp
node tools/language_review/track11_android_probe.cjs switch "$report/switch-20-locales.json"
node tools/language_review/track11_android_probe.cjs backup "$report/backup-code-restore.json"
adb shell am force-stop com.zenstudy.focus
adb shell am start -n com.zenstudy.focus/.MainActivity
sleep 7
connect_cdp
node tools/language_review/track11_android_probe.cjs reopen "$report/reopen-persisted-rtl.json"
printf '%s\n' 'REAL_ANDROID_20_LOCALES=PASS' 'RTL_LOCALE_RESTART=PASS' \
 'ANDROID_DEVICE=API30_EMULATOR_ONLY' 'RELEASE_APPROVED=NO' > "$report/verified-scope.txt"
