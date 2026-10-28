'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const crypto=require('node:crypto').webcrypto;
const root=path.resolve(__dirname,'../..');
const app=fs.readFileSync(path.join(root,'android/app/src/main/assets/web/app.js'),'utf8');
const calendar=fs.readFileSync(path.join(root,'android/app/src/main/assets/web/js/native_calendar_sync_coordinator.js'),'utf8');
function rig(secure=crypto){
 const math=Object.create(Math);math.random=()=>{throw Error('Weak randomness forbidden');};
 const c={crypto:secure,Math:math,Date:class extends Date{static now(){return 1234567890000}},module:{exports:{}}};
 vm.createContext(c);vm.runInContext(calendar,c);
 const start=app.indexOf('  function parseBulkLines('),end=app.indexOf('  window.dfToWesternDigitsM206',start);
 assert.ok(start>=0&&end>start);vm.runInContext(app.slice(start,end),c);
 return c;
}
test('calendar and vocabulary IDs use secure suffixes, preserve prefixes, and do not collide at the same timestamp',()=>{
 const c=rig(),calendarIds=new Set(),vocabIds=new Set();
 for(let n=0;n<100;n++){
  const event=c.module.exports.generateSessionVEvent({startTime:1234567890000});
  assert.match(event.uid,/^deepfocus-1234567890000-[0-9a-f]{32}@zenstudy$/);calendarIds.add(event.uid);
  const word=c.parseBulkLines('word: meaning')[0];
  assert.match(word.id,/^v_1234567890000_[0-9a-f]{32}$/);vocabIds.add(word.id);
 }
 assert.equal(calendarIds.size,100);assert.equal(vocabIds.size,100);
});
test('existing calendar IDs are preserved without requiring secure randomness',()=>{
 const c=rig({});assert.equal(c.module.exports.generateSessionVEvent({id:'legacy-id'}).uid,'deepfocus-legacy-id@zenstudy');
});
test('unsupported secure randomness cannot silently fall back to a weak new identity',()=>{
 const c=rig({});
 assert.throws(()=>c.module.exports.generateSessionVEvent({}));
 assert.throws(()=>c.parseBulkLines('word: meaning'));
});
