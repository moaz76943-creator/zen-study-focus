#!/usr/bin/env bash
set -euo pipefail
out="${DF03_EVIDENCE:-${RUNNER_TEMP:-/tmp}/df03-tasks-android}"
mkdir -p "$out"
git rev-parse HEAD > "$out/SOURCE_SHA.txt"
printf 'Disposable Android emulator instrumentation. WebView CDP intentionally disabled; physical handset/TalkBack/IME/SAF NOT_TESTED. RELEASE_APPROVED=NO\n' > "$out/LIMITS.txt"
api="$(adb shell getprop ro.build.version.sdk | tr -d '\r')"
printf '%s\n' "$api" > "$out/ANDROID_API.txt"
apk=android/app/build/outputs/apk/debug/app-debug.apk
testapk=android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
test -s "$apk" && test -s "$testapk"
sha256sum "$apk" "$testapk" > "$out/APK_SHA256.txt"
cleanup(){
 adb shell wm size reset >/dev/null 2>&1 || true
 adb shell wm density reset >/dev/null 2>&1 || true
 adb logcat -d -s DF03_TASKS_ANDROID AndroidRuntime > "$out/logcat.txt" 2>&1 || true
}
trap cleanup EXIT
bash tests/white_premium_qa/track14_install_apk.sh "$apk"
timeout 180s adb install --no-streaming -r "$testapk" > "$out/test-apk-install.txt" 2>&1
adb shell pm grant com.zenstudy.focus android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
# Report 320/360/393/430 CSS pixels, not Pixel_6 density-scaled 122px.
adb shell wm density 160
for width in 320 360 393 430; do
 adb shell wm size "${width}x820"
 adb shell pm clear com.zenstudy.focus >/dev/null
 adb shell pm grant com.zenstudy.focus android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
 locale=en
 if [[ "$width" == "320" || "$width" == "393" ]]; then locale=ar; fi
 edit="$out/edit-${width}-${locale}.txt"
 timeout 170s adb shell am instrument -w -r -e stage edit -e locale "$locale" -e width "$width" \
   com.zenstudy.focus.test/com.zenstudy.focus.df03.TaskInstrumentation > "$edit" 2>&1 || {
   echo "TASKS_EDIT_INSTRUMENTATION_COMMAND_FAILED api=$api width=$width"; cat "$edit"; exit 1;
 }
 if ! grep -q 'INSTRUMENTATION_RESULT: df03_status=PASS' "$edit" ||
    ! grep -q 'INSTRUMENTATION_RESULT: df03_real_taps=4' "$edit"; then
   echo "TASKS_EDIT_NOT_PASS api=$api width=$width"; cat "$edit"; exit 1
 fi
 # Force-kill the REAL target app between test processes.
 adb shell am force-stop com.zenstudy.focus
 verify="$out/reopen-${width}-${locale}.txt"
 timeout 150s adb shell am instrument -w -r -e stage verify -e locale "$locale" -e width "$width" \
   com.zenstudy.focus.test/com.zenstudy.focus.df03.TaskInstrumentation > "$verify" 2>&1 || {
   echo "TASKS_REOPEN_INSTRUMENTATION_COMMAND_FAILED api=$api width=$width"; cat "$verify"; exit 1;
 }
 if ! grep -q 'INSTRUMENTATION_RESULT: df03_status=PASS' "$verify"; then
   echo "TASKS_REOPEN_NOT_PASS api=$api width=$width"; cat "$verify"; exit 1
 fi
 timeout 40s adb exec-out screencap -p > "$out/screen-${width}.png" || true
 echo "DF03_REAL_ANDROID_PASS API=$api width=$width locale=$locale"
done
printf 'Android WebView real pointer edit+save+ACK reject+force-stop restore PASS API=%s\n' "$api" > "$out/summary.txt"
