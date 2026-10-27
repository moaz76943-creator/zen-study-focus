#!/usr/bin/env bash
# One shell is required: android-emulator-runner invokes each inline command separately.
set -euo pipefail
report="$RUNNER_TEMP/track05-android"
mkdir -p "$report"
if ! serial="$(timeout --kill-after=5s 15s adb devices | awk '$1 ~ /^emulator-/ && $2 == "device" {print $1; exit}')"; then
  echo 'QA INFRA BLOCKER: adb device discovery failed or timed out' >&2
  exit 2
fi
if [[ -z "$serial" ]]; then
  echo 'QA INFRA BLOCKER: no connected emulator in adb devices' >&2
  exit 2
fi
trap 'timeout --kill-after=5s 15s adb -s "$serial" logcat -d -s AndroidRuntime chromium > "$report/logcat.txt" 2>/dev/null || true' EXIT
if ! timeout --kill-after=5s 60s adb -s "$serial" install android/app/build/outputs/apk/debug/app-debug.apk; then
  echo 'QA INFRA BLOCKER: APK install failed or timed out' >&2
  exit 2
fi
if ! timeout --kill-after=5s 30s adb -s "$serial" shell am start -n com.zenstudy.focus/.MainActivity; then
  echo 'QA INFRA BLOCKER: Android app launch failed or timed out' >&2
  exit 2
fi
launched=0
for attempt in {1..15}; do
  if timeout --kill-after=5s 5s adb -s "$serial" shell pidof com.zenstudy.focus >/dev/null 2>&1; then
    launched=1
    break
  else
    status=$?
    if [[ "$status" == 124 || "$status" == 137 ]]; then
      echo 'QA INFRA BLOCKER: Android process readiness probe timed out' >&2
      exit 2
    fi
  fi
  sleep 1
done
if [[ "$launched" != 1 ]]; then
  echo 'QA INFRA BLOCKER: Android app process not launched' >&2
  exit 2
fi
# Execute the focused real AlarmManager test independently; preserve both reports
# even when one harness hits a real app failure or unavailable device transport.
alarm_status=0
DF_TRACK05_SERIAL="$serial" DF_TRACK05_DISPOSABLE=1 node tests/critical_room7/n02_android_probe.cjs "$report/n02-alarm-results.json" || alarm_status=$?
lifecycle_status=0
DF_TRACK05_SERIAL="$serial" DF_TRACK05_DISPOSABLE=1 node tests/track05_timer/live_android_cdp.cjs "$report/cdp-results.json" || lifecycle_status=$?
if [[ "$alarm_status" == 1 || "$lifecycle_status" == 1 ]]; then exit 1; fi
if [[ "$alarm_status" != 0 ]]; then exit "$alarm_status"; fi
exit "$lifecycle_status"
