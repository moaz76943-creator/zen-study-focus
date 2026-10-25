'use strict';
/* Deterministic scale checks of real pure cores; not a substitute for WebView/device profiling. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const web = path.resolve(__dirname, '../../android/app/src/main/assets/web');
function load(f) {
  try { return require(path.join(web,f)); }
  catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') throw Error('BLOCKED: await track 00 integration of ' + f);
    throw e;
  }
}
test('5,000 Arabic notes remain searchable, with bounded result pages', () => {
  const N = load('notes_core_v21.js');
  const notes = Array.from({length:5000}, (_,i) => ({
    id:i,title:'بحث '+i,body:'العِلْمُ نُورٌ',createdAt:i
  }));
  const result = N.search(notes,{query:'بحث',limit:500,offset:100});
  assert.equal(result.total,5000);
  assert.equal(result.items.length,100);
  assert.equal(notes[0].id,0);
});
test('1,000 tasks exclude starter/demo records from real task counts', () => {
  const T = load('tasks_core_v21.js');
  const state = {cfg:{sessionHistory:[]},tasksList:Array.from({length:1000},(_,i)=>({
    id:i+1,title:'Work '+i,done:false,date:'2026-10-19',catKey:'study',isStarter:i<4
  }))};
  assert.equal(T.listTasks(state).length,996);
});
test('10,000 history rows deduplicate to 5,000 correctly credited sessions', () => {
  const A = load('analytics_core_v21.js');
  const sessionHistory = Array.from({length:10000},(_,i)=>({
    id:'s'+(i%5000),date:'2026-10-19',minutes:1,domain:'study'
  }));
  const report = A.buildReport({sessionHistory},{today:'2026-10-19',startDate:'2026-10-19',endDate:'2026-10-19'});
  assert.equal(report.totals.sessions,5000);
  assert.equal(report.totals.minutes,5000);
});
