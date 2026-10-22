'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'track14_android_snapshots.sh'),'utf8');

test('Activity launch has an explicit nonvisual failure classification',()=>{
  assert.match(src,/ANDROID_ACTIVITY_START_FAILED/);
  assert.match(src,/ANDROID_APP_PROCESS_NOT_RUNNING/);
  assert.ok(src.includes('Status:[[:space:]]*ok'), 'launch checks successful am status');
});
test('Screenshot transport and empty image failures are not called UI visual defects',()=>{
  assert.match(src,/ANDROID_CAPTURE_TOOL_FAILED/);
  assert.match(src,/ANDROID_CAPTURE_EMPTY/);
  assert.match(src,/ANDROID_WEBVIEW_RENDER_NOT_VERIFIED/);
});
test('Blank-image failure retains bounded Android startup, WebView and window diagnostics',()=>{
  assert.match(src,/dumpsys webviewupdate/);
  assert.match(src,/dumpsys window/);
  assert.match(src,/dumpsys activity/);
  assert.match(src,/CAUSE=UNDETERMINED/);
  assert.match(src,/RELEASE_APPROVED=NO/);
});

test('semantic UI proof is sampled with each matching screenshot, not after the 12 frame matrix',()=>{
  const capture=src.indexOf('adb exec-out screencap -p');
  const semantic=src.indexOf('track14_rendered_hierarchy_guard.py');
  const manifest=src.indexOf("python3 - \"$out\" <<'PY'");
  assert.ok(capture>=0 && semantic>capture && manifest>semantic,
    'semantic tree must be paired with current width/font scale before advancing');
  assert.match(src,/rm -f "\$local_xml"/);
});
