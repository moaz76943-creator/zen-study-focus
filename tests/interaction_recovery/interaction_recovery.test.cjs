'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../../android/app/src/main/assets/web/interaction_recovery_06.js');

function deferred() { let resolve, reject; const promise = new Promise((yes,no)=>{resolve=yes;reject=no;}); return {promise,resolve,reject}; }

test('gate refuses overlapping same-key operations and confirms durable results', async()=>{
  const gate=R.createGate(); const d=deferred(); let writes=0;
  const first=gate.run('note:1',async()=>{writes++;return d.promise;});
  assert.equal(gate.isPending('note:1'),true);
  const second=await gate.run('note:1',()=>{writes++;return true;});
  assert.equal(second.status,'busy');assert.equal(writes,1);
  d.resolve({ok:true});assert.equal((await first).status,'success');
  assert.equal(gate.isPending('note:1'),false);
});

test('gate allows distinct operations independently',async()=>{
  const gate=R.createGate();const d=deferred();
  const a=gate.run('note',()=>d.promise);const b=await gate.run('task',()=>true);
  assert.equal(b.status,'success');d.resolve(true);assert.equal((await a).status,'success');
});

test('gate requires confirmed result; undefined, false, error, cancellation are not success',async()=>{
  const gate=R.createGate();
  assert.equal((await gate.run('a',()=>undefined)).status,'failed');
  assert.equal((await gate.run('a',()=>false)).status,'failed');
  assert.equal((await gate.run('a',()=>{throw new Error('private note content');})).status,'failed');
  assert.equal((await gate.run('a',()=>({cancelled:true}))).status,'cancelled');
  assert.equal((await gate.run('a',()=>({ok:false}))).status,'failed');
  assert.equal((await gate.run('a',()=>({ok:true}))).status,'success');
});

test('clipboard waits for resolved write before success notice',async()=>{
  const d=deferred(), messages=[];
  const copy=R.createClipboardAction({clipboard:{writeText(){return d.promise;}},notify:x=>messages.push(x)});
  const operation=copy('hello');assert.deepEqual(messages,[]);
  d.resolve();assert.equal((await operation).status,'success');assert.equal(messages.length,1);
});

test('clipboard unavailable and rejected write do not claim success',async()=>{
  const messages=[];
  const missing=R.createClipboardAction({clipboard:null,notify:x=>messages.push(x)});
  assert.equal((await missing('text')).status,'failed');
  const denied=R.createClipboardAction({clipboard:{writeText:()=>Promise.reject(Error('not allowed'))},notify:x=>messages.push(x)});
  assert.equal((await denied('text')).status,'failed');
  assert.equal(messages.some(m=>m.kind==='success'),false);
});

test('clipboard double submission is not duplicated while pending',async()=>{
  const d=deferred();let calls=0;
  const copy=R.createClipboardAction({clipboard:{writeText(){calls++;return d.promise;}},notify() {}});
  const first=copy('txt','same');assert.equal((await copy('txt','same')).status,'busy');
  d.resolve();await first;assert.equal(calls,1);
});

test('native export never reports success until matching callback receipt',()=>{
  const notices=[];let requested;
  const exportFlow=R.createNativeExportTracker({requestExport:(payload,id)=>{requested={payload,id};},notify:m=>notices.push(m)});
  const started=exportFlow.begin('ZEN21::sample');
  assert.equal(started.status,'pending');assert.equal(started.id,requested.id);
  assert.equal(notices.some(m=>m.kind==='success'),false);
  assert.equal(exportFlow.complete('wrong','success').status,'unknown');
  assert.equal(exportFlow.complete(started.id,'success').status,'success');
  assert.equal(notices.at(-1).kind,'success');
  assert.equal(exportFlow.complete(started.id,'success').status,'unknown');
});

test('native export cancelled and failed remain non-success',()=>{
  const notices=[];const flow=R.createNativeExportTracker({requestExport(){},notify:x=>notices.push(x)});
  const a=flow.begin('data-a');assert.equal(flow.complete(a.id,'cancelled').status,'cancelled');
  const b=flow.begin('data-b');assert.equal(flow.complete(b.id,'failed').status,'failed');
  assert.equal(notices.some(n=>n.kind==='success'),false);
});

test('native export bridge throw never announces completion',()=>{
  const notices=[];const flow=R.createNativeExportTracker({requestExport(){throw Error('x')},notify:n=>notices.push(n)});
  assert.equal(flow.begin('x').status,'failed');
  assert.equal(notices.some(n=>n.kind==='success'),false);
});

test('modal close blocks dirty edits until explicit confirmation',()=>{
  let dirty=true,consent=false,closed=0;
  const close=R.createModalClose({isDirty:()=>dirty,confirmDiscard:()=>consent,close:()=>{closed++;}});
  assert.equal(close('noteModal').status,'blocked');assert.equal(closed,0);
  consent=true;assert.equal(close('noteModal').status,'closed');assert.equal(closed,1);
  dirty=false;assert.equal(close('noteModal').status,'closed');assert.equal(closed,2);
});

test('modal close rejects unknown ids and avoids leaking exception messages',()=>{
  const close=R.createModalClose({isDirty(){throw Error('user note private')},confirmDiscard(){return true},close(){}});
  assert.equal(close('noteModal').status,'failed');
  assert.equal(close('').status,'failed');
});

test('KPI cards lose misleading interactive affordance, remain readable',()=>{
  const attrs={onclick:'addQuickSessionRecord()',role:'button','tabindex':'0'};
  const card={style:{cursor:'pointer'},hasAttribute:n=>n in attrs,getAttribute:n=>attrs[n],removeAttribute:n=>delete attrs[n],setAttribute:(n,v)=>attrs[n]=v};
  const doc={querySelectorAll:()=>[card]};
  assert.equal(R.disableDeadAnalyticsCards(doc),1);
  assert.equal(attrs.onclick,undefined);assert.equal(attrs.role,undefined);
  assert.equal(card.style.cursor,'default');assert.equal(R.disableDeadAnalyticsCards(doc),0);
});

test('exception recorder only keeps safe category counts, never text',()=>{
  const errors=[];const doc={listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},removeEventListener(name){delete this.listeners[name];}};
  const tracker=R.observeAnonymousErrors(doc,report=>errors.push(report));
  doc.listeners.error({error:new TypeError('Secret user note')});
  doc.listeners.unhandledrejection({reason:new Error('Secret title')});
  assert.equal(errors.length,2);
  assert.equal(JSON.stringify(errors).includes('Secret'),false);
  tracker.dispose();assert.deepEqual(doc.listeners,{});
});
