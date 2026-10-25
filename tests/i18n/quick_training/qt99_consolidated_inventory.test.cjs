'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../../android/app/src/main/assets/web/quick_training.js'),'utf8');

const requested=['en','ar','de','es','fr','pt','it','nl','tr','ru','zh','hi','ja','ko','id','vi','pl','bn','ur','fa','th','sv','el','cs','ro','da','fi','no','sk','uk','bg','hr','sr','sl','lt','lv','et','sw','fil','af','hu','az','sq','is','ca','gl','bs','mk','be','eo','gu','kn','mr','ta','te','uz','kk','ky','tg','tk','ga','cy','eu','mt','gd','ka','hy','ne','ml','pa','si','my','km','lo','mn','ha','yo','ig','zu','xh','co','fy','la','so','sn','st','tn','rw','mg','ny','am','ps','ku','yi','sm','su','haw','hmn','jw'];
const reviewRequired=['co','fy','la','so','sn','st','tn','rw','mg','ny','am','ps','ku','yi','sm','su','haw','hmn','jw'];

test('DF-LANE-08 has 99 exact catalog packs with 36 populated keys each',()=>{
 const {keys,translations}=vm.runInNewContext(source+'\n({keys:QUICK_KEYS,translations:QUICK_TRANSLATIONS})');
 assert.equal(keys.length,36);
 assert.equal(new Set(keys).size,36);
 assert.equal(new Set(requested).size,99);
 assert.deepEqual(Object.keys(translations).sort(),requested.slice().sort());
 for(const locale of requested){
  const p=translations[locale];
  assert.ok(Array.isArray(p),locale);
  assert.equal(p.length,36,locale);
  assert.ok(p.every(s=>typeof s==='string'&&s.trim().length>0),locale);
 }
 assert.ok(!('he' in translations));
 assert.ok(!('iw' in translations));
});
test('newly added packs preserve MM:SS tokens and use true local control copy',()=>{
 const t=vm.runInNewContext(source+'\nQUICK_TRANSLATIONS');
 for(const locale of reviewRequired){
  const p=t[locale];
  for(const i of [7,8,32])assert.ok(p[i].includes('MM:SS'),locale+' invalid MM:SS token at '+i);
  for(const i of [4,17,18,19,30,31,33,34])assert.notEqual(p[i],t.en[i],locale+' untranslated control '+i);
 }
});
test('timer format stays ASCII 0-9 and snapshot validation never awards or writes sessions',()=>{
 const calls={save:0,play:0},cfg={lang:'en',sessionHistory:[]};
 const sandbox={cfg,toWest:String,saveFortressData(){calls.save++;},toggleTimerPlay(){calls.play++;}};
 const ctx=vm.createContext(sandbox);
 vm.runInContext(source,ctx);
 assert.equal(vm.runInContext('timeString(65)',ctx),'01:05');
 assert.equal(vm.runInContext('timeString(3599)',ctx),'59:59');
 assert.equal(vm.runInContext('parseQuickTime("03:60")',ctx),null);
 const snap={active:true,sets:3,currentSet:1,phase:'rest',workSeconds:30,restSeconds:10,skipLastRest:true,domain:'sport',taskId:null,exercises:['Run']};
 const restored=vm.runInContext('validQuickSnapshot('+JSON.stringify(snap)+')',ctx);
 assert.equal(restored.phase,'rest');
 assert.equal(restored.currentSet,1);
 assert.equal(cfg.sessionHistory.length,0);
 assert.equal(calls.save,0);assert.equal(calls.play,0);
});
