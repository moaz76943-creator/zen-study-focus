'use strict';
/* DF-148/149/154/155: executable PURE-MODULE regressions, not on-device claims.
 * Run: node --test tests/master_recovery_qa/*.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const web = path.resolve(__dirname, '../../android/app/src/main/assets/web');
const load = name => require(path.join(web,name));
const N = load('notes_core_v21.js');
const T = load('tasks_core_v21.js');
const A = load('analytics_core_v21.js');
const D = load('data_compat_v21.js');
const S = load('sound_mix_controls.js');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/v21_user_synthetic.json'),'utf8'));
const clone = x => JSON.parse(JSON.stringify(x));
function storage(seed={}) {
  const data = new Map(Object.entries(seed)); let reject = () => false;
  return {data,setFailure:f => {reject=f||(()=>false);},
    getItem:k=>data.has(k)?data.get(k):null,
    setItem(k,v){if(reject(k))throw Error('quota denied');data.set(k,String(v));},
    removeItem(k){if(reject(k))throw Error('quota denied');data.delete(k);}
  };
}
function withPackets(snapshot) {
  const s=storage();
  for(const [key,val] of [[D.KEYS.cfg,snapshot.cfg],[D.KEYS.tasks,snapshot.tasksList],[D.KEYS.notes,snapshot.notesList]]) {
    const packet=D.encodePacket(val,123);
    s.setItem(key,packet);s.setItem(key+'_mirror',packet);
  }
  return s;
}

test('DF-155 note creation -> checklist extraction -> task completion -> one real credited session',()=>{
  const note={id:900,title:'Plan',body:'- [ ] Read chapter',isStarter:false,custom:'keep'};
  const notes=N.createNote(fixture.notesList,note,{now:1000});
  const choices=N.checklistCandidates(notes,fixture.tasksList,900);
  assert.equal(choices.length,1);
  const x=N.extractTasks(notes,fixture.tasksList,900,[{key:choices[0].key,taskId:901}],1100);
  assert.equal(x.created.length,1);
  assert.equal(x.created[0].originNoteId,900);
  assert.equal(N.checklistCandidates(x.notes,x.tasks,900).length,0);
  assert.equal(x.notes.find(n=>n.id===900).custom,'keep');
  let state={cfg:clone(fixture.cfg),tasksList:x.tasks};
  state=T.setStatus(state,901,'completed',{now:'2026-10-19T11:00:00Z'}).state;
  assert.equal(state.tasksList.find(t=>t.id===901).done,true);
  state.cfg.sessionHistory=[
    {id:'session-1',date:'2026-10-19',minutes:25,domain:'study',mode:'focus',completed:true,taskId:901},
    {id:'session-1',date:'2026-10-19',minutes:25,domain:'study',mode:'focus',completed:true,taskId:901},
    {id:'starter',date:'2026-10-19',minutes:120,domain:'study',isStarter:true}
  ];
  assert.equal(T.actualFocusMinutes(state,901),25);
  const report=A.buildReport(state,{today:'2026-10-19',startDate:'2026-10-19',endDate:'2026-10-19'});
  assert.equal(report.totals.minutes,25);
  assert.equal(report.totals.sessions,1);
  assert.equal(report.daily[0].minutes,25);
  assert.equal(typeof x.created[0].id,'number');
});

test('DF-154 read-only v21 backup roundtrip retains unknown fields, exact numeric IDs and language',()=>{
  const source=clone(fixture);
  const bundle=JSON.stringify({...source,v:21});
  const wrapped=JSON.stringify({bundle,sig:D.computeHash(bundle)});
  const code='ZEN21::'+Buffer.from(wrapped,'utf8').toString('base64');
  const inspected=D.inspectBackup(code);
  assert.equal(inspected.ok,true);
  assert.deepEqual(inspected.snapshot,source);
  assert.equal(inspected.snapshot.cfg.lang,'ar');
  assert.equal(inspected.snapshot.tasksList[0].customLegacy,'preserve');
  assert.equal(typeof inspected.snapshot.notesList[0].id,'number');
  const s=withPackets(source),previous=[...s.data];
  const plan=D.planRestoreFromBackup(s,code);
  assert.deepEqual([...s.data],previous,'Preview may never write');
  assert.equal(D.commitPlan(s,plan,{approved:true}).ok,true);
  assert.deepEqual(D.inspectStorage(s).snapshot,source);
});

test('DF-154 quota failure during multi-family restore rolls back every packet byte',()=>{
  const s=withPackets(fixture),old=[...s.data];
  const candidate=clone(fixture);candidate.notesList[0].body='changed';
  const body=JSON.stringify({...candidate,v:21});
  const code='ZEN21::'+Buffer.from(JSON.stringify({bundle:body,sig:D.computeHash(body)}),'utf8').toString('base64');
  const plan=D.planRestoreFromBackup(s,code);
  let first=true;s.setFailure(k=>k===D.KEYS.notes+'_mirror' && first ? (first=false,true) : false);
  assert.throws(()=>D.commitPlan(s,plan,{approved:true}),/quota denied/);
  s.setFailure(null);
  assert.deepEqual([...s.data],old);
});

test('DF-155 rejected corrupt sessions and legacy date-only sessions never gain invented start hours',()=>{
  const result=A.normalizeSessions([
    {id:'valid',date:'2026-10-19',minutes:12,domain:'work'},
    {id:'valid',date:'2026-10-19',minutes:20,domain:'work'},
    {id:'corrupt',date:'2026-02-30',minutes:80,domain:'work'},
    {id:'fake',date:'2026-10-19',minutes:60,domain:'sport',isDemo:true}
  ]);
  assert.equal(result.sessions.length,1);
  assert.equal(result.sessions[0].startedAt,null);
  assert.equal(result.sessions[0].endedAt,null);
  assert.equal(result.sessions[0].minutes,12);
});

test('DF-150 rain+ocean mix: independent levels, selective stop, stop-all/dispose idempotent',()=>{
  const playing=new Set(),levels={},events=[];
  const mixer=S.createSoundMixer({
    catalog:[{id:'rain'},{id:'ocean'}],
    isPlaying:id=>playing.has(id),
    start:id=>{playing.add(id);events.push('start:'+id);},
    stop:id=>{playing.delete(id);events.push('stop:'+id);},
    setVolume:(id,val)=>{levels[id]=val;}
  });
  assert.equal(mixer.applyMix([{id:'rain',percent:65},{id:'ocean',percent:35}]),true);
  assert.deepEqual(mixer.activeIds().sort(),['ocean','rain']);
  assert.equal(levels.rain,0.65);assert.equal(levels.ocean,0.35);
  assert.equal(mixer.setPercent('rain',20),true);assert.equal(levels.rain,0.2);
  assert.equal(mixer.applyMix([{id:'ocean',percent:35}]),true);
  assert.deepEqual(mixer.activeIds(),['ocean']);
  mixer.stopAll();mixer.stopAll();mixer.dispose();mixer.dispose();
  assert.equal(playing.size,0);
  assert.equal(events.filter(e=>e==='stop:rain').length,1);
  assert.equal(events.filter(e=>e==='stop:ocean').length,1);
  assert.equal(mixer.applyMix([{id:'rain',percent:100}]),false);
  // Explicitly NOT a physical Ogg decode, audio-focus or end-alert test.
});
