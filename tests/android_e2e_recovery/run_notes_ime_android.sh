#!/usr/bin/env bash
# Disposable Android emulator only. No owner's real application files.
set -euo pipefail
root="$RUNNER_TEMP/df-note-android"
mkdir -p "$root"
capture() {
  timeout 15s adb exec-out screencap -p > "$root/screen.png" || true
  timeout 12s adb shell uiautomator dump /sdcard/df-note-qa.xml >/dev/null 2>&1 || true
  timeout 10s adb exec-out cat /sdcard/df-note-qa.xml > "$root/hierarchy.xml" || true
  timeout 12s adb logcat -d -s AndroidRuntime chromium > "$root/logcat.txt" || true
  adb forward --remove tcp:9222 >/dev/null 2>&1 || true
}
trap capture EXIT
apk="android/app/build/outputs/apk/debug/app-debug.apk"
sha256sum "$apk" > "$root/tested-apk.sha256"
adb install "$apk"
adb shell am start -n com.zenstudy.focus/.MainActivity
sleep 6
pid="$(adb shell pidof com.zenstudy.focus | tr -d '\r' | awk '{print $1}')"
test -n "$pid"
adb forward tcp:9222 "localabstract:webview_devtools_remote_${pid}"
export DF_ANDROID_DISPOSABLE=1
export DF_ANDROID_CASES=preflight,notes_create_edit,tasks_create
node tests/android_e2e_recovery/cdp_actions.cjs "$root/note-android-actions.json"
