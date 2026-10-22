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
