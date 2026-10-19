'use strict';
// Source-contract regression only: Android runtime and device sound remain NOT_TESTED.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'../../android/app/src/main');
const read=p=>readFileSync(join(root,p),'utf8');

test('v21 timer keeps its ID while sending explicit phase to the native foreground service',()=>{
 const js=read('assets/web/app.js');
 assert.match(js,/function startNativeTimerForCurrentSession\(seconds, title\)/);
 assert.match(js,/startBackgroundSession\(seconds,\s*title,\s*timerSessionId,\s*currentTimerModeKey\)/);
 assert.match(js,/startNativeTimerForCurrentSession\(timerLeft, activeTitle\)/);
 assert.match(js,/startNativeTimerForCurrentSession\(timerLeft, document\.getElementById\('timerModeCaption'\)\.textContent\)/);
});

test('new native bridge is compatible with older two-argument caller',()=>{
 const java=read('java/com/zenstudy/focus/MainActivity.java');
 assert.match(java,/public void startBackgroundService\(int seconds, String title\)/);
 assert.match(java,/public void startBackgroundSession\(int seconds, String title, String sessionId, String phase\)/);
 assert.match(java,/putExtra\("sessionId", sessionId\)/);
 assert.match(java,/putExtra\("phase", phase\)/);
});

test('native alert config includes rest preference and existing configuration ABI',()=>{
 const java=read('java/com/zenstudy/focus/MainActivity.java');
 const js=read('assets/web/integration_v22.js');
 assert.match(java,/public void configureCompletionAlert\(String sound, int volume, boolean enabled\)/);
 assert.match(java,/public void configureCompletionAlertV2\(String sound, int volume, boolean enabled, boolean includeRest\)/);
 assert.match(java,/putBoolean\("includeRest", includeRest\)/);
 assert.match(js,/configureCompletionAlertV2\(state\.sound,state\.volume,state\.enabled,state\.includeRest\)/);
});

test('service persists a bounded per-session ledger before sound or notification',()=>{
 const java=read('java/com/zenstudy/focus/FocusTimerService.java');
 assert.match(java,/putStringSet\("completed_session_tokens",/);
 assert.match(java,/\.commit\(\)/);
 assert.match(java,/if \(!firstCompletionForSession\(sessionId\)\) return;/);
 assert.match(java,/if \(isRestPhase\(phase\) && !settings\.getBoolean\("includeRest", false\)\) return;/);
 assert.match(java,/SESSION_LEDGER_LIMIT\s*=\s*128/);
});
