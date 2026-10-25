'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const p=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const notes=['id','vi','th','el','sk','ca','gl','af','bs','sq'];
const tasks=['id','ca','af'];
const keys='title subtitle add project today search all board matrix trash calendar undo redo empty task desc due time cat priority estimate repeat group notes proj none save cancel focus edit done resume archive remove restore addCheck check sub study sport review exam todo doing completed archived low medium high urgent daily weekly monthly never allCategories estimated actual overdue do schedule delegate eliminate invalid notConnected'.split(' ');
function api(){const w={window:{},console};vm.createContext(w);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),w);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8'),w);
  return w.window.DF99Locale;
}
test('10 new complete 36-label notes dictionaries are provided',()=>{
  for(const lang of notes){const dict=p[lang]?.notes; assert.ok(dict,'missing notes for '+lang);
    assert.deepEqual(Object.keys(dict).sort(),Array.from({length:36},(_,i)=>String(i)).sort(),lang+' note keys');
    assert.ok(Object.values(dict).every(x=>typeof x==='string'&&x.trim()),lang+' empty notes');
  }
});
test('3 new complete 64-label tasks dictionaries use canonical identifiers',()=>{
  for(const lang of tasks){const dict=p[lang]?.tasks;assert.ok(dict,lang+' tasks missing');
    assert.deepEqual(Object.keys(dict).sort(),keys.slice().sort(),lang+' tasks keys');
    assert.ok(Object.values(dict).every(x=>typeof x==='string'&&x.trim()),lang+' empty tasks');
  }
});
test('offline runtime resolves 552 new entries and absent keys use safe English fallback',()=>{
  const t=api().t; let count=0;
  for(const lang of notes){for(const [key,text] of Object.entries(p[lang].notes)){
    assert.equal(t(lang,'notes',key,'fallback'),text,lang+'/notes/'+key);count++;
  }}
  for(const lang of tasks){for(const [key,text] of Object.entries(p[lang].tasks)){
    assert.equal(t(lang,'tasks',key,'fallback'),text,lang+'/tasks/'+key);count++;
  }}
  assert.equal(count,552);
  for(const lang of ['he','iw','zz'])assert.equal(t(lang,'notes','25','fallback'),'fallback');
  assert.equal(t('vi','tasks','title','fallback'),'fallback');
  assert.equal(t('id','tasks','nonexistent','fallback'),'fallback');
});
test('original 3099 strings are retained; no network, mutable storage or injected markup',()=>{
  const sum=Object.values(p).reduce((n,sec)=>n+Object.values(sec).reduce((m,obj)=>m+Object.keys(obj).length,0),0);
  assert.ok(sum>=3651,`Expected >=3651 strings, got ${sum}`);
  for(const lang of ['de','es','fr','it','pt','tr','ru','nl','sv','da','no','fi','pl','uk','ro','cs','hu'])assert.ok(p[lang]?.timer,lang+' prior pack missing');
  assert.equal(p.he,undefined);assert.equal(p.iw,undefined);
  for(const lang of notes)for(const fam of Object.keys(p[lang]))for(const x of Object.values(p[lang][fam])){
    assert.doesNotMatch(x,/[\u0660-\u0669\u06f0-\u06f9]|<\/?(?:script|style|iframe)/i);
  }
  const generated=fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8');
  assert.doesNotMatch(generated,/\b(?:localStorage|indexedDB|XMLHttpRequest|fetch\s*\()\b/);
});
test('selected visible UI labels are localized and unchanged in meaning',()=>{
  assert.equal(p.id.notes['25'],'Simpan catatan');
  assert.equal(p.vi.notes['32'],'Xóa');
  assert.equal(p.th.notes['31'],'ปฏิทิน');
  assert.equal(p.el.notes['28'],'Επεξεργασία');
  assert.equal(p.sk.notes['25'],'Uložiť poznámku');
  assert.equal(p.ca.tasks.cancel,'Cancel·la');
  assert.equal(p.gl.notes['25'],'Gardar nota');
  assert.equal(p.af.tasks.title,'Taakstudio');
  assert.equal(p.bs.notes['32'],'Izbriši');
  assert.equal(p.sq.notes['35'],'U ruajt');
});
