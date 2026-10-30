#!/usr/bin/env bash
set -euo pipefail
out="${DF03_EVIDENCE:-${RUNNER_TEMP:-/tmp}/df03-tasks-android}"
font_scale="${DF03_FONT_SCALE:-1.0}"
[[ "$font_scale" == 1.0 || "$font_scale" == 1.5 || "$font_scale" == 2.0 ]] || { echo "Invalid DF03_FONT_SCALE" >&2; exit 2; }
mkdir -p "$out"
git rev-parse HEAD > "$out/SOURCE_SHA.txt"
printf 'Disposable Android emulator instrumentation. WebView CDP intentionally disabled; physical handset/TalkBack/SAF NOT_TESTED. RELEASE_APPROVED=NO\n' > "$out/LIMITS.txt"
qemu="$(timeout --kill-after=2s 10s adb shell getprop ro.kernel.qemu 2>/dev/null | tr -d '\r')" || qemu=unavailable
if [[ "$qemu" != 1 ]]; then
 printf 'TEST_RESULT=BLOCKED\nFAILURE_CATEGORY=TEST_HARNESS_FAIL\nDISPOSABLE_EMULATOR_REQUIRED\n' | tee "$out/failure-disposable-guard.txt" >&2
 exit 2
fi
source tests/tasks_core/df_final03_instrumentation/failure_evidence.sh
logcat_pid= current_stage=setup current_case=bootstrap current_output= failure_recorded=0
cleanup(){
 local result=$?
 if [[ "$result" != 0 && "$failure_recorded" != 1 ]]; then
   df03_record_failure "$current_stage" "$current_case" "$current_output" "$result" || true
 fi
 if [[ -n "$logcat_pid" ]]; then kill "$logcat_pid" 2>/dev/null || true; fi
 timeout 10s adb shell settings put system font_scale 1.0 >/dev/null 2>&1 || true
 timeout 10s adb shell wm size reset >/dev/null 2>&1 || true
 timeout 10s adb shell wm density reset >/dev/null 2>&1 || true
 timeout 10s adb logcat -d -s DF03_TASKS_ANDROID AndroidRuntime > "$out/logcat.txt" 2>&1 || true
}
trap cleanup EXIT
df03_host_evidence "$out/host-before.txt"
# Preserve guest evidence while the emulator is still alive, before install/tests.
timeout --kill-after=2s 3300s adb logcat -v threadtime -s DF03_TASKS_ANDROID AndroidRuntime libc > "$out/live-logcat.txt" 2>&1 &
logcat_pid=$!
api="$(timeout 20s adb shell getprop ro.build.version.sdk | tr -d '\r')"
printf '%s\n' "$api" > "$out/ANDROID_API.txt"
printf '%s\n' "$font_scale" > "$out/FONT_SCALE.txt"
apk=android/app/build/outputs/apk/debug/app-debug.apk
testapk=android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
test -s "$apk" && test -s "$testapk"
sha256sum "$apk" "$testapk" > "$out/APK_SHA256.txt"
bash tests/white_premium_qa/track14_install_apk.sh "$apk"
timeout 180s adb install --no-streaming -r "$testapk" > "$out/test-apk-install.txt" 2>&1
timeout 20s adb shell pm grant com.zenstudy.focus android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
# Report 320/360/393/430 CSS pixels, not Pixel_6 density-scaled 122px.
timeout 20s adb shell wm density 160
for width in 320 360 393 430; do
 for locale in en ar; do
 case_id="${width}-${locale}-font-${font_scale}"
 current_stage=setup current_case="$case_id" current_output=
 timeout 20s adb shell settings put system font_scale "$font_scale"
 timeout 20s adb shell wm size "${width}x820"
 timeout 20s adb shell pm clear com.zenstudy.focus >/dev/null
 timeout 20s adb shell pm grant com.zenstudy.focus android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
 edit="$out/edit-${case_id}.txt"
 current_stage=edit current_output="$edit"
 timeout 170s adb shell am instrument -w -r -e stage edit -e locale "$locale" -e width "$width" -e fontScale "$font_scale" \
   com.zenstudy.focus.test/com.zenstudy.focus.df03.TaskInstrumentation > "$edit" 2>&1 || {
   command_status=$?
   df03_record_failure edit "$case_id" "$edit" "$command_status"
   echo "TASKS_EDIT_INSTRUMENTATION_COMMAND_FAILED api=$api width=$width"; cat "$edit"; exit 1;
 }
 if ! grep -q 'INSTRUMENTATION_RESULT: df03_status=PASS' "$edit" ||
    ! grep -q 'INSTRUMENTATION_RESULT: df03_real_taps=6' "$edit" ||
    ! grep -q 'INSTRUMENTATION_RESULT: df03_ime=PASS' "$edit"; then
   df03_record_failure edit "$case_id" "$edit" 0
   echo "TASKS_EDIT_NOT_PASS api=$api width=$width"; cat "$edit"; exit 1
 fi
 # Force-kill the REAL target app between test processes.
 timeout 20s adb shell am force-stop com.zenstudy.focus
 verify="$out/reopen-${case_id}.txt"
 current_stage=verify current_output="$verify"
 timeout 150s adb shell am instrument -w -r -e stage verify -e locale "$locale" -e width "$width" -e fontScale "$font_scale" \
   com.zenstudy.focus.test/com.zenstudy.focus.df03.TaskInstrumentation > "$verify" 2>&1 || {
   command_status=$?
   df03_record_failure verify "$case_id" "$verify" "$command_status"
   echo "TASKS_REOPEN_INSTRUMENTATION_COMMAND_FAILED api=$api width=$width"; cat "$verify"; exit 1;
 }
 if ! grep -q 'INSTRUMENTATION_RESULT: df03_status=PASS' "$verify"; then
   df03_record_failure verify "$case_id" "$verify" 0
   echo "TASKS_REOPEN_NOT_PASS api=$api width=$width"; cat "$verify"; exit 1
 fi
 timeout 40s adb exec-out screencap -p > "$out/screen-${case_id}.png" || true
 echo "DF03_REAL_ANDROID_PASS API=$api width=$width locale=$locale font_scale=$font_scale"
 done
done
printf 'Android WebView real pointer edit+save+ACK reject+force-stop restore PASS API=%s font_scale=%s EN/AR all widths\n' "$api" "$font_scale" > "$out/summary.txt"
