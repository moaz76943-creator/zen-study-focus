'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const harness=fs.readFileSync(path.join(__dirname,'cdp_actions.cjs'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/design_recovery/white_premium_recovery10.css'),'utf8');
test('visible note edit button can scroll clear of fixed bottom tab bar',()=>{
  assert.match(css,/#sec-notes\s+#notesStackBox\s*\{[^}]*padding-bottom\s*:/);
  assert.match(harness,/scrollIntoView\(\{behavior:'instant',block:'center'/);
  assert.match(harness,/validateTouchTarget\(r\)/,'actual DOM hit-test is retained');
});
test('undated quick-added task can be shown before actual complete/reopen taps',()=>{
  const tasks=harness.slice(harness.indexOf(" await run('tasks_create'"),harness.indexOf(" await run('timer_start_pause'"));
  assert.match(tasks,/df-view-mode/);
  assert.match(tasks,/dispatchEvent\(new Event\('change'/);
  assert.match(tasks,/\.df-primary-action/);
});
test('quota failure and language switch keep note editor visible for a genuine save tap',()=>{
 const quota=harness.slice(harness.indexOf(" await run('save_failure'"),harness.indexOf(" await run('language_live_change'"));
 const locale=harness.slice(harness.indexOf(" await run('language_live_change'"),harness.indexOf(" await run('dialog_back'"));
 assert.match(quota,/await dismissNoteKeyboardForSave\(\)/);
 assert.match(locale,/await dismissNoteKeyboardForSave\(\)/);
});
