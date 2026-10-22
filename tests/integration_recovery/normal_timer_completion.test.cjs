'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./activity_transition_fixture.cjs');
for(const mode of ['focus','custom','short','long'])for(const at of ['terminal','next-mode'])for(const kind of ['false','throw'])test(`P0 normal completion ${mode} ${at} ${kind}`,()=>{
 const h=fixture({training:false});h.c.currentTimerModeKey=mode;
 const before=h.c.cfg.sessions,writer=h.c.saveFortressData;let reject=true;
 h.c.saveFortressData=(key,next)=>{
  if(reject&&key.includes('active_timer')&&((at==='terminal')===!!next.sessionId)){
   if(kind==='throw')throw Error('Injected completion save failure');return false;
  }
  return writer(key,next);
 };
 assert.equal(h.call('finalizeTimerSession(true)'),false);
 assert.equal(h.c.timerSessionId,'stable-id');assert.equal(h.c.focusSessionTaskId,7);
 assert.equal(h.c.currentTimerModeKey,mode);assert.equal(h.c.timerLeft,0);assert.equal(h.c.timerRunning,false);
 assert.equal(h.events.includes('chime'),false,'No alert for uncommitted transition');
 assert.equal(h.c.cfg.sessions,before+(['focus','custom'].includes(mode)?1:0));
 reject=false;assert.equal(h.call('toggleTimerPlay()'),true);
 assert.equal(h.c.timerSessionId,null);assert.equal(h.saved().sessionId,null);
 assert.equal(h.c.currentTimerModeKey,['focus','custom'].includes(mode)?'short':'focus');
 assert.equal(h.c.cfg.sessions,before+(['focus','custom'].includes(mode)?1:0));
 assert.equal(h.c.cfg.sessionHistory.filter(x=>x.id==='stable-id').length,['focus','custom'].includes(mode)?1:0);
});
test('P0 normal completion rejects false next-mode result without success chime',()=>{
 const h=fixture({training:false});h.c.selectTimerMode=()=>false;
 assert.equal(h.call('finalizeTimerSession(true)'),false);assert.equal(h.c.timerSessionId,'stable-id');
 assert.equal(h.events.includes('chime'),false);
});
test('P0 normal completion successful next-mode save precedes completion chime',()=>{
 const h=fixture({training:false});assert.equal(h.call('finalizeTimerSession(true)'),true);
 assert.equal(h.events.at(-1),'chime');assert.equal(h.c.cfg.sessions,4);
});
