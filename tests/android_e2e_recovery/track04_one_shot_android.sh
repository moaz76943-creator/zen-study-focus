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
export DF_ANDROID_CASES=preflight,notes_create_edit,tasks_create,task_subtasks,language_live_change,dialog_back,western_numerals
# Upstream runner insists all 20 cases PASS even for deliberate seven-case selection.
# Keep its raw exit and fail only on selected cases; all others remain NOT_TESTED.
set +e
node tests/android_e2e_recovery/cdp_actions.cjs "$report/android-tap-results.json"
raw_exit=$?
set -e
printf 'upstream_exit=%s\n' "$raw_exit" > "$report/strict-upstream-exit.txt"
node - "$report/android-tap-results.json" "$report/selected-acceptance.json" <<'NODE'
const fs=require('node:fs');
const [source,target]=process.argv.slice(2);
const record=JSON.parse(fs.readFileSync(source,'utf8'));
const wanted=process.env.DF_ANDROID_CASES.split(',');
const selected=wanted.map(id=>record.results.find(x=>x.id===id));
const outside=record.results.filter(x=>!wanted.includes(x.id));
const failures=selected.filter(x=>!x||x.status!=='PASS');
const gaps=outside.filter(x=>x.status!=='NOT_TESTED');
const summary={scope:'7 actual selected Android WebView scenarios only',
  sourceSHA:record.sha,selectedCases:wanted,selectedPass:selected.filter(x=>x&&x.status==='PASS').length,
  selectedFailures:failures,unselectedNotTested:outside.length,
  unexpectedUnselectedOutcomes:gaps,releaseApproved:false};
fs.writeFileSync(target,JSON.stringify(summary,null,2)+'\n');
console.log('TRACK04_ANDROID_SELECTED_OUTCOME '+JSON.stringify(summary));
if(failures.length||gaps.length||outside.length!==record.results.length-wanted.length)process.exit(1);
NODE
printf '%s\n' 'Android emulator only. Physical phone, TalkBack, real SAF documents, all 20-language dialogs and other controls NOT_TESTED. RELEASE_APPROVED=NO' > "$report/LIMITS.txt"
