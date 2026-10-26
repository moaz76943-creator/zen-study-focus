#!/usr/bin/env bash
set -euo pipefail
report="$RUNNER_TEMP/df-pr01-android"
mkdir -p "$report"
capture(){
  timeout 20 adb exec-out screencap -p > "$report/final.png" || true
  timeout 20 adb shell uiautomator dump /sdcard/p0-final.xml >/dev/null 2>&1 || true
  timeout 10 adb exec-out cat /sdcard/p0-final.xml > "$report/final.xml" || true
  timeout 20 adb logcat -d -s AndroidRuntime chromium > "$report/logcat.txt" || true
  adb forward --remove tcp:9222 >/dev/null 2>&1 || true
}
trap capture EXIT
cp android/app/build/outputs/apk/debug/app-debug.apk "$report/tested-debug.apk"
git rev-parse HEAD HEAD:android > "$report/source-sha-and-android-tree.txt"
adb install "$report/tested-debug.apk"
installed_path="$(adb shell pm path com.zenstudy.focus | tr -d '\r' | sed -n 's/^package://p')"
test -n "$installed_path"
adb pull "$installed_path" "$report/installed-base.apk"
sha256sum "$report/installed-base.apk" > "$report/installed-apk.sha256"
test "$(sha256sum "$report/installed-base.apk" | cut -d ' ' -f1)" = "$(sha256sum "$report/tested-debug.apk" | cut -d ' ' -f1)"
rm "$report/installed-base.apk"
adb shell am start -n com.zenstudy.focus/.MainActivity
sleep 5
DF_ANDROID_DISPOSABLE=1 timeout 300 node tests/android_e2e_recovery/p0_timer_saf_android.cjs "$report/results.json"
