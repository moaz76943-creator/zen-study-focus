'use strict';
/* Run after lane 00 has integrated lanes 01, 02, 04, 05 and 06.
 * These tests MUST fail on a baseline that has not integrated those modules. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const web = path.resolve(__dirname, '../../android/app/src/main/assets/web');
function moduleFor(name) {
  const full = path.join(web, name);
  try { return require(full); }
  catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') throw new Error('BLOCKED: lane 00 has not integrated ' + name);
    throw e;
  }
}

test('Cornell checklist -> numeric tasks -> completed focus -> task and analytics credit exactly once', () => {
  const N = moduleFor('notes_core_v21.js');
  const T = moduleFor('tasks_core_v21.js');
  const A = moduleFor('analytics_core_v21.js');
  const notes = [{id:77,title:'Research',body:['☐ Read journal','- [ ] Draft report'].join('\n')}];
  const choices = N.checklistCandidates(notes, [], 77);
  assert.equal(choices.length, 2);
  const extracted = N.extractTasks(notes, [], 77, choices.map((x,i) => ({key:x.key,taskId:101+i})), 1000);
  assert.equal(extracted.created.length, 2);
  assert.equal(typeof extracted.created[0].id, 'number');
  assert.equal(N.checklistCandidates(extracted.notes, extracted.tasks, 77).length, 0);
  const cfg = {sessionHistory:[
    {id:'focus-1',date:'2026-10-19',minutes:25,domain:'study',mode:'focus',completed:true,taskId:101},
    {id:'focus-1',date:'2026-10-19',minutes:25,domain:'study',mode:'focus',completed:true,taskId:101}
  ]};
  let state = {cfg, tasksList: extracted.tasks};
  state = T.setStatus(state, 101, 'completed', {now:'2026-10-19T10:00:00Z'}).state;
  assert.equal(state.tasksList.find(x => x.id === 101).done, true);
  assert.equal(T.actualFocusMinutes(state, 101), 25);
  const report = A.buildReport(state, {today:'2026-10-19',startDate:'2026-10-19',endDate:'2026-10-19'});
  assert.equal(report.totals.minutes, 25);
  assert.equal(report.totals.sessions, 1);
});

test('legacy packet read uses verified mirror without overwriting user bytes', () => {
  const D = moduleFor('data_compat_v21.js');
  const values = {
    [D.KEYS.cfg]: {lang:'ar',sessionHistory:[{id:'s',date:'2026-10-19',minutes:5,domain:'study'}]},
    [D.KEYS.tasks]: [{id:1,title:'قديم',done:false,legacy:7}],
    [D.KEYS.notes]: [{id:1,title:'قديم',body:'ملاحظات',calDate:'2026-10-19',legacy:true}]
  };
  const original = new Map();
  for (const [key, value] of Object.entries(values)) {
    const pkt = D.encodePacket(value, 123);
    original.set(key, pkt);
    original.set(key + '_mirror', pkt);
  }
  original.set(D.KEYS.cfg, '{broken');
  const store = {
    getItem:k => original.has(k) ? original.get(k) : null,
    setItem:() => { throw new Error('Read-only QA must never write'); },
    removeItem:() => { throw new Error('Read-only QA must never delete'); }
  };
  const before = [...original];
  const report = D.inspectStorage(store);
  assert.equal(report.ok, true);
  assert.equal(report.sources.cfg, 'mirror');
  assert.equal(report.snapshot.notesList[0].id, 1);
  assert.equal(typeof report.snapshot.tasksList[0].id, 'number');
  assert.deepEqual([...original], before);
});

test('regular edits never rewrite historical note IDs or unknown properties', () => {
  const N = moduleFor('notes_core_v21.js');
  const notes = [{id:1,title:'قديم',body:'أهلاً',unknownLegacy:{value:7}}];
  const edited = N.edit(notes, 1, {body:'الْعِلْمُ نُورٌ'}, {now:5000});
  assert.equal(edited[0].id, 1);
  assert.deepEqual(edited[0].unknownLegacy, {value:7});
  assert.equal(notes[0].body, 'أهلاً');
  assert.equal(N.search(edited,{query:'العلم نور'}).total, 1);
  assert.throws(() => N.edit(edited,'note_1',{title:'invalid'},{now:6000}));
});

test('analytics never invents old timestamps or counts invalid/demo/duplicate sessions', () => {
  const A = moduleFor('analytics_core_v21.js');
  const r = A.normalizeSessions([
    {id:1,date:'2026-10-19',minutes:10,domain:'study'},
    {id:1,date:'2026-10-19',minutes:10,domain:'study'},
    {id:'fake',date:'2026-10-19',minutes:50,domain:'study',isDemo:true},
    {id:'bad',date:'2026-02-30',minutes:30,domain:'study'}
  ]);
  assert.equal(r.sessions.length, 1);
  assert.equal(r.sessions[0].minutes, 10);
  assert.equal(r.sessions[0].startedAt, null);
  assert.equal(r.sessions[0].endedAt, null);
});

test('mixer supports simultaneous voices and releases every stopped player', () => {
  const S = moduleFor('sound_mix_controls.js');
  const playing = new Set(), volume = {};
  const mixer = S.createSoundMixer({
    catalog:[{id:'rain'},{id:'fire'}],
    isPlaying:id => playing.has(id),
    start:id => playing.add(id),
    stop:id => playing.delete(id),
    setVolume:(id,v) => { volume[id] = v; }
  });
  assert.equal(mixer.applyMix([{id:'rain',percent:50},{id:'fire',percent:20}]),true);
  assert.equal(playing.size,2);
  assert.equal(volume.rain,0.5);
  assert.equal(volume.fire,0.2);
  mixer.dispose();
  assert.equal(playing.size,0);
});
