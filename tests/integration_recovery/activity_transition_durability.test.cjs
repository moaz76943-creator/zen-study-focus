'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./activity_transition_fixture.cjs');
for(const running of [false,true])for(const training of [false,true])for(const key of ['active_timer','cfg_v21'])for(const kind of ['throw','false'])test(`P0 domain running=${running} training=${training} ${key} ${kind}`,()=>{
 const h=fixture({running,training}),before=h.state(),packets=new Map(h.slots),button=h.element('mainPlayBtn').innerHTML;
 h.reject(key,kind);
 assert.equal(h.call("switchActivityDomain('work',null)"),false);
 assert.deepEqual(h.state(),before);assert.deepEqual(h.slots,packets,'Both timer and config packets roll back');
 assert.equal(h.element('mainPlayBtn').innerHTML,button);
 assert.ok(h.events.every(x=>Array.isArray(x)&&x[0]==='save'),'No native/UI/scheduling publication on refusal');
 assert.ok(h.messages.some(m=>/save/i.test(m)));
 h.accept();h.events.length=0;
 assert.equal(h.call("switchActivityDomain('work',null)"),true);
 assert.equal(h.c.cfg.domain,'work');assert.equal(h.c.quickTraining,null);
 assert.equal(h.saved().total,1500);assert.equal(h.saved().sessionId,null);
 assert.equal(h.saved().training,null);assert.equal(h.saved().running,false);
 assert.deepEqual(h.c.cfg.sessionHistory,before.cfg.sessionHistory);
 assert.equal(h.events.filter(e=>e==='native-stop').length,running?1:0);
});
test('P0 domain Cancel preserves packets, identity, training and native work',()=>{
 const h=fixture(),before=h.state(),packets=new Map(h.slots);h.c.window.confirm=()=>false;
 assert.equal(h.call("switchActivityDomain('work',null)"),false);
 assert.deepEqual(h.state(),before);assert.deepEqual(h.slots,packets);assert.deepEqual(h.events,[]);
});
for(const running of [false,true])for(const training of [false,true])for(const kind of ['throw','false'])test(`P0 sport rest running=${running} training=${training} ${kind}`,()=>{
 const h=fixture({running,training}),before=h.state(),packets=new Map(h.slots),button=h.element('mainPlayBtn').innerHTML;
 h.reject('active_timer',kind);
 assert.equal(h.call('startQuickSportRest(45)'),false);
 assert.deepEqual(h.state(),before);assert.deepEqual(h.slots,packets);
 assert.equal(h.element('mainPlayBtn').innerHTML,button);
 assert.ok(h.events.every(e=>Array.isArray(e)&&e[0]==='save'));
 assert.ok(h.messages.some(m=>/save/i.test(m)));
 h.accept();h.events.length=0;assert.equal(h.call('startQuickSportRest(45)'),true);
 assert.equal(h.c.currentTimerModeKey,'short');assert.equal(h.c.quickTraining,null);
 assert.equal(h.saved().mode,'short');assert.equal(h.saved().total,45);assert.equal(h.saved().running,true);
 assert.equal(h.saved().training,null);assert.equal(h.saved().taskId,null);
 assert.ok(h.saved().sessionId&&h.saved().sessionId!=='stable-id');
 assert.equal(h.events.filter(e=>Array.isArray(e)&&e[0]==='save').length,1,'No Pause/intermediate/reset/start saves');
 assert.equal(h.events.filter(e=>e==='native-start').length,1);
 assert.equal(h.events.filter(e=>e==='interval-start').length,1);
 assert.deepEqual(h.c.cfg.sessionHistory,before.cfg.sessionHistory,'Rest never awards focus');
});
test('P0 sport rest Cancel keeps running training and packets without writes',()=>{
 const h=fixture(),before=h.state(),packets=new Map(h.slots);h.c.window.confirm=()=>false;
 assert.equal(h.call('startQuickSportRest(45)'),false);assert.deepEqual(h.state(),before);
 assert.deepEqual(h.slots,packets);assert.deepEqual(h.events,[]);
});
for(const action of ['start','advance','skip','cancel','complete','stop'])for(const running of [false,true])for(const kind of ['throw','false'])test(`P0 training ${action} running=${running} ${kind}`,()=>{
 const h=fixture({running,training:action!=='start'}),before=h.state(),packets=new Map(h.slots),button=h.element('mainPlayBtn').innerHTML;
 const calls={start:'startQuickTraining()',advance:'advanceQuickTrainingStep()',skip:'skipQuickTrainingStep()',cancel:'cancelQuickTraining(true)',complete:'completeQuickTraining()',stop:'stopQuickTrainingInternal()'};
 h.reject('active_timer',kind);
 assert.equal(h.call(calls[action]),false,'Refusal must abort the entire transition');
 assert.deepEqual(h.state(),before);assert.deepEqual(h.slots,packets);
 assert.equal(h.element('mainPlayBtn').innerHTML,button);
 assert.ok(h.events.every(e=>Array.isArray(e)&&e[0]==='save'),'No phase/event/UI/native changes on failure');
 h.accept();h.events.length=0;assert.equal(h.call(calls[action]),true);
 assert.deepEqual(h.c.cfg.sessionHistory,before.cfg.sessionHistory,'Manual phase actions cannot award completion credit');
 assert.equal(h.c.quickInternalChange,false);
 assert.equal(h.events.filter(e=>Array.isArray(e)&&e[0]==='save'&&e[1].includes('active_timer')).length,1);
 if(['start','advance','skip'].includes(action)){
  assert.equal(h.saved().running,true);assert.equal(h.saved().taskId,7);
  assert.equal(h.saved().training.taskId,7);assert.equal(h.saved().training.sets,2);
  assert.equal(h.saved().training.currentSet,0);
  assert.equal(h.saved().training.phase,action==='start'?'work':'rest');
  assert.equal(h.saved().total,action==='start'?20:10);
 }else{
  assert.equal(h.saved().training,null);assert.equal(h.saved().running,false);
  assert.equal(h.c.quickTraining,null);
 }
});
for(const kind of ['throw','false'])test(`P0 training start cfg ${kind} rolls back provisional timer`,()=>{
 const h=fixture({training:false}),before=h.state(),packets=new Map(h.slots);h.reject('cfg_v21',kind);
 assert.equal(h.call('startQuickTraining()'),false);assert.deepEqual(h.state(),before);
 assert.deepEqual(h.slots,packets);assert.ok(h.events.every(e=>Array.isArray(e)&&e[0]==='save'));
});
test('P0 training Cancel prompt and completed event are non-destructive and nonduplicated',()=>{
 const h=fixture(),before=h.state();h.c.window.confirm=()=>false;
 assert.equal(h.call('cancelQuickTraining()'),false);assert.deepEqual(h.state(),before);assert.deepEqual(h.events,[]);
 h.c.window.confirm=()=>true;assert.equal(h.call('completeQuickTraining()'),true);
 assert.equal(h.call('completeQuickTraining()'),false);
 assert.equal(h.events.filter(e=>Array.isArray(e)&&e[0]==='event'&&e[1]==='completed').length,1);
});
test('P0 training no-rest and final-rest rounds retain count and task binding',()=>{
 const h=fixture();h.c.quickTraining.restSeconds=0;
 assert.equal(h.call('advanceQuickTrainingStep()'),true);
 assert.equal(h.saved().training.currentSet,1);assert.equal(h.saved().training.phase,'work');
 assert.equal(h.saved().training.taskId,7);assert.equal(h.saved().total,20);
 h.c.quickTraining.skipLastRest=false;h.c.quickTraining.restSeconds=10;
 assert.equal(h.call('advanceQuickTrainingStep()'),true);assert.equal(h.saved().training.phase,'rest');
 assert.equal(h.saved().training.currentSet,1);
 assert.equal(h.call('advanceQuickTrainingStep()'),true);assert.equal(h.saved().training,null);
 assert.equal(h.c.cfg.sessions,3);
});
test('P0 training completion save rejection retries the credited ID without duplicate achievements',()=>{
 const h=fixture();h.reject('active_timer','false');
 assert.equal(h.call('finalizeTimerSession(true)'),false);
 assert.equal(h.c.quickTraining.phase,'work');assert.equal(h.c.quickTraining.currentSet,0);
 assert.equal(h.c.timerSessionId,'stable-id');assert.equal(h.c.cfg.sessions,4);
 assert.equal(h.events.includes('chime'),false,'A failed phase transition must not announce success');
 h.accept();assert.equal(h.call('toggleTimerPlay()'),true);
 assert.equal(h.c.cfg.sessions,4);assert.equal(h.c.cfg.sessionHistory.filter(x=>x.id==='stable-id').length,1);
 assert.equal(h.c.quickTraining.phase,'rest');assert.equal(h.saved().training.phase,'rest');
});
for(const key of ['active_timer','cfg_v21'])for(const kind of ['mirror','readback'])test(`P0 training actual ${key} ${kind} rollback keeps exact packets`,()=>{
 const h=fixture({training:false}),before=h.state(),packets=new Map(h.slots);h.reject(key,kind);
 assert.equal(h.call('startQuickTraining()'),false);
 assert.deepEqual(h.state(),before);assert.deepEqual(h.slots,packets);
});
test('P0 training native cfg ACK refusal restores provisional timer and keeps old session',()=>{
 const h=fixture({training:false}),before=h.state(),packets=new Map(h.slots);h.reject('cfg_v21','ack');
 assert.equal(h.call('startQuickTraining()'),false);
 assert.deepEqual(h.state(),before);assert.deepEqual(h.slots,packets);
});
test('P0 training Start Cancel preserves existing timer without changing activity or preferences',()=>{
 const h=fixture({training:false}),before=h.state(),packets=new Map(h.slots);h.c.window.confirm=()=>false;
 assert.equal(h.call('startQuickTraining()'),false);
 assert.deepEqual(h.state(),before);assert.deepEqual(h.slots,packets);assert.deepEqual(h.events,[]);
});
test('P0 training optional preset failure cannot stop an already acknowledged running session',()=>{
 const h=fixture({training:false});h.c.saveQuickConfig=()=>false;h.c.quickSaveError=()=> 'Could not save preferences';
 assert.equal(h.call('startQuickTraining()'),true);
 assert.equal(h.saved().running,true);assert.equal(h.saved().training.phase,'work');
 assert.equal(h.events.filter(e=>e==='native-start').length,1);
 assert.ok(h.messages.includes('Could not save preferences'));assert.ok(!h.messages.includes('started'));
});
test('P0 training unavailable rollback is explicit and never publishes native or success events',()=>{
 const h=fixture({training:false}),before=h.state();h.reject('cfg_v21','false');
 const key='zen_fortress_active_timer_v21',old=h.slots.get(key),write=h.c.localStorage.setItem;
 h.c.localStorage.setItem=(k,v)=>{if(k===key&&v===old)throw Error('Rollback IO unavailable');write(k,v);};
 assert.throws(()=>h.call('startQuickTraining()'),/TIMER_ROLLBACK_UNVERIFIED/);
 assert.deepEqual(h.state(),before);
 assert.ok(h.events.every(e=>Array.isArray(e)&&e[0]==='save'));
 assert.ok(h.messages.includes('Could not save'));
});
