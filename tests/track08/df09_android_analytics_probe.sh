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
launch="$(adb shell am start -W -n com.zenstudy.focus.qa/com.zenstudy.focus.MainActivity)"
printf '%s\n' "$launch" > "$E/REAL_ACTIVITY_START.txt"
# Android 13+ may open a genuine notification permission dialog above the app.
# When the OS itself reports the permission Activity as foreground, physically Back out.
if printf '%s' "$launch" | grep -Eq 'Activity: .*GrantPermissionsActivity'; then
  adb shell input keyevent KEYCODE_BACK
  printf '%s\n' 'Android am start confirmed GrantPermissionsActivity; physical Back declined it.' > "$E/PERMISSION_BACK.txt"
fi
# Android 13+ may open a genuine notification permission dialog above the app.
# Dismiss with a real hardware Back event; do not stub permission APIs.
for i in $(seq 1 8); do
  focus="$( (adb shell dumpsys window 2>/dev/null | grep -E 'mCurrentFocus=' | tail -1; adb shell dumpsys activity activities 2>/dev/null | grep -E '(topResumedActivity|mResumedActivity).*GrantPermissionsActivity' | head -1) || true)"
  if printf '%s' "$focus" | grep -q 'GrantPermissionsActivity'; then
    printf '%s\n' "$focus" > "$E/REAL_PERMISSION_DIALOG_BEFORE_BACK.txt"
    adb shell input keyevent KEYCODE_BACK
    printf '%s\n' 'Physical Android Back declined permission dialog; no automatic approval.' > "$E/PERMISSION_BACK.txt"
    break
  fi
  sleep 1
done
sleep 3
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
