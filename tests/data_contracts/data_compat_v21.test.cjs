'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../android/app/src/main/assets/web/data_compat_v21.js');
const keys = C.KEYS;
const clone = x => JSON.parse(JSON.stringify(x));
const sample = () => ({
  cfg:{lang:'ar',domain:'study',todayMins:22,sessions:1,streak:1,water:2, sessionHistory:[{id:'focus_abc',date:'2026-10-18',minutes:22,domain:'study',detail:{source:'v21'}}], unknownLegacy:{a:1}},
  tasksList:[{id:1,isStarter:true,title:'قديم',date:'2026-10-18',catKey:'study',done:false,legacy:7},{id:1777777777777,title:'عمل',catKey:'exam',date:'2026-10-19',done:true}],
  notesList:[{id:1,isStarter:true,title:'Note',body:'body',calDate:'2026-10-19',catKey:'cornell',pinned:true,favorite:false,legacy:'retain'},{id:1777777777778,title:'New',body:'Test',catKey:'quick',calDate:'2026-10-19',blur:false}]
});
function store(initial={}) {
 const m=new Map(Object.entries(initial));let fail=null;
 return {m, failWhen(f){fail=f}, getItem(k){return m.has(k)?m.get(k):null},setItem(k,v){if(fail&&fail('set',k))throw new Error('simulated quota');m.set(k,String(v));}, removeItem(k){if(fail&&fail('remove',k))throw new Error('simulated IO');m.delete(k)}};
}
function populated(data=sample()) {
 const s=store(); for(const [k,v] of [[keys.cfg,data.cfg],[keys.tasks,data.tasksList],[keys.notes,data.notesList]]){
  const packet=C.encodePacket(v,123);s.setItem(k,packet);s.setItem(k+'_mirror',packet);
 }return s;
}
function backup(data=sample(),prefix=true) {
 const bundle=JSON.stringify({...data,v:21});
 const outer=JSON.stringify({bundle,sig:C.computeHash(bundle)});
 const b64=Buffer.from(outer,'utf8').toString('base64');return prefix?'ZEN21::'+b64:b64;
}
test('legacy packets and separate mirror keys are parsed without any write',()=>{
 const s=populated();const original=[...s.m];const r=C.inspectStorage(s);
 assert.equal(r.ok,true);assert.deepEqual(r.snapshot,sample());assert.deepEqual([...s.m],original);
 assert.equal(r.sources.cfg,'primary');
});
test('retains numeric IDs and all legacy fields while additively adding new defaults',()=>{
 const input=sample(),copy=clone(input);const plan=C.planMigration(input,{cfg:{newGoal:30},task:{priority:'normal'},note:{pinned:false,favorite:true},session:{extra:'ok'}});
 assert.deepEqual(input,copy);assert.equal(plan.after.tasksList[0].id,1);assert.equal(typeof plan.after.tasksList[0].id,'number');
 assert.equal(plan.after.tasksList[0].legacy,7);assert.equal(plan.after.notesList[0].pinned,true);
 assert.equal(plan.after.notesList[0].favorite,false);assert.equal(plan.after.notesList[0].legacy,'retain');
 assert.equal(plan.after.notesList[1].favorite,true);assert.equal(plan.after.cfg.sessionHistory[0].id,'focus_abc');
 assert.equal(plan.after.cfg.sessionHistory[0].extra,'ok');assert.equal(plan.after.cfg.newGoal,30);
 assert.ok(plan.changes > 0);
});
test('duplicates reported, never deleted or silently renumbered',()=>{
 const x=sample();x.tasksList.push(clone(x.tasksList[0]));x.notesList.push(clone(x.notesList[0]));
 const report=C.inspectRecords(x);assert.ok(report.issues.some(e=>e.code==='DUPLICATE_ID'&&e.path.startsWith('tasksList')));
 assert.ok(report.issues.some(e=>e.code==='DUPLICATE_ID'&&e.path.startsWith('notesList')));
 const plan=C.planMigration(x,{task:{newFlag:true}});assert.equal(plan.after.tasksList.length,3);
 assert.deepEqual(plan.after.tasksList.map(t=>t.id),[1,1777777777777,1]);
});
test('rejects invented note_ and task_ IDs and numeric strings rather than coercing types',()=>{
 for(const invalid of ['note_1','task_1','12',9007199254740992]){
  const x=sample();x.notesList[0].id=invalid;
  assert.equal(C.inspectRecords(x).ok,false);assert.throws(()=>C.planMigration(x,{note:{x:1}}));
 }
});
test('corrupt primary falls back to a valid mirror read-only',()=>{
 const s=populated();s.setItem(keys.cfg,'{bad-json');const before=[...s.m];
 const r=C.inspectStorage(s);assert.equal(r.ok,true);assert.equal(r.sources.cfg,'mirror');
 assert.ok(r.issues.some(e=>e.code==='INVALID_PRIMARY'));assert.deepEqual([...s.m],before);
});
test('corrupt primary AND mirror blocks migration and leaves bytes unchanged',()=>{
 const s=populated();s.setItem(keys.notes,'{broken');s.setItem(keys.notes+'_mirror','{broken');const before=[...s.m];
 assert.equal(C.inspectStorage(s).ok,false);assert.throws(()=>C.planMigrationFromStorage(s,{note:{x:1}}));assert.deepEqual([...s.m],before);
});
test('diverging but valid mirror remains untouched and is surfaced',()=>{
 const s=populated();s.setItem(keys.tasks+'_mirror',C.encodePacket([],0));
 const report=C.inspectStorage(s);assert.equal(report.ok,true);assert.ok(report.issues.some(x=>x.code==='MIRROR_DIVERGED'));
 assert.equal(report.snapshot.tasksList.length,2);
});
test('prefixed and historical unprefixed V21 backup formats both accepted as plaintext integrity checks',()=>{
 for(const p of [true,false]) {const report=C.inspectBackup(backup(sample(),p));assert.equal(report.ok,true);assert.deepEqual(report.snapshot,sample());}
});
test('tampered hash, unsupported v20, fabricated IDs, garbage and huge input are rejected without writes',()=>{
 const s=populated();const before=[...s.m];
 const v20=sample();const bundle=JSON.stringify({...v20,v:20});
 const badVersion=Buffer.from(JSON.stringify({bundle,sig:C.computeHash(bundle)}),'utf8').toString('base64');
 const invalid=sample();invalid.tasksList[0].id='task_1';
 for(const code of ['invalid','ZEN21::???',badVersion,backup(invalid), 'A'.repeat(14000001)])assert.equal(C.inspectBackup(code).ok,false);
 const t=backup();const decoded=JSON.parse(Buffer.from(t.slice(7),'base64').toString('utf8'));decoded.sig='00000000';
 assert.equal(C.inspectBackup('ZEN21::'+Buffer.from(JSON.stringify(decoded)).toString('base64')).ok,false);
 assert.deepEqual([...s.m],before);
});
test('migration requires explicit approval, and never writes on planning or denied consent',()=>{
 const s=populated();const before=[...s.m];const plan=C.planMigrationFromStorage(s,{note:{tags:[]}});
 assert.deepEqual([...s.m],before);assert.throws(()=>C.commitPlan(s,plan));assert.deepEqual([...s.m],before);
});
test('successful migration updates six packets and leaves no journal',()=>{
 const s=populated(),plan=C.planMigrationFromStorage(s,{note:{tags:[]},task:{categoryV2:'x'}});
 const result=C.commitPlan(s,plan,{approved:true});assert.equal(result.ok,true);
 assert.equal(s.getItem(C.JOURNAL_KEY),null);
 const after=C.inspectStorage(s);assert.equal(after.ok,true);assert.deepEqual(after.snapshot.notesList[0].tags,[]);
 assert.equal(after.snapshot.tasksList[0].id,1);assert.equal(s.getItem(keys.tasks),s.getItem(keys.tasks+'_mirror'));
});
test('write failure on third key rolls back every original packet',()=>{
 const s=populated(),before=[...s.m];const plan=C.planMigrationFromStorage(s,{note:{newKey:'v'},task:{extra:'x'},cfg:{flag:true}});
 let once=true;s.failWhen((op,k)=>{if(op==='set'&&k===keys.notes&&once){once=false;return true;}return false;});
 assert.throws(()=>C.commitPlan(s,plan,{approved:true}),/simulated quota/);s.failWhen(null);
 assert.deepEqual([...s.m],before);
});
test('read-only optimistic concurrency refuses to overwrite newer user work',()=>{
 const s=populated(),plan=C.planMigrationFromStorage(s,{cfg:{next:'v'}});s.setItem(keys.cfg,C.encodePacket({...sample().cfg,water:8},456));
 const before=[...s.m];assert.throws(()=>C.commitPlan(s,plan,{approved:true}),/changed/i);assert.deepEqual([...s.m],before);
});
test('simulated crash during pending write can explicitly restore exact original bytes',()=>{
 const s=populated(),before=[...s.m];const plan=C.planMigrationFromStorage(s,{task:{newFlag:1}});
 const old=C.captureRaw(s);const packet=C.encodePacket(plan.after.tasksList,999);
 s.setItem(C.JOURNAL_KEY,JSON.stringify({version:1,state:'pending',original:old,expected:{[keys.tasks]:packet,[keys.tasks+'_mirror']:packet}}));
 s.setItem(keys.tasks,packet);assert.ok(C.inspectPending(s).pending);
 assert.equal(C.recoverPending(s,{approved:true}).ok,true);
 assert.deepEqual([...s.m],before);
});
test('failed rollback leaves durable journal for later explicit recovery',()=>{
 const s=populated(),plan=C.planMigrationFromStorage(s,{note:{add:true},task:{add:true}});
 let taskWrites=0;s.failWhen((op,k)=>{if(op!=='set')return false;if(k===keys.notes)return true;if(k===keys.tasks && ++taskWrites===2)return true;return false;});
 assert.throws(()=>C.commitPlan(s,plan,{approved:true}));assert.notEqual(s.getItem(C.JOURNAL_KEY),null);
 s.failWhen(null);assert.equal(C.recoverPending(s,{approved:true}).ok,true);assert.equal(s.getItem(C.JOURNAL_KEY),null);
});
test('backup restore creates a preview, rejects failed restore without changing current data',()=>{
 const s=populated(),before=[...s.m];const bad='ZEN21::broken';assert.throws(()=>C.planRestoreFromBackup(s,bad));assert.deepEqual([...s.m],before);
 const replacement=sample();replacement.tasksList[0].title='Imported old task';
 const plan=C.planRestoreFromBackup(s,backup(replacement));assert.equal(plan.after.tasksList[0].title,'Imported old task');
 assert.deepEqual([...s.m],before);
 assert.throws(()=>C.commitPlan(s,plan));assert.deepEqual([...s.m],before);
});
test('backup import fails under simulated quota and restores all original bytes',()=>{
 const s=populated(),before=[...s.m];const replacement=sample();replacement.notesList[0].title='Backup';
 const plan=C.planRestoreFromBackup(s,backup(replacement));let once=true;
 s.failWhen((op,k)=>{if(op==='set'&&k===keys.notes+'_mirror'&&once){once=false;return true;}return false;});
 assert.throws(()=>C.commitPlan(s,plan,{approved:true}));s.failWhen(null);assert.deepEqual([...s.m],before);
});

test('duplicate session history entries are reported without dropping time',()=>{
 const x=sample();x.cfg.sessionHistory.push(clone(x.cfg.sessionHistory[0]));
 assert.ok(C.inspectRecords(x).issues.some(i=>i.code==='DUPLICATE_SESSION'));
 const p=C.planMigration(x,{session:{annotation:'retained'}});
 assert.equal(p.after.cfg.sessionHistory.length,2);
});
test('a mutated additive plan cannot drop unknown fields or legacy IDs',()=>{
 const s=populated(),plan=C.planMigrationFromStorage(s,{note:{v2:true}});
 delete plan.after.notesList[0].legacy;
 const before=[...s.m];assert.throws(()=>C.commitPlan(s,plan,{approved:true}),/Additive plan/);
 assert.deepEqual([...s.m],before);
});
test('a committed journal can be finalized explicitly without rolling back valid data',()=>{
 const s=populated(),orig=C.captureRaw(s);const expected={};
 for(const k of Object.values(keys)){const json=k===keys.cfg?sample().cfg:k===keys.tasks?sample().tasksList:sample().notesList;
  const p=C.encodePacket(json);expected[k]=p;expected[k+'_mirror']=p;}
 for(const [k,v] of Object.entries(expected))s.setItem(k,v);
 s.setItem(C.JOURNAL_KEY,JSON.stringify({version:1,state:'committed',original:orig,expected}));
 assert.equal(C.recoverPending(s,{approved:true}).finalized,true);
 assert.equal(s.getItem(C.JOURNAL_KEY),null);
});
test('journal recovery blocks on unknown concurrent writes, no automatic overwrite',()=>{
 const s=populated(),original=C.captureRaw(s);const expected={[keys.tasks]:C.encodePacket([])};
 s.setItem(C.JOURNAL_KEY,JSON.stringify({version:1,state:'pending',original,expected}));
 s.setItem(keys.tasks,'new concurrent value');const before=[...s.m];
 assert.throws(()=>C.recoverPending(s,{approved:true}),/concurrent change/);
 assert.deepEqual([...s.m],before);
});
