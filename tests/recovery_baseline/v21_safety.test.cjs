'use strict';
// DF-003/DF-006. Disposable fixtures only: NEVER access a user's localStorage.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../../android/app/src/main/assets/web/data_compat_v21.js');

class MemoryStore {
  constructor(){this.m=new Map();this.writes=0;this.failOn=null;}
  getItem(k){return this.m.has(k)?this.m.get(k):null;}
  setItem(k,v){if(this.failOn===k){this.failOn=null;throw Error('simulated quota');}this.writes++;this.m.set(k,String(v));}
  removeItem(k){this.writes++;this.m.delete(k);}
}
const fixture=()=>({
  cfg:{lang:'ar',domain:'study',focusMin:25,unknown:{keep:true},sessionHistory:[
    {id:'s-01',date:'2026-10-19',minutes:25,domain:'study',unrecognized:1}]},
  tasksList:[{id:1,isStarter:true,title:'Starter',done:false,catKey:'study',date:'2026-10-19'},
    {id:910001,title:'مهمة',done:true,unknownTask:'preserve'}],
  notesList:[{id:1,isStarter:true,title:'Starter',body:'Body'},
    {id:910001,title:'عنوان',body:'متن + 漢字',calDate:'2026-10-19',unknownNote:42}]
});
const names=[['cfg','cfg'],['tasks','tasksList'],['notes','notesList']];
function seeded(data=fixture()){
  const st=new MemoryStore();
  for(const [slot,field] of names){
    const p=D.encodePacket(data[field],1700000000000),k=D.KEYS[slot];
    st.setItem(k,p);st.setItem(k+'_mirror',p);
  }
  return st;
}
function bytes(st){return JSON.stringify([...st.m].sort(([a],[b])=>a.localeCompare(b)));}
function backup(data=fixture(),prefixed=true){
  const bundle=JSON.stringify({...data,v:data.v===undefined?21:data.v});
  const payload=Buffer.from(JSON.stringify({bundle,sig:D.computeHash(bundle)}),'utf8').toString('base64');
  return (prefixed?'ZEN21::':'')+payload;
}
test('DF-006 v21 key names and three independent record families',()=>{
  assert.deepEqual(D.KEYS,{cfg:'zen_fortress_cfg_v21',tasks:'zen_fortress_tasks_v21',notes:'zen_fortress_notes_v21'});
  assert.equal(new Set(Object.values(D.KEYS)).size,3);
});
test('DF-006 numeric task/note IDs, opaque session IDs, unknown fields',()=>{
  const data=fixture();
  assert.equal(D.inspectRecords(data).ok,true);
  assert.equal(typeof data.tasksList[1].id,'number');
  assert.equal(typeof data.notesList[1].id,'number');
  assert.equal(typeof data.cfg.sessionHistory[0].id,'string');
  assert.equal(data.cfg.unknown.keep,true);
});
test('DF-006 duplicate IDs are warned about, not deleted or coerced',()=>{
  const data=fixture();data.tasksList.push({...data.tasksList[1]});
  data.cfg.sessionHistory.push({...data.cfg.sessionHistory[0]});
  const x=D.inspectRecords(data);
  assert.equal(x.ok,true);
  assert.ok(x.issues.some(a=>a.code==='DUPLICATE_ID'));
  assert.ok(x.issues.some(a=>a.code==='DUPLICATE_SESSION'));
  assert.equal(data.tasksList.length,3);
});
test('DF-006 rejects prefixed IDs and numeric strings',()=>{
  for(const id of ['note_1','910001',null,-1,1.2]){
    const data=fixture();data.notesList[1].id=id;
    assert.ok(D.inspectRecords(data).issues.some(i=>i.code==='INCOMPATIBLE_RECORD_ID'));
  }
});
test('DF-003 prefixed/plain backups round-trip UTF-8 with no storage writes',()=>{
  const st=seeded(),old=bytes(st),n=st.writes;
  for(const prefixed of [true,false]){
    const out=D.inspectBackup(backup(fixture(),prefixed));
    assert.equal(out.ok,true,JSON.stringify(out.issues));
    assert.deepEqual(out.snapshot,fixture());
  }
  assert.equal(bytes(st),old);assert.equal(st.writes,n);
});
test('DF-003 tampering and unsupported backup version are rejected',()=>{
  const raw=JSON.parse(Buffer.from(backup().slice(7),'base64').toString('utf8'));
  raw.bundle+=' ';const bad='ZEN21::'+Buffer.from(JSON.stringify(raw)).toString('base64');
  assert.equal(D.inspectBackup(bad).ok,false);
  assert.equal(D.inspectBackup(backup({...fixture(),v:20})).ok,false);
});
test('DF-003 corrupt primary uses healthy mirror without overwriting either',()=>{
  const st=seeded();st.setItem(D.KEYS.notes,'{broken');
  const old=bytes(st),n=st.writes,r=D.inspectStorage(st);
  assert.equal(r.ok,true);assert.equal(r.sources.notes,'mirror');
  assert.equal(r.snapshot.notesList[1].body,'متن + 漢字');
  assert.ok(r.issues.some(i=>i.code==='INVALID_PRIMARY'));
  assert.equal(bytes(st),old);assert.equal(st.writes,n);
});
test('DF-003 two bad copies block restore; original bytes remain untouched',()=>{
  const st=seeded();st.setItem(D.KEYS.tasks,'broken1');st.setItem(D.KEYS.tasks+'_mirror','broken2');
  const old=bytes(st),n=st.writes,r=D.inspectStorage(st);
  assert.equal(r.ok,false);assert.ok(r.issues.some(i=>i.code==='UNRECOVERABLE_SLOT'));
  assert.equal(bytes(st),old);assert.equal(st.writes,n);
});
test('DF-003 restore preview is read-only, retains IDs and unknown properties',()=>{
  const st=seeded(),old=bytes(st),n=st.writes;
  const plan=D.planRestoreFromBackup(st,backup());
  assert.equal(plan.kind,'restore-v21');
  assert.equal(plan.after.notesList[1].unknownNote,42);
  assert.equal(plan.after.tasksList[1].id,910001);
  assert.equal(bytes(st),old);assert.equal(st.writes,n);
});
test('DF-003 migration preview is additive only and does not edit saved records',()=>{
  const st=seeded(),old=bytes(st);
  const plan=D.planMigrationFromStorage(st,{cfg:{newFlag:true},note:{newTag:'x'}});
  assert.equal(plan.after.cfg.unknown.keep,true);
  assert.equal(plan.after.notesList[1].unknownNote,42);
  assert.equal(plan.after.notesList[1].newTag,'x');
  assert.equal(bytes(st),old);
  plan.after.notesList[1].body='destructive replacement';
  assert.throws(()=>D.commitPlan(st,plan,{approved:true}),/Additive plan changed existing field/);
  assert.equal(bytes(st),old);
});
test('DF-003 no commit without explicit approval',()=>{
  const st=seeded(),old=bytes(st),plan=D.planMigrationFromStorage(st,{cfg:{newFlag:true}});
  assert.throws(()=>D.commitPlan(st,plan),/approval/);
  assert.equal(bytes(st),old);
});
test('DF-003 simulated mirror quota failure restores all original packets',()=>{
  const st=seeded(),old=bytes(st),plan=D.planMigrationFromStorage(st,{cfg:{newFlag:true}});
  st.failOn=D.KEYS.tasks+'_mirror';
  assert.throws(()=>D.commitPlan(st,plan,{approved:true}),/simulated quota/);
  assert.equal(bytes(st),old);assert.equal(st.getItem(D.JOURNAL_KEY),null);
});
test('DF-003 unfinished journal requires explicit recovery; no implicit changes',()=>{
  const st=seeded(),original=D.captureRaw(st);
  const after=D.planMigrationFromStorage(st,{cfg:{extra:1}}).after,expected={};
  for(const [slot,field] of names){
    const k=D.KEYS[slot],packet=D.encodePacket(after[field]);
    expected[k]=packet;expected[k+'_mirror']=packet;
  }
  st.setItem(D.JOURNAL_KEY,JSON.stringify({version:1,state:'pending',original,expected}));
  st.setItem(D.KEYS.cfg,expected[D.KEYS.cfg]);
  const old=bytes(st),n=st.writes;
  assert.equal(D.inspectPending(st).pending,true);
  assert.equal(bytes(st),old);assert.equal(st.writes,n);
  assert.throws(()=>D.recoverPending(st),/approval/);
  assert.equal(D.recoverPending(st,{approved:true}).rolledBack,true);
  assert.deepEqual(D.captureRaw(st),original);
});
test('DF-003 disposable backup restores verified records and clears journal',()=>{
  const st=seeded(),data=fixture();data.cfg.lang='de';data.tasksList[1].title='Neue Aufgabe';
  const p=D.planRestoreFromBackup(st,backup(data));
  assert.equal(D.commitPlan(st,p,{approved:true}).ok,true);
  assert.deepEqual(D.inspectStorage(st).snapshot,data);
  assert.equal(st.getItem(D.JOURNAL_KEY),null);
});
test('DF-003 dedicated timer and note draft keys remain outside v21 operations',()=>{
  const st=seeded();
  st.setItem('zen_fortress_active_timer_v21','timer state');
  st.setItem('deep_focus_unsaved_note_draft_v1','draft state');
  D.commitPlan(st,D.planMigrationFromStorage(st,{cfg:{extra:true}}),{approved:true});
  assert.equal(st.getItem('zen_fortress_active_timer_v21'),'timer state');
  assert.equal(st.getItem('deep_focus_unsaved_note_draft_v1'),'draft state');
});
