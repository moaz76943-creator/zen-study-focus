#!/usr/bin/env bash
# Only called for the workflow's newly created disposable emulator.
set -euo pipefail
serial="$(adb devices | awk '$1 ~ /^emulator-/ && $2 == "device" {print $1; exit}')"
test -n "$serial"
test -s "$RUNNER_TEMP/df4-device-test.apk"
capture() {
  timeout 20s adb -s "$serial" exec-out screencap -p > "$RUNNER_TEMP/df4-android/final-screen.png" || true
  timeout 20s adb -s "$serial" logcat -d -s AndroidRuntime chromium > "$RUNNER_TEMP/df4-android/runtime.log" || true
  timeout 10s adb -s "$serial" exec-out cat /sdcard/window_recovery14.xml > "$RUNNER_TEMP/df4-android/final-hierarchy.xml" || true
  # Disposable fixture data only. Preserve readable diagnostics when artifact
  # downloads are denied by an execution environment's external file host.
  tail -n 100 "$RUNNER_TEMP/df4-android/runtime.log" || true
  head -c 20000 "$RUNNER_TEMP/df4-android/final-hierarchy.xml" || true
  test ! -f "$RUNNER_TEMP/df4-android/results.json" || cat "$RUNNER_TEMP/df4-android/results.json"
}
trap capture EXIT
adb -s "$serial" install "$RUNNER_TEMP/df4-device-test.apk"
# Explicit fixture for core interaction cases on this fresh CI emulator only.
# Permission prompt/denial behavior remains NOT_TESTED, not certified by this grant.
adb -s "$serial" shell pm grant com.zenstudy.focus android.permission.POST_NOTIFICATIONS
python3 tests/android_e2e_recovery/run_e2e.py --serial "$serial" --ack-disposable-data --run-slow --allow-rotation --json "$RUNNER_TEMP/df4-android/results.json"
