'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const LANGS=["bg","hr","sr","sl","lt","lv","et","mk","eo","ca"];
const KEYS={"timer":["0","1","2","3","4","5","6","7","8","9","10"],"goals":["kicker","heading","desc","edit","modal","hint","save","invalid","noGoal","minute","done","today","week","weekTarget","weekInvalid"],"analytics":["title","activity","period","start","end","minutes","sessions","average","streak","noData","goal","noGoals","tasks","chart","year","export","details"],"analyticsDomain":["study","read","work","sport"]};
function translator(){
  const c={window:{},console};vm.createContext(c);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),c);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8'),c);
  return c.window.DF99Locale.t;
}
test('32: ten new languages have full timer goals analytics and activity label keys',()=>{
 for(const lang of LANGS)for(const [family,keys] of Object.entries(KEYS)){
  const dictionary=packs[lang]?.[family];
  assert.ok(dictionary,'missing '+lang+'/'+family);
  assert.deepEqual(Object.keys(dictionary).sort(),keys.slice().sort(),lang+'/'+family);
  assert.ok(Object.values(dictionary).every(v=>typeof v==='string'&&v.trim().length>0),lang+'/'+family+' blank');
 }
});
test('32: 470 new strings resolve to translated values through actual offline runtime',()=>{
 const t=translator();let n=0;
 for(const code of LANGS)for(const family of Object.keys(KEYS))
 for(const [key,value]of Object.entries(packs[code][family])){
  assert.equal(t(code,family,key,'fallback'),value,code+'/'+family+'/'+key);n++;
 }
 assert.equal(n,470);
});
test('32: previous 5860 texts and existing tasks/notes packs remain intact',()=>{
 const count=Object.values(packs).reduce((n,sec)=>n+Object.values(sec).reduce((sum,d)=>sum+Object.keys(d).length,0),0);
 assert.ok(count>=6330,`Batch32 baseline must remain at least 6330 strings, got ${count}`);
 for(const lang of LANGS){
  assert.equal(Object.keys(packs[lang].notes).length,36,'older notes lost '+lang);
  assert.equal(Object.keys(packs[lang].tasks).length,64,'older tasks lost '+lang);
 }
});
test('32: Hebrew and unknown language codes are not introduced',()=>{
 const t=translator();
 for(const lang of ['he','iw'])assert.equal(packs[lang],undefined);
 for(const lang of ['he','iw','zz'])assert.equal(t(lang,'analytics','title','fallback'),'fallback');
 for(const lang of LANGS)assert.equal(t(lang,'timer','missing_value','fallback'),'fallback');
});
test('32: translated save and export actions retain intended meanings',()=>{
 assert.equal(packs.bg.timer['8'],'Запази');
 assert.equal(packs.hr.timer['8'],'Spremi');
 assert.equal(packs.sr.timer['8'],'Sačuvaj');
 assert.equal(packs.sl.analytics.export,'Izvozi CSV');
 assert.equal(packs.lt.timer['8'],'Išsaugoti');
 assert.equal(packs.ca.timer['8'],'Desa');
});
test('32: generated translations keep western digits and no markup injection',()=>{
 for(const lang of LANGS)for(const family of Object.keys(KEYS))
 for(const value of Object.values(packs[lang][family])){
  assert.doesNotMatch(value,/[٠-٩۰-۹]/);
  assert.doesNotMatch(value,/<\/?(?:script|iframe|img|style)\b/i);
 }
});
