#!/usr/bin/env bash
# Disposable Android emulator only. No real owner user data, production signing or publication.
set -euo pipefail
E="$RUNNER_TEMP/df-qa"
test -s "$RUNNER_TEMP/normal-debug.apk"
test -s "$E/DeepFocus-Phase3-QA-Only.apk"
adb install "$RUNNER_TEMP/normal-debug.apk"
test -n "$(adb shell pm path com.zenstudy.focus | tr -d '\r')"
adb shell "run-as com.zenstudy.focus sh -c 'mkdir -p files && echo BASELINE_ONLY > files/qa-isolation-sentinel'"
adb install "$E/DeepFocus-Phase3-QA-Only.apk"
test -n "$(adb shell pm path com.zenstudy.focus.qa | tr -d '\r')"
test -n "$(adb shell pm path com.zenstudy.focus | tr -d '\r')"
adb shell "run-as com.zenstudy.focus cat files/qa-isolation-sentinel" | grep -F BASELINE_ONLY
if adb shell "run-as com.zenstudy.focus.qa cat files/qa-isolation-sentinel" >/dev/null 2>&1; then
  echo 'FAIL: QA app accessed baseline sandbox' >&2
  exit 1
fi
adb shell am start -n com.zenstudy.focus.qa/com.zenstudy.focus.MainActivity
sleep 4
pid="$(adb shell pidof com.zenstudy.focus.qa | tr -d '\r' | awk '{print $1}')"
test -n "$pid"
adb forward --remove tcp:9223 >/dev/null 2>&1 || true
adb forward tcp:9223 "localabstract:webview_devtools_remote_${pid}"
node tests/track08/qa_webview_startup_probe.cjs "$E/QA_FIRST_OPEN_DOM.json"
# Directly exercise Android AlertDialog (Confirm cancel/accept, Alert, Prompt).
node tests/track08/native_js_dialog_android_probe.cjs "$E"
# Real Android Storage Access Framework: interactive Analytics Export -> Cancel & Save.
node tests/track08/qa_real_analytics_saf.cjs "$E"
adb shell svc wifi disable || true
adb shell svc data disable || true
adb shell am force-stop com.zenstudy.focus.qa
adb shell am start -n com.zenstudy.focus.qa/com.zenstudy.focus.MainActivity
sleep 4
pid="$(adb shell pidof com.zenstudy.focus.qa | tr -d '\r' | awk '{print $1}')"
test -n "$pid"
adb forward --remove tcp:9223 >/dev/null 2>&1 || true
adb forward tcp:9223 "localabstract:webview_devtools_remote_${pid}"
node tests/track08/qa_webview_startup_probe.cjs "$E/QA_OFFLINE_REOPEN_DOM.json"
adb exec-out screencap -p > "$E/QA-OPEN-SCREEN.png"
test -s "$E/QA-OPEN-SCREEN.png"
adb shell "run-as com.zenstudy.focus cat files/qa-isolation-sentinel" | grep -F BASELINE_ONLY
adb shell pm list packages | grep -E '^package:com\.zenstudy\.focus(\.qa)?$' > "$E/installed-package-ids.txt"
test "$(wc -l < "$E/installed-package-ids.txt")" -eq 2
adb logcat -d -s AndroidRuntime > "$E/qa-runtime-logcat.txt" || true
printf 'INSTALL_OK=YES\nQA_ID=com.zenstudy.focus.qa\nBASELINE_UNTOUCHED=YES\nOFFLINE_RESTART=YES\nANDROID_FUNCTIONAL_QA=NOT_TESTED\nRELEASE_APPROVED=NO\n' > "$E/INSTALL_RESULT.txt"
