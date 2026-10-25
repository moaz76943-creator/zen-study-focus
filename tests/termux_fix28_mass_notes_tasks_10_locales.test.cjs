'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const pack=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const langs=['et','be','mk','eo','mt','ga','cy','eu','uz','kk'];
const taskLangs=['et','mk','eo'];
const englishNotes={0:'✦ NOTES STUDIO',25:'Save note',31:'Calendar',32:'Delete'};
function runtime(){const c={window:{},console};vm.createContext(c);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),c);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8'),c);
  return c.window.DF99Locale.t;
}
test('batch28 adds ten complete native note dictionaries',()=>{
  for(const code of langs){
    const d=pack[code]?.notes;
    assert.ok(d,`MISSING_BATCH28 ${code}/notes`);
    assert.deepEqual(Object.keys(d).sort(),Array.from({length:36},(_,i)=>String(i)).sort());
    assert.ok(Object.values(d).every(v=>typeof v==='string' && v.trim()),code+' empty note');
    assert.notEqual(d['25'],englishNotes[25],code+' note should be translated');
    for(const t of Object.values(d))assert.doesNotMatch(t,/[\u0660-\u0669\u06F0-\u06F9]|<\/?(?:script|style|iframe)/i);
  }
});
test('batch28 adds three full native task dictionaries',()=>{
  const ids='title subtitle add project today search all board matrix trash calendar undo redo empty task desc due time cat priority estimate repeat group notes proj none save cancel focus edit done resume archive remove restore addCheck check sub study sport review exam todo doing completed archived low medium high urgent daily weekly monthly never allCategories estimated actual overdue do schedule delegate eliminate invalid notConnected'.split(' ');
  for(const code of taskLangs){
    const d=pack[code]?.tasks;
    assert.ok(d,`MISSING_BATCH28 ${code}/tasks`);
    assert.deepEqual(Object.keys(d).sort(),ids.slice().sort());
    assert.ok(Object.values(d).every(v=>typeof v==='string' && v.trim()));
    assert.notEqual(d.title,'Tasks Studio');
  }
});
test('552 new strings resolve offline and unknown terms use fallback',()=>{
  const t=runtime();let seen=0;
  for(const code of langs)for(const [key,value] of Object.entries(pack[code].notes)){
    assert.equal(t(code,'notes',key,'fallback'),value);seen++;
  }
  for(const code of taskLangs)for(const [key,value] of Object.entries(pack[code].tasks)){
    assert.equal(t(code,'tasks',key,'fallback'),value);seen++;
  }
  assert.equal(seen,552);
  for(const code of ['he','iw','zz']) assert.equal(t(code,'notes','25','fallback'),'fallback');
  assert.equal(t('eo','tasks','unknown_key','fallback'),'fallback');
});
test('batch28 preserves all earlier packs and remains strictly offline',()=>{
  const count=Object.values(pack).reduce((n,langs)=>n+Object.values(langs).reduce((s,d)=>s+Object.keys(d).length,0),0);
  assert.ok(count>=4203,`MISSING_BATCH28 expected at least 4203, got ${count}`);
  for(const code of ['de','es','fr','it','pt','tr','ru','nl','sv','da','no','fi','pl','uk','ro','cs','hu'])assert.ok(pack[code]?.timer,code+' previous timer');
  assert.equal(pack.he,undefined);assert.equal(pack.iw,undefined);
  const generated=fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8');
  assert.doesNotMatch(generated,/\b(?:localStorage|indexedDB|XMLHttpRequest|fetch\s*\()\b/);
});
test('visible labels represent real localized actions',()=>{
  assert.equal(pack.et.notes['32'],'Kustuta');
  assert.equal(pack.be.notes['25'],'Захаваць нататку');
  assert.equal(pack.mk.tasks.cancel,'Откажи');
  assert.equal(pack.eo.tasks.save,'Konservi');
  assert.equal(pack.mt.notes['35'],'Issejvjat');
  assert.equal(pack.eu.notes['31'],'Egutegia');
  assert.equal(pack.uz.notes['35'],'Saqlandi');
  assert.equal(pack.kk.notes['32'],'Жою');
});
