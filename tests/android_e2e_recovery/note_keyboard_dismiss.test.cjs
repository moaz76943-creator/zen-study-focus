'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const harness=fs.readFileSync(path.join(__dirname,'cdp_actions.cjs'),'utf8');
test('Android note save first dismisses real IME with Back while keeping opened editor and typed body',()=>{
  assert.match(harness,/async function dismissNoteKeyboardForSave\(/);
  assert.match(harness,/adb\('shell','input','keyevent','4'\)/);
  assert.match(harness,/noteModal.*classList\.contains\('open'\)/s);
  assert.match(harness,/draft body changed when hiding keyboard/);
  const notes=harness.slice(harness.indexOf(" await run('notes_create_edit'"),harness.indexOf(" await run('tasks_create'"));
  assert.equal((notes.match(/await dismissNoteKeyboardForSave\(\);/g)||[]).length,2);
  assert.equal((notes.match(/await tap\('#nsSaveButton'\)/g)||[]).length,2);
});
