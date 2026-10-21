#!/usr/bin/env bash
# GitHub Actions ONLY: disposable newly-created emulator with no personal data.
set -euo pipefail
report="${RUNNER_TEMP:?}/track17-android-${ANDROID_TEST_API:?}"
mkdir -p "$report"
trap 'adb logcat -d -s AndroidRuntime chromium > "$report/logcat.txt" 2>/dev/null || true; adb shell dumpsys meminfo com.zenstudy.focus > "$report/final-memory.txt" 2>/dev/null || true; adb forward --remove tcp:9222 >/dev/null 2>&1 || true' EXIT
test -s "$RUNNER_TEMP/track17-app-debug.apk"
test "$(adb devices | awk '$1 ~ /^emulator-/ && $2=="device" {n++} END {print n+0}')" -eq 1
git rev-parse HEAD > "$report/source_sha.txt"
sha256sum "$RUNNER_TEMP/track17-app-debug.apk" > "$report/apk.sha256"
adb install "$RUNNER_TEMP/track17-app-debug.apk"
# On API33+ a runtime notification dialog otherwise steals the measured launch.
# This grant is restricted to the fresh CI emulator, never a user's phone.
if [ "$ANDROID_TEST_API" -ge 33 ]; then
  adb shell pm grant com.zenstudy.focus android.permission.POST_NOTIFICATIONS
fi
adb shell pm path com.zenstudy.focus > "$report/installed.txt"
adb shell svc wifi disable
adb shell svc data disable
adb shell settings get global wifi_on > "$report/wifi_setting.txt"
adb shell dumpsys connectivity > "$report/network-state.txt" || true
bash tests/performance_recovery/android_metrics_probe.sh "$report/start-mem-cpu"
adb shell am start -n com.zenstudy.focus/.MainActivity > "$report/open.txt"
sleep 4
pid="$(adb shell pidof com.zenstudy.focus | tr -d '\r' | awk '{print $1}')"
test -n "$pid"
adb forward tcp:9222 "localabstract:webview_devtools_remote_${pid}"
TRACK17_SOURCE_SHA="$(git rev-parse HEAD)" node tests/performance_recovery/track17_webview_probe.cjs "$report/real-webview.json"
