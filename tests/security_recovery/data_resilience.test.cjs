'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../android/app/src/main/assets/web/data_compat_v21.js');
const Preflight = require('../../android/app/src/main/assets/web/preflight_v22.js');
const Tasks = require('../../android/app/src/main/assets/web/tasks_core_v21.js');

const copy = value => JSON.parse(JSON.stringify(value));
function fixture() {
  return {
    cfg:{lang:'en',todayMins:25,sessions:1,sessionHistory:[]},
    tasksList:[{id:100,title:'Synthetic task',done:false,date:'2026-10-19',catKey:'study'}],
    notesList:[{id:200,title:'Synthetic note',body:'Text only',catKey:'quick'}]
  };
}
function storage() {
  const data = new Map();
  let fail = () => false;
  return {
    data,
    getItem(k) {return data.has(k) ? data.get(k) : null;},
    setItem(k,v) {if (fail('set',k)) throw new Error('SYNTHETIC_STORAGE_FULL');data.set(k,String(v));},
    removeItem(k) {if (fail('remove',k)) throw new Error('SYNTHETIC_STORAGE_IO');data.delete(k);},
    failWhen(fn) {fail = fn || (()=>false);}
  };
}
function seeded(snapshot=fixture()) {
  const s=storage();
  for(const [key,value] of [
    [C.KEYS.cfg,snapshot.cfg],[C.KEYS.tasks,snapshot.tasksList],[C.KEYS.notes,snapshot.notesList]
  ]) {
    const packet=C.encodePacket(value,123);
    s.setItem(key,packet);s.setItem(key+'_mirror',packet);
  }
  return s;
}
function backup(snapshot=fixture()) {
  const bundle=JSON.stringify({...snapshot,v:21});
  return 'ZEN21::'+Buffer.from(JSON.stringify({bundle,sig:C.computeHash(bundle)}),'utf8').toString('base64');
}

test('malformed primary JSON recovers from verified mirror without writing to either copy',()=>{
  const s=seeded();
  s.setItem(C.KEYS.notes,'{not-json');
  const before=[...s.data];
  const inspected=C.inspectStorage(s);
  assert.equal(inspected.ok,true);
  assert.equal(inspected.sources.notes,'mirror');
  assert.deepEqual(inspected.snapshot.notesList,fixture().notesList);
  assert.deepEqual([...s.data],before);
});

test('dual corruption blocks startup and never seeds defaults over saved user slots',()=>{
  const s=seeded();
  s.setItem(C.KEYS.tasks,'{corrupt');
  s.setItem(C.KEYS.tasks+'_mirror','{corrupt');
  const before=[...s.data];
  const blocked=Preflight.inspect(s);
  assert.equal(blocked.ok,false);
  assert.equal(blocked.kind,'data');
  assert.deepEqual([...s.data],before);
});

test('storage quota failure rolls back exact primary and mirror bytes',()=>{
  const s=seeded(),before=[...s.data];
  const plan=C.planMigrationFromStorage(s,{cfg:{syntheticFlag:true},note:{syntheticFlag:true}});
  let once=true;
  s.failWhen((op,key)=>op==='set'&&key===C.KEYS.notes&&once?(once=false,true):false);
  assert.throws(()=>C.commitPlan(s,plan,{approved:true}),/SYNTHETIC_STORAGE_FULL/);
  s.failWhen(null);
  assert.deepEqual([...s.data],before);
  assert.equal(s.getItem(C.JOURNAL_KEY),null);
});

test('crash after one primary write keeps pending journal and restores exact bytes',()=>{
  const s=seeded(),before=[...s.data];
  const original=C.captureRaw(s);
  const next=copy(fixture().notesList);
  next[0].body='Synthetic unsaved replacement';
  const packet=C.encodePacket(next,456);
  s.setItem(C.JOURNAL_KEY,JSON.stringify({
    version:1,state:'pending',original,expected:{[C.KEYS.notes]:packet,[C.KEYS.notes+'_mirror']:packet}
  }));
  s.setItem(C.KEYS.notes,packet);
  assert.equal(Preflight.inspect(s).kind,'journal');
  assert.equal(C.recoverPending(s,{approved:true}).rolledBack,true);
  assert.deepEqual([...s.data],before);
});

test('broken or altered backups are rejected before any storage changes',()=>{
  const s=seeded(),before=[...s.data];
  for(const code of ['ZEN21::broken','ZEN21::'+Buffer.from('not-json').toString('base64')]) {
    assert.equal(C.inspectBackup(code).ok,false);
    assert.throws(()=>C.planRestoreFromBackup(s,code));
  }
  const altered=JSON.parse(Buffer.from(backup().slice(7),'base64').toString('utf8'));
  altered.bundle=altered.bundle.replace('Synthetic task','Tampered task');
  const tampered='ZEN21::'+Buffer.from(JSON.stringify(altered)).toString('base64');
  assert.equal(C.inspectBackup(tampered).ok,false);
  assert.deepEqual([...s.data],before);
});

test('synthetic safe-integer task and note IDs survive backup round-trip unchanged',()=>{
  const x=fixture(),s=seeded();
  const imported=C.inspectBackup(backup(x));
  assert.equal(imported.ok,true);
  assert.deepEqual(imported.snapshot,x);
  const plan=C.planRestoreFromBackup(s,backup(x));
  assert.equal(plan.changes,0);
  for(const id of ['note_200','200',Number.MAX_SAFE_INTEGER+1]) {
    const bad=copy(x);bad.notesList[0].id=id;
    assert.equal(C.inspectBackup(backup(bad)).ok,false);
  }
});

test('repeated focus session IDs are counted once, conflicting reused IDs are excluded',()=>{
  const a={id:'synthetic-session',completed:true,mode:'focus',taskId:100,minutes:25,date:'2026-10-19'};
  const state={tasksList:fixture().tasksList,cfg:{sessionHistory:[a,copy(a)]}};
  assert.equal(Tasks.actualFocusMinutes(state,100),25);
  state.cfg.sessionHistory.push({...a,minutes:45});
  assert.equal(Tasks.actualFocusMinutes(state,100),0);
});

// FAILING P1 CONTRACT until restore validation treats duplicate IDs as an error.
// Reading legacy duplicates stays read-only and preserves all bytes; rejecting
// AMBIGUOUS NEW IMPORTS does not require deleting or renumbering historical data.
test('SEC-P1 imported duplicate task IDs must not become ambiguous live records',()=>{
  const bad=fixture();
  bad.tasksList.push({...bad.tasksList[0],title:'Other synthetic task'});
  assert.equal(C.inspectBackup(backup(bad)).ok,false,
    'Current validator reports DUPLICATE_ID as warning; reject ambiguous imports before activation');
});
