#!/usr/bin/env bash
# TRACK 04: isolated emulator-only Android WebView acceptance, no owner data.
set -euo pipefail
report="$RUNNER_TEMP/df-track04-android"
mkdir -p "$report"
capture() {
  timeout 20s adb exec-out screencap -p > "$report/last-screen.png" || true
  timeout 20s adb shell uiautomator dump /sdcard/track04-hierarchy.xml > "$report/dump.log" 2>&1 || true
  timeout 15s adb exec-out cat /sdcard/track04-hierarchy.xml > "$report/last-hierarchy.xml" || true
  timeout 20s adb logcat -d -s AndroidRuntime chromium > "$report/logcat.txt" || true
  timeout 10s adb shell dumpsys webviewupdate > "$report/webview-version.txt" || true
  timeout 10s adb shell getprop ro.build.version.sdk > "$report/api-level.txt" || true
  adb forward --remove tcp:9222 >/dev/null 2>&1 || true
}
trap capture EXIT
package=com.zenstudy.focus
apk=android/app/build/outputs/apk/debug/app-debug.apk
test -s "$apk"
sha256sum "$apk" > "$report/installed-apk.sha256"
adb install "$apk"
adb shell am start -n "$package/.MainActivity"
sleep 6
pid="$(adb shell pidof "$package" | tr -d '\r' | awk '{print $1}')"
if [[ ! "$pid" =~ ^[0-9]+$ ]]; then
  printf '%s\n' '{"status":"NOT_TESTED","blocker":"Android WebView app did not start"}' > "$report/android-start.json"
  exit 1
fi
adb forward tcp:9222 "localabstract:webview_devtools_remote_$pid"
node tests/android_e2e_recovery/cdp_dom_smoke.cjs "$report/cdp-startup.json"
# CDP dispatches Android WebView interactions, not browser mock clicks.
# Cases outside the limited run remain NOT_TESTED.
export ANDROID_TEST_API=30
export DF_ANDROID_DISPOSABLE=1
export DF_ANDROID_CASES=preflight,notes_create_edit,tasks_create,task_subtasks,language_live_change,timer_start_pause,data_integrity
node tests/android_e2e_recovery/cdp_actions.cjs "$report/android-tap-results.json"
printf '%s\n' 'Android emulator only. Physical phone, TalkBack, real SAF documents, all 20-language dialogs and other controls NOT_TESTED. RELEASE_APPROVED=NO' > "$report/LIMITS.txt"
