#!/usr/bin/env bash
# Fresh disposable CI emulator only; never owner device data.
set -euo pipefail
report="$RUNNER_TEMP/deep-focus-android-webview"
capture() {
  timeout 20s adb exec-out screencap -p > "$report/screen.png" || true
  timeout 20s adb shell uiautomator dump /sdcard/rescue-webview.xml >/dev/null 2>&1 || true
  timeout 10s adb exec-out cat /sdcard/rescue-webview.xml > "$report/hierarchy.xml" || true
  timeout 20s adb logcat -d -s AndroidRuntime chromium > "$report/logcat.txt" || true
  timeout 10s adb shell dumpsys webviewupdate > "$report/webview-version.txt" || true
  timeout 10s adb shell getprop ro.build.version.sdk > "$report/device-api.txt" || true
  timeout 10s adb shell pm path com.zenstudy.focus > "$report/installed-package.txt" || true
  test ! -s "$report/logcat.txt" || tail -n 80 "$report/logcat.txt"
  adb forward --remove tcp:9222 >/dev/null 2>&1 || true
}
trap capture EXIT
# Keep the actual binary installed in this emulator, not another job's rebuild.
cp android/app/build/outputs/apk/debug/app-debug.apk "$report/tested-app-debug.apk"
sha256sum "$report/tested-app-debug.apk" | tee "$report/tested-apk.sha256"
adb install "$report/tested-app-debug.apk"
adb shell pm grant com.zenstudy.focus android.permission.POST_NOTIFICATIONS || true
adb shell am start -n com.zenstudy.focus/.MainActivity
sleep 5
pid="$(adb shell pidof com.zenstudy.focus | tr -d '\r' | awk '{print $1}')"
test -n "$pid"
adb forward tcp:9222 "localabstract:webview_devtools_remote_${pid}"
set +e
node tests/android_e2e_recovery/cdp_dom_smoke.cjs "$report/results.json"
cdp_status=$?
DF_ANDROID_DISPOSABLE=1 node tests/android_e2e_recovery/cdp_actions.cjs "$report/dom-actions.json"
action_status=$?
durability_status=0
if [[ "${GITHUB_REF_NAME:-}" == "test/track07-00-durability-evidence-20261020" ]]; then
  # Native failure probes use only this freshly installed disposable emulator.
  DF_ANDROID_DISPOSABLE=1 node tests/android_e2e_recovery/track07_durability_android.cjs "$report/track07-durability.json"
  durability_status=$?
fi
# This profile was just created and installed above; no owner phone data is touched.
python3 tests/android_e2e_recovery/run_e2e.py --serial emulator-5554 --ack-disposable-data --run-slow --allow-rotation --json "$report/e2e-results.json"
e2e_status=$?
test ! -s "$report/e2e-results.json" || cat "$report/e2e-results.json"
if (( cdp_status != 0 || action_status != 0 || durability_status != 0 || e2e_status != 0 )); then exit 1; fi
