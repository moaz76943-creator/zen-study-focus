#!/usr/bin/env bash
set -euo pipefail
E="$DF09_NATIVE_EVIDENCE"
mkdir -p "$E"
test -s "$E/DeepFocus-DF09-QA-only.apk"
adb install -r "$E/DeepFocus-DF09-QA-only.apk"
adb shell pm path com.zenstudy.focus.qa | grep -F 'package:'
adb shell am force-stop com.zenstudy.focus.qa || true
adb shell svc wifi disable || true
adb shell svc data disable || true
adb shell am start -W -n com.zenstudy.focus.qa/com.zenstudy.focus.MainActivity
for i in $(seq 1 30); do
  if adb shell pidof com.zenstudy.focus.qa | grep -Eq '[0-9]'; then break; fi
  sleep 2
done
adb shell pidof com.zenstudy.focus.qa | grep -Eq '[0-9]'
node tests/track08/df09_android_analytics_a11y.cjs
adb exec-out screencap -p > "$E/qa-android-analytics.png"
if timeout 35s adb shell uiautomator dump /sdcard/df09-hierarchy.xml; then
  adb shell cat /sdcard/df09-hierarchy.xml > "$E/native-accessibility-hierarchy.xml" || true
fi
printf '%s\n' "Native accessibility hierarchy capture does not certify TalkBack output or every chart label." > "$E/ACCESSIBILITY_LIMITS.txt"
