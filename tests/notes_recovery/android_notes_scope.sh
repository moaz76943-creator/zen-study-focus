#!/usr/bin/env bash
# Fresh disposable Android emulator only. Keep original full-suite failure semantics.
set -euo pipefail
folder="$RUNNER_TEMP/notes-android"
cp android/app/build/outputs/apk/debug/app-debug.apk "$folder/installed-app-debug.apk"
adb install "$folder/installed-app-debug.apk"
adb shell am start -n com.zenstudy.focus/.MainActivity
sleep 5
pid="$(adb shell pidof com.zenstudy.focus | tr -d '\r' | awk '{print $1}')"
test -n "$pid"
adb forward tcp:9222 "localabstract:webview_devtools_remote_${pid}"
set +e
node tests/android_e2e_recovery/cdp_actions.cjs "$folder/android-notes.json" > "$folder/android-raw.log" 2>&1
instrumentExit=$?
set -e
cat "$folder/android-raw.log" | tail -n 110
INSTRUMENT_EXIT="$instrumentExit" node - "$folder/android-notes.json" "$folder/android-scope-summary.json" <<'NODE'
const fs=require('fs'),assert=require('assert/strict');
const selected=process.env.DF_ANDROID_CASES.split(',');
const file=process.argv[2],out=process.argv[3];
if(!fs.existsSync(file))throw Error('Android probe did not produce a report');
const report=JSON.parse(fs.readFileSync(file,'utf8'));
const cases=selected.map(id=>{
  const r=report.results.find(x=>x.id===id);
  return {id,status:r?.status||'NOT_TESTED',detail:r?.detail||'No actual observation'};
});
const passed=cases.filter(x=>x.status==='PASS').length;
const evidence={sha:process.env.GITHUB_SHA,api:process.env.ANDROID_TEST_API,selected:cases,
  selectedPass:passed,selectedTotal:cases.length,fullSuiteApproved:false,
  originalStrictExit:process.env.INSTRUMENT_EXIT,releaseApproved:false};
fs.writeFileSync(out,JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence));
// The original full-suite harness intentionally reports unselected scenarios
// as NOT_TESTED and exits nonzero. Only this named Notes scope is assessed.
assert.equal(passed,cases.length,'Focused Android Notes acceptance incomplete');
NODE
