"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=JSON.parse(fs.readFileSync(path.join(root,'assets/i18n/df99_reviewed_packs.json'),'utf8'));
const counts={timer:11,goals:15,tasks:64,notes:36,analytics:17,analyticsDomain:4};
const full=['es','fr','de'];
const partial=['it','pt','tr','ru'];
const expected=[...full,...partial].sort();
const file=path.join(root,'android/app/src/main/assets/web/js/df99_reviewed_packs.js');
const bridge=path.join(root,'android/app/src/main/assets/web/js/df99_multiscreen_i18n.js');
const index=fs.readFileSync(path.join(root,'android/app/src/main/assets/web/index.html'),'utf8');
const audit=fs.readFileSync(path.join(root,'tools/df99_full_app_coverage.cjs'),'utf8');
function context(){
  const cx={window:{},console};vm.createContext(cx);
  vm.runInContext(fs.readFileSync(bridge,'utf8'),cx);
  vm.runInContext(fs.readFileSync(file,'utf8'),cx);
  return cx;
}
test('7 native language packs and 629 real section strings, without invented completeness',()=>{
  for(const lang of expected)assert.ok(source[lang],lang+' missing');
  let total=0,sections=0;
  for(const lang of expected){
    const namespace=source[lang];
    for(const fam of (full.includes(lang)?Object.keys(counts):['timer','goals','analytics','analyticsDomain']))assert.ok(namespace[fam],lang+'/'+fam+' missing');
    for(const [family,values] of Object.entries(namespace)){
      assert.equal(Object.keys(values).length,counts[family],lang+'/'+family);
      assert.ok(Object.values(values).every(s=>typeof s==='string'&&s.trim()),lang+'/'+family);
      assert.ok(Object.values(values).every(s=>!/[\u0660-\u0669\u06f0-\u06f9]/.test(s)),lang+'/'+family);
      assert.ok(Object.values(values).every(s=>!/<\/?(?:script|style|iframe)/i.test(s)),lang+'/'+family);
      total+=Object.keys(values).length;sections++;
    }
  }
  assert.ok(total>=629);assert.ok(sections>=34);
  assert.equal(source.he,undefined);assert.equal(source.iw,undefined);
});
test('Runtime bridge resolves translated terms across six families',()=>{
  const cx=context(),t=cx.window.DF99Locale.t;
  const cases=[
    ['es','timer','0','⚙ Personalizar'],
    ['fr','goals','save','Objectifs enregistrés'],
    ['de','tasks','title','Aufgabenstudio'],
    ['es','notes','25','Guardar nota'],
    ['de','analytics','export','CSV exportieren'],
    ['it','analyticsDomain','work','Lavoro'],
    ['pt','timer','8','Guardar'],
    ['tr','goals','noGoal','Hedef belirle'],
    ['ru','analytics','sessions','Сессии']
  ];
  for(const [lang,area,key,value] of cases) assert.equal(t(lang,area,key,'fallback'),value,lang+'/'+area+'/'+key);
});
test('No false translations: existing English fallback is preserved for absent sections',()=>{
  const cx=context();const t=cx.window.DF99Locale.t;
  for(const code of ['it','pt','tr','ru'])assert.equal(t(code,'tasks','title','Tasks Studio'),'Tasks Studio');
  for(const code of ['he','iw','zz'])assert.equal(t(code,'timer','0','⚙ Customize'),'⚙ Customize');
  assert.equal(t('es','tasks','not_in_the_app','missing'),'missing');
});
test('Generated pack is loaded after bridge and coverage reads registered dictionaries',()=>{
  assert.ok(index.indexOf('js/df99_multiscreen_i18n.js')<index.indexOf('js/df99_reviewed_packs.js'));
  assert.ok(audit.includes("vm.runInContext(read('js/df99_reviewed_packs.js'),cx);"),'Coverage report must load reviewed packs');
  assert.ok(audit.includes('tasks:64'),'Task inventory count must reflect real dictionary');
  assert.ok(!fs.readFileSync(file,'utf8').includes('localStorage'),'Pack must not access persisted user data');
});
