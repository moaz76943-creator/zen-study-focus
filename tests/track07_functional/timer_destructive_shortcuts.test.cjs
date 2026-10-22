'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');

function body(name,next){
 const start=src.indexOf('function '+name+'(');
 assert.ok(start>=0,'Missing actual function '+name);
 const end=src.indexOf('function '+next+'(',start+9);
 assert.ok(end>start,'Missing ending function '+next);
 return src.slice(start,end);
}
test('reset must reject cancellation BEFORE stopping or clearing focus progress',()=>{
 const s=body('resetTimerNow','skipTimerPhase');
 assert.match(s,/timerRunning|timerSessionId/);
 const guard=s.indexOf('window.confirm(');
 const destructive=s.indexOf('timerLeft = timerTotal');
 assert.ok(guard>=0&&guard<destructive,'Cancel must occur before resetting actual progress');
 assert.match(s,/return false/);
});
test('Skip phase must confirm before pause or switch when a focus session is active',()=>{
 const s=body('skipTimerPhase','addWaterCup');
 assert.match(s,/selectTimerModeFromUser\(/,'Use the existing protected mode switch');
 const pause=s.indexOf('toggleTimerPlay()');
 const switchAt=s.indexOf('selectTimerModeFromUser(');
 assert.ok(pause<0||pause>switchAt,'Do not pause timer before the user makes a choice');
});
test('sports 45-second quick-rest must not discard current focus session on Cancel',()=>{
 const s=body('startQuickSportRest','addReadPages');
 assert.match(s,/window\.confirm\(/,'Actual high-value confirmation must be handled');
 assert.ok(s.indexOf('window.confirm(')<s.indexOf('timerTotal = secs'),'Confirmation precedes mutation');
 assert.match(s,/return false/);
});
test('custom Save button cancellation preserves label and the open custom dialog',()=>{
 const s=body('applyCustomTimerNow','changeTimerDelta');
 const choose=s.indexOf('selectTimerModeFromUser(');
 assert.ok(choose>=0);
 assert.match(s,/selectTimerModeFromUser\(mins, 'custom', document\.getElementById\('modeCustomBtn'\), nextLabel\)/,'Pass label into the same confirmed persisted transition');
 assert.doesNotMatch(s,/customSessionLabel\s*=/,'Do not mutate label separately after saving');
 assert.ok(s.indexOf("closeModal('customTimerModal')")>choose,'Do not close entered form on Cancel');
});
