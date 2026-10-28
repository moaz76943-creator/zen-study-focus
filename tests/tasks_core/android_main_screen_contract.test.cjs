'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const java=fs.readFileSync(path.join(__dirname,'df_final03_instrumentation/TaskInstrumentation.java'),'utf8');
test('successful Android task edit uses the shipped main screen and complete editor',()=>{
 const save=java.slice(java.indexOf('private void doEdit('),java.indexOf('mount("df03RejectHost"'));
 assert.match(save,/tap\("navTasks"\)/);
 assert.match(save,/#df22TasksHost #df-task-results/);
 assert.match(save,/#df22TasksHost form\.df-form/);
 assert.doesNotMatch(save,/mount\(|exposeEditor\(|style\.display/);
 assert.match(save,/tap\("df03Save"\)/);
});
test('actual Tasks keyboard and native font condition must be observed before acceptance',()=>{
 assert.match(java,/tap\("df03Title"\)/);
 assert.match(java,/expectIme\(true\)/);assert.match(java,/pressBack\(\)/);assert.match(java,/expectIme\(false\)/);
 assert.match(java,/WindowInsets\.Type\.ime\(\)/);assert.match(java,/getConfiguration\(\)\.fontScale/);
 assert.match(java,/Keyboard dismissal closed task editor or lost draft/);
 assert.match(java,/Tasks language not preserved/);
});

test('Android pointer injection positions editor fields away from top system-bar occlusion',()=>{
 assert.match(java,/el\.scrollIntoView\(\{behavior:'instant',block:'center',inline:'nearest'\}\)/);
 assert.match(java,/getUiAutomation\(\)\.injectInputEvent\(down,true\)/);
 assert.match(java,/getUiAutomation\(\)\.injectInputEvent\(up,true\)/);
});
