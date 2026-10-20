#!/usr/bin/env bash
# Disposable isolated Android QA app only; never touch owner apps or user data.
set -euo pipefail
APK="$(find android/app/build/outputs/apk/debug -maxdepth 1 -name '*.apk' -type f -print -quit)"
test -s "$APK"
mkdir -p "$RUNNER_TEMP/audio20"
cp "$APK" "$RUNNER_TEMP/audio20/tested-audioqa-debug.apk"
sha256sum "$RUNNER_TEMP/audio20/tested-audioqa-debug.apk" | tee "$RUNNER_TEMP/audio20/apk.sha256"
git rev-parse HEAD > "$RUNNER_TEMP/audio20/source-sha.txt"
adb shell getprop ro.build.version.sdk > "$RUNNER_TEMP/audio20/api.txt"
adb shell dumpsys webviewupdate > "$RUNNER_TEMP/audio20/webview.txt"
trap 'adb exec-out screencap -p > "$RUNNER_TEMP/audio20/final-screen.png"; adb logcat -d -t 400 > "$RUNNER_TEMP/audio20/logcat.txt"' EXIT
adb install "$APK"
adb shell svc wifi disable
adb shell svc data disable
test -n "$(adb shell pm path com.zenstudy.focus.audioqa | tr -d '\r')"
if adb shell pm path com.zenstudy.focus 2>/dev/null | grep -q 'package:'; then
  echo 'UNEXPECTED: production Deep Focus must never be installed on sound QA runner'
  exit 1
fi
adb shell am start -n com.zenstudy.focus.audioqa/com.zenstudy.focus.MainActivity
sleep 6
pid="$(adb shell pidof com.zenstudy.focus.audioqa | tr -d '\r' | awk '{print $1}')"
test -n "$pid"
adb forward --remove tcp:9225 >/dev/null 2>&1 || true
adb forward tcp:9225 "localabstract:webview_devtools_remote_${pid}"
mkdir -p "$RUNNER_TEMP/audio20"
AUDIO_QA_ENDURANCE_SECONDS=1800 node tests/nature_library_v2/android20_runtime_probe.cjs "$RUNNER_TEMP/audio20/qa-audio20-cdp.json"
adb exec-out screencap -p > "$RUNNER_TEMP/audio20/qa-audio20-screen.png"
test -s "$RUNNER_TEMP/audio20/qa-audio20-screen.png"
adb shell am force-stop com.zenstudy.focus.audioqa
adb shell am start -n com.zenstudy.focus.audioqa/com.zenstudy.focus.MainActivity
sleep 6
pid="$(adb shell pidof com.zenstudy.focus.audioqa | tr -d '\r' | awk '{print $1}')"
test -n "$pid"
adb forward --remove tcp:9225 >/dev/null 2>&1 || true
adb forward tcp:9225 "localabstract:webview_devtools_remote_${pid}"
node tests/nature_library_v2/android20_runtime_probe.cjs "$RUNNER_TEMP/audio20/qa-audio20-reopen-cdp.json"
printf 'QA_VISIBLE_WEBVIEW=PASS\nTWENTY_TRACKS=PASS\nSIX_GROUPS=PASS\nTWENTY_ORIGINALS_AND_LOOP_WRAPS=PASS\nADB_PLAY_STOP_CONTROLS=PASS\nTHIRTY_MINUTE_MUTED_DECODE_MIX=PASS\nREAL_ANDROID_OWNER_DEVICE=NOT_TESTED\nRELEASE_APPROVED=NO\n' > "$RUNNER_TEMP/audio20/qa-audio20-result.txt"
