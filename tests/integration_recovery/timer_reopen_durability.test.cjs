'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./activity_transition_fixture.cjs');
for(const running of [false,true])for(const training of [false,true])test(`P0 reopen running=${running} training=${training} keeps identity/time/task/rounds`,()=>{
 const h=fixture({running,training});h.c.timerTargetTime=running?Date.now()+65000:null;
 h.c.customSessionLabel='Custom '+ 'عنوان طويل ۱۲ '.repeat(15);
 h.c.currentTimerModeKey='custom';h.c.quickTraining&& (h.c.quickTraining.currentSet=1);
 h.call('storeTimerSession()');const saved=h.saved(),packets=new Map(h.slots);
 // Simulate stale in-memory scheduling as well as a fresh reopen.
 h.element('mainPlayBtn').innerHTML='stale-pause';h.c.timerRunning=true;h.c.timerInterval=99;h.c.timerSessionId='stale';h.c.focusSessionTaskId=null;
 h.events.length=0;h.call('restoreTimerSession()');
 assert.equal(h.c.timerRunning,running);assert.match(h.element('mainPlayBtn').innerHTML,running?/M6 19h4/:/M8 5v14/);assert.equal(h.c.timerSessionId,saved.sessionId);
 assert.equal(h.c.focusSessionTaskId,7);assert.equal(h.c.customSessionLabel,saved.label);
 assert.equal(h.c.timerTotal,120);assert.equal(h.c.timerActiveMs,30000);
 if(running)assert.ok(h.c.timerLeft>=64&&h.c.timerLeft<=65);else assert.equal(h.c.timerLeft,90);
 assert.equal(h.c.timerTargetTime,running?saved.endAt:null);
 assert.equal(h.c.quickTraining?.currentSet,training?1:undefined);
 assert.deepEqual(h.slots,packets,'Restoring valid live/paused snapshot does not rewrite user data');
 h.events.length=0;h.call('restoreTimerSession()');
 assert.equal(h.events.filter(e=>e==='interval-start').length,running?1:0);
 assert.equal(h.events.filter(e=>e==='interval-stop').length,running?1:0,'Replace, never leak old interval');
});
for(const mode of ['focus','custom','short','long'])test(`P0 reopen expired ${mode} retry retains task and records completion once`,()=>{
 const h=fixture({training:false});h.c.currentTimerModeKey=mode;
 h.c.timerTargetTime=Date.now()-1000;h.call('storeTimerSession()');h.reject('active_timer','false');
 h.call('restoreTimerSession()');assert.equal(h.c.timerSessionId,'stable-id');assert.equal(h.c.timerLeft,0);
 const expected=['focus','custom'].includes(mode)?4:3;assert.equal(h.c.cfg.sessions,expected);
 h.accept();h.call('restoreTimerSession()');assert.equal(h.c.cfg.sessions,expected);
 const credit=h.c.cfg.sessionHistory.filter(x=>x.id==='stable-id');
 assert.equal(credit.length,expected===4?1:0);if(credit.length)assert.equal(credit[0].taskId,7);
 h.call('restoreTimerSession()');assert.equal(h.c.cfg.sessions,expected);
 assert.equal(h.events.includes('chime'),false,'Reopen never duplicates native expiry alert');
});
test('P0 reopen expired training round advances once and preserves exact round/task link',()=>{
 const h=fixture();h.c.timerTargetTime=Date.now()-1000;h.call('storeTimerSession()');
 h.call('restoreTimerSession()');assert.equal(h.c.quickTraining.phase,'rest');assert.equal(h.c.quickTraining.currentSet,0);
 const id=h.c.timerSessionId;h.call('restoreTimerSession()');
 assert.equal(h.c.timerSessionId,id);assert.equal(h.c.cfg.sessions,4);assert.equal(h.c.focusSessionTaskId,7);
 assert.equal(h.c.quickTraining.phase,'rest');assert.equal(h.c.quickTraining.sets,2);
});
