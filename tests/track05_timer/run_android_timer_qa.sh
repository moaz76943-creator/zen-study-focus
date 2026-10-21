#!/usr/bin/env bash
# One shell is required: android-emulator-runner invokes each inline command separately.
set -euo pipefail
report="$RUNNER_TEMP/track05-android"
mkdir -p "$report"
serial="$(adb devices | awk '$1 ~ /^emulator-/ && $2 == "device" {print $1; exit}')"
if [[ -z "$serial" ]]; then
  echo 'QA INFRA BLOCKER: no connected emulator in adb devices' >&2
  exit 2
fi
adb -s "$serial" install android/app/build/outputs/apk/debug/app-debug.apk
trap 'timeout 15s adb -s "$serial" logcat -d -s AndroidRuntime chromium > "$report/logcat.txt" 2>/dev/null || true' EXIT
DF_TRACK05_SERIAL="$serial" DF_TRACK05_DISPOSABLE=1 node tests/track05_timer/live_android_cdp.cjs "$report/cdp-results.json"
