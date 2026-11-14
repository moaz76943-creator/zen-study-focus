#!/usr/bin/env bash
set -euo pipefail
out="${TTS_EVIDENCE:-${RUNNER_TEMP:-/tmp}/tts-real-android}"; mkdir -p "$out"
git rev-parse HEAD > "$out/EXACT_SOURCE_SHA.txt"
printf 'Android EMULATOR only: engine/voice APIs and event flow. Audible output, voice quality and offline voice data are NOT verified here.\n' > "$out/PLATFORM_LIMITS.txt"
adb shell getprop ro.build.version.sdk | tr -d '\r' > "$out/ANDROID_API.txt"
adb shell settings get secure tts_default_synth | tr -d '\r' > "$out/DEFAULT_ENGINE.txt" || true
apk="android/app/build/outputs/apk/debug/app-debug.apk"
testapk="android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk"
test -s "$apk" && test -s "$testapk"
adb install --no-streaming -r "$apk" > "$out/install-app.txt" 2>&1
adb install --no-streaming -r "$testapk" > "$out/install-test.txt" 2>&1
timeout 240s adb shell am instrument -w -r com.zenstudy.focus.ttstest/com.zenstudy.focus.tts.NativeTtsInstrumentation > "$out/instrumentation.txt" 2>&1 || true
adb logcat -d -s DF_TTS_REAL AndroidRuntime > "$out/logcat.txt" 2>&1 || true
cat "$out/instrumentation.txt"
grep -q 'df_tts_status=PASS' "$out/instrumentation.txt" || { echo "NATIVE_TTS_NOT_PASS"; exit 1; }
echo "NATIVE_TTS_PASS (see SKIP lines in the report for anything the emulator could not exercise)"
