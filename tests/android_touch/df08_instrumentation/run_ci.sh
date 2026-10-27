#!/usr/bin/env bash
# No production Java/Gradle changes are committed; AndroidTest wired in ephemeral CI checkout.
set -euo pipefail
out="${DF08_EVIDENCE:-${RUNNER_TEMP:-/tmp}/df08-real-android}"
mkdir -p "$out"
git rev-parse HEAD > "$out/EXACT_SOURCE_SHA.txt"
printf 'Android emulator WebView touch and IME only. NOT a physical handset, TalkBack or release approval.\nRELEASE_APPROVED=NO\n' > "$out/PLATFORM_LIMITS.txt"
api="$(timeout 20s adb shell getprop ro.build.version.sdk | tr -d '\r')"
printf '%s\n' "$api" > "$out/ANDROID_API.txt"
apk="android/app/build/outputs/apk/debug/app-debug.apk"
testapk="android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk"
test -s "$apk" && test -s "$testapk"
sha256sum "$apk" "$testapk" > "$out/APK_SHA256.txt"
cleanup() {
  timeout 10s adb shell wm size reset >/dev/null 2>&1 || true
  timeout 10s adb shell wm density reset >/dev/null 2>&1 || true
  timeout 10s adb shell settings put system font_scale 1.0 >/dev/null 2>&1 || true
  timeout 10s adb logcat -d -s DF08_REAL_ANDROID AndroidRuntime > "$out/logcat.txt" 2>&1 || true
}
trap cleanup EXIT
bash tests/white_premium_qa/track14_install_apk.sh "$apk"
timeout 180s adb install --no-streaming -r "$testapk" > "$out/test-apk-install.txt" 2>&1
# Force 1 physical pixel per CSS pixel for the requested 320/360/393/430px
# visual-viewport tests (default Pixel_6 density is ~2.625x and gave 122 CSS px).
timeout 20s adb shell wm density 160
# Remove the Android 13+ runtime notification prompt from this disposable test
# profile, so it cannot cover the WebView and intercept all pointer events.
timeout 20s adb shell pm grant com.zenstudy.focus android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
for width in 320 360 393 430; do
  timeout 20s adb shell wm size "${width}x820"
  timeout 20s adb shell settings put system font_scale 1.0
  timeout 20s adb shell am force-stop com.zenstudy.focus || true
  timeout 20s adb shell pm clear com.zenstudy.focus >/dev/null
  timeout 20s adb shell pm grant com.zenstudy.focus android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
  output="$out/actual-touch-${width}.txt"
  timeout 160s adb shell am instrument -w -r -e stage save -e width "$width" \
    com.zenstudy.focus.test/com.zenstudy.focus.df08.TouchInstrumentation \
    > "$output" 2>&1 || {
      echo "ANDROID_INSTRUMENTATION_COMMAND_FAIL width=$width"; cat "$output"; exit 1;
    }
  if ! grep -q 'INSTRUMENTATION_RESULT: df08_status=PASS' "$output" ||
      ! grep -q 'INSTRUMENTATION_RESULT: df08_water_ack=PASS' "$output" ||
      ! grep -q 'INSTRUMENTATION_RESULT: df08_physical_taps=' "$output"; then
    echo "ANDROID_TOUCH_NOT_PASS width=$width"
    timeout 15s adb exec-out cat /sdcard/df08_live_failure.png > "$out/foreground-failure-$width.png" 2>/dev/null || true
        timeout 30s adb exec-out screencap -p > "$out/failure-$width.png" 2>/dev/null || true
    timeout 35s adb shell uiautomator dump /sdcard/df08_hierarchy.xml >/dev/null 2>&1 || true
    timeout 15s adb exec-out cat /sdcard/df08_hierarchy.xml > "$out/failure-$width.xml" 2>/dev/null || true
    timeout 15s adb shell dumpsys window > "$out/window-$width.txt" 2>&1 || true
    cat "$output"
    exit 1
  fi
  # Retain profile data and verify in a new Android process after force-stop.
  timeout 20s adb shell am force-stop com.zenstudy.focus
  reopen="$out/reopen-${width}.txt"
  timeout 160s adb shell am instrument -w -r -e stage verify -e width "$width" \
    com.zenstudy.focus.test/com.zenstudy.focus.df08.TouchInstrumentation \
    > "$reopen" 2>&1 || {
      echo "ANDROID_NOTES_REOPEN_COMMAND_FAIL api=$api width=$width"; cat "$reopen"; exit 1;
    }
  if ! grep -q 'INSTRUMENTATION_RESULT: df08_status=PASS' "$reopen" ||
     ! grep -q 'INSTRUMENTATION_RESULT: df08_reopen=PASS' "$reopen"; then
    echo "ANDROID_NOTES_REOPEN_NOT_PASS api=$api width=$width"; cat "$reopen"; exit 1
  fi
  timeout 40s adb exec-out screencap -p > "$out/after-${width}.png" || true
  echo "ANDROID_REAL_TOUCH_PASS api=$api width=$width"
done
printf 'PASSED actual instrumented WebView navigation, IME, Notes Save plus force-stop/reopen at four widths; API=%s\n' "$api" > "$out/summary.txt"
