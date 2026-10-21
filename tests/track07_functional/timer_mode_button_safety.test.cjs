'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
const button=id=>{
 const match=html.match(new RegExp('<button\\b(?=[^>]*\\bid="'+id+'")[^>]*>','i'));
 assert.ok(match,'Missing real mode button '+id);
 return match[0];
};
test('all three standard Timer buttons share destructive progress protection',()=>{
 assert.match(button('modeFocusBtn'),/onclick="selectTimerModeFromUser\(/);
 assert.match(button('modeShortBtn'),/onclick="selectTimerModeFromUser\(/);
 assert.match(button('modeLongBtn'),/onclick="selectTimerModeFromUser\(/);
});
test('mode change cancelled by user never resets session progress',()=>{
 const method=source.slice(source.indexOf('function selectTimerModeFromUser'),source.indexOf('function openCustomTimerModal'));
 assert.match(method,/timerRunning\s*\|\|\s*timerSessionId\s*\|\|\s*timerActiveMs\s*>\s*0/);
 assert.match(method,/!window\.confirm/);
 assert.match(method,/return false/);
 assert.match(method,/selectTimerMode\(mins, modeKey, btn\)/);
});
