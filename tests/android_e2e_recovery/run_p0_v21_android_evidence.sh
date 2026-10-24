#!/usr/bin/env bash
# GitHub emulator-runner executes 'script' using /usr/bin/sh; this file opts
# into Bash intentionally, so pipefail and strict test evidence work.
# Only operates on a brand new disposable emulator; never user-owned data.
set -euo pipefail
report="$RUNNER_TEMP/df-p0-v21-native"
mkdir -p "$report"
adb install android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.zenstudy.focus/.MainActivity
sleep 7
set +e
timeout 900s env DF_ANDROID_DISPOSABLE=1 node tests/android_e2e_recovery/track07_durability_android.cjs "$report/native-durability.json" > "$report/native-durability.log" 2>&1
status=$?
timeout 15s adb logcat -d -s AndroidRuntime chromium > "$report/logcat.txt" 2>&1 || true
timeout 15s adb exec-out screencap -p > "$report/final-screenshot.png" 2>/dev/null || true
cat "$report/native-durability.log"
printf '%s\n' "$status" > "$report/TEST_EXIT_CODE.txt"
exit "$status"
