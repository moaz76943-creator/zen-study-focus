'use strict';
// TRACK 05: exact production runTimerTick body, not a rewritten fake timer.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const start=app.indexOf('function runTimerTick() {');
const end=app.indexOf('function restoreTimerSession()',start);
assert.ok(start>=0 && end>start,'Extract the genuine timer tick and fail closed if it moves');
const actualTick=app.slice(start,end);

function timerFixture({running, target, now=2000000, left=10}){
  const events=[];
  const context=vm.createContext({
    timerRunning:running,timerLeft:left,timerTargetTime:target,Date:{now:()=>now},
    finalizeTimerSession(chime){events.push(['completed',chime]);context.timerRunning=false;context.timerLeft=0;return true;},
    updateTimerDisplay(){events.push(['display',context.timerLeft]);}
  });
  vm.runInContext(actualTick,context,{filename:'app.js:runTimerTick'});
  return {events,context,tick:()=>vm.runInContext('runTimerTick()',context)};
}

test('TRACK05 a queued old tick after Pause cannot complete/credit a paused session',()=>{
  const f=timerFixture({running:false,target:1998000,left:12});
  f.tick();
  assert.equal(f.context.timerLeft,12,'Keep saved paused time unchanged');
  assert.deepEqual(f.events,[],'No credit/completion callbacks or UI mutation after Pause');
});

test('TRACK05 second expiry callback cannot dispatch duplicate completion for one session',()=>{
  const f=timerFixture({running:true,target:1998000,left:1});
  f.tick();
  f.tick();
  assert.deepEqual(f.events,[['completed',true]],'Only first legitimate expiry may finalize');
});

test('TRACK05 active timer still updates countdown from epoch timestamp',()=>{
  const f=timerFixture({running:true,target:2045000,left:57});
  f.tick();
  assert.equal(f.context.timerLeft,45);
  assert.deepEqual(f.events,[['display',45]]);
});
