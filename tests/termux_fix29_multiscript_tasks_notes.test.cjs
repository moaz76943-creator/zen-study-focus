'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const newNotes=["zh", "ja", "ko", "hi", "bn", "ur", "fa", "sw", "fil", "ha"];
const newTasks=["zh", "ja", "ko"];
const taskKeys='title subtitle add project today search all board matrix trash calendar undo redo empty task desc due time cat priority estimate repeat group notes proj none save cancel focus edit done resume archive remove restore addCheck check sub study sport review exam todo doing completed archived low medium high urgent daily weekly monthly never allCategories estimated actual overdue do schedule delegate eliminate invalid notConnected'.split(' ');
function runtime(){
  const c={window:{},console}; vm.createContext(c);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),c);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8'),c);
  return c.window.DF99Locale;
}
test('batch29 notes: ten complete nonempty 36-key packs',()=>{
  for(const code of newNotes){
    const d=packs[code]?.notes;
    assert.ok(d,'MISSING_BATCH29 '+code+'/notes');
    assert.deepEqual(Object.keys(d).sort(),Array.from({length:36},(_,i)=>String(i)).sort());
    assert.ok(Object.values(d).every(x=>typeof x==='string' && x.trim()),code+' empty note');
    assert.notEqual(d['25'],'Save note',code+' note save must be translated');
  }
});
test('batch29 tasks: three complete 64-key packs',()=>{
  for(const code of newTasks){
    const d=packs[code]?.tasks;
    assert.ok(d,'MISSING_BATCH29 '+code+'/tasks');
    assert.deepEqual(Object.keys(d).sort(),taskKeys.slice().sort(),code+' wrong task keys');
    assert.notEqual(d.title,'Tasks Studio',code+' title untranslated');
    assert.ok(Object.values(d).every(x=>typeof x==='string' && x.trim()));
  }
});
test('batch29 552 new strings are accessible offline',()=>{
  const t=runtime().t;let count=0;
  for(const code of newNotes)for(const [key,v] of Object.entries(packs[code].notes)){
    assert.equal(t(code,'notes',key,'fallback'),v,code+'/'+key);count++;
  }
  for(const code of newTasks)for(const [key,v] of Object.entries(packs[code].tasks)){
    assert.equal(t(code,'tasks',key,'fallback'),v,code+'/'+key);count++;
  }
  assert.equal(count,552);
});
test('previous 4203 translations remain; no fake completeness',()=>{
  const sum=Object.values(packs).reduce((n,sections)=>n+Object.values(sections).reduce((m,dict)=>m+Object.keys(dict).length,0),0);
  assert.ok(sum>=4755,'Expected >=4755, got '+sum);
  for(const code of ['de','fr','es','it','pt','tr','ru','nl','sv','da','no','fi','pl','uk','ro','cs','hu']){
    assert.ok(packs[code]?.timer,code+' old timer missing');
  }
  for(const code of ['he','iw'])assert.equal(packs[code],undefined);
  const script=fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8');
  assert.doesNotMatch(script,/\b(?:localStorage|indexedDB|XMLHttpRequest|fetch\s*\()\b/);
  for(const code of newNotes)for(const d of Object.values(packs[code]))for(const x of Object.values(d)){
    assert.doesNotMatch(x,/[\u0660-\u0669\u06f0-\u06f9]|<\/?(?:script|style|iframe)/i);
  }
  const t=runtime().t;
  for(const code of ['he','iw','zz'])assert.equal(t(code,'notes','25','fallback'),'fallback');
  assert.equal(t('zh','notes','nonexistent','fallback'),'fallback');
  assert.equal(t('hi','tasks','title','fallback'),'fallback');
});
test('native labels have expected action meaning',()=>{
  assert.equal(packs.zh.notes['32'],'删除');
  assert.equal(packs.ja.tasks.cancel,'キャンセル');
  assert.equal(packs.ko.notes['25'],'노트 저장');
  assert.equal(packs.hi.notes['25'],'नोट सहेजें');
  assert.equal(packs.bn.notes['32'],'মুছুন');
  assert.equal(packs.ur.notes['31'],'کیلنڈر');
  assert.equal(packs.fa.notes['32'],'حذف');
  assert.equal(packs.sw.notes['25'],'Hifadhi andiko');
  assert.equal(packs.fil.notes['35'],'Na-save');
  assert.equal(packs.ha.notes['32'],'Share');
});
