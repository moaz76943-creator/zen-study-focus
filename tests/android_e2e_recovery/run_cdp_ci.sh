#!/usr/bin/env bash
# Fresh disposable CI emulator only; never owner device data.
set -euo pipefail
report="$RUNNER_TEMP/deep-focus-android-webview"
capture() {
  timeout 20s adb exec-out screencap -p > "$report/screen.png" || true
  timeout 20s adb shell uiautomator dump /sdcard/rescue-webview.xml >/dev/null 2>&1 || true
  timeout 10s adb exec-out cat /sdcard/rescue-webview.xml > "$report/hierarchy.xml" || true
  timeout 20s adb logcat -d -s AndroidRuntime chromium > "$report/logcat.txt" || true
  test ! -s "$report/logcat.txt" || tail -n 80 "$report/logcat.txt"
  adb forward --remove tcp:9222 >/dev/null 2>&1 || true
}
trap capture EXIT
adb install android/app/build/outputs/apk/debug/app-debug.apk
adb shell pm grant com.zenstudy.focus android.permission.POST_NOTIFICATIONS || true
adb shell am start -n com.zenstudy.focus/.MainActivity
sleep 5
pid="$(adb shell pidof com.zenstudy.focus | tr -d '\r' | awk '{print $1}')"
test -n "$pid"
adb forward tcp:9222 "localabstract:webview_devtools_remote_${pid}"
node tests/android_e2e_recovery/cdp_dom_smoke.cjs "$report/results.json"
