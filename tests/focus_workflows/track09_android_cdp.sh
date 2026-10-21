#!/usr/bin/env bash
# Track09 CDP acceptance on GitHub's disposable Android emulator.
set -euo pipefail
report="$RUNNER_TEMP/track09-android-cdp"
mkdir -p "$report"
capture() {
  timeout 12s adb exec-out screencap -p > "$report/screen.png" || true
  timeout 15s adb logcat -d -s AndroidRuntime chromium > "$report/webview-logcat.txt" || true
  timeout 10s adb shell dumpsys webviewupdate > "$report/webview-version.txt" || true
  timeout 10s adb shell getprop ro.build.version.sdk > "$report/api.txt" || true
  adb forward --remove tcp:9222 >/dev/null 2>&1 || true
}
trap capture EXIT
test -s "$RUNNER_TEMP/df4-device-test.apk"
sha256sum "$RUNNER_TEMP/df4-device-test.apk" > "$report/exact-apk.sha256"
adb install -r "$RUNNER_TEMP/df4-device-test.apk"
adb shell am start -n com.zenstudy.focus/.MainActivity
sleep 6
pid="$(adb shell pidof com.zenstudy.focus | tr -d '\r' | awk '{print $1}')"
test -n "$pid"
adb forward tcp:9222 "localabstract:webview_devtools_remote_${pid}"
# Goals/Calendar probing must run independently of the unrelated timer CDP smoke.
# This probe itself exits nonzero on failed or unavailable Android evidence.
TRACK09_SOURCE_SHA="$(git rev-parse HEAD)" node tests/focus_workflows/track09_android_cdp.cjs "$report/goal-calendar-dom.json"
