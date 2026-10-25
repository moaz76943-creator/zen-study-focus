'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../../../..');
const BASE=path.join(ROOT,'assets/i18n');
const reviewed=JSON.parse(fs.readFileSync(path.join(BASE,'df99_reviewed_packs.json'),'utf8'));
const dir=path.join(BASE,'contributions/south_asia');
const langs=['hi','bn','ur','fa','ta','te','mr','gu','kn','ml','pa','ne','si','ps','ku'];
const rtl=new Set(['ur','fa','ps']);
const namespaceKeys={
timer:Array.from({length:11},(_,i)=>String(i)),
analytics:['title','activity','period','start','end','minutes','sessions','average','streak','noData','goal','noGoals','tasks','chart','year','export','details'],
analyticsDomain:['study','read','work','sport'],
goals:['kicker','heading','desc','edit','modal','hint','save','invalid','noGoal','minute','done','today','week','weekTarget','weekInvalid'],
notes:Array.from({length:36},(_,i)=>String(i)),
tasks:["actual","add","addCheck","all","allCategories","archive","archived","board","calendar","cancel","cat","check","completed","daily","delegate","desc","do","doing","done","due","edit","eliminate","empty","estimate","estimated","exam","focus","group","high","invalid","low","matrix","medium","monthly","never","none","notConnected","notes","overdue","priority","proj","project","redo","remove","repeat","restore","resume","review","save","schedule","search","sport","study","sub","subtitle","task","time","title","today","todo","trash","undo","urgent","weekly"]
};
const scripts={
hi:/[\u0900-\u097F]/u,bn:/[\u0980-\u09FF]/u,ur:/[\u0600-\u06FF]/u,fa:/[\u0600-\u06FF]/u,
ta:/[\u0B80-\u0BFF]/u,te:/[\u0C00-\u0C7F]/u,mr:/[\u0900-\u097F]/u,gu:/[\u0A80-\u0AFF]/u,
kn:/[\u0C80-\u0CFF]/u,ml:/[\u0D00-\u0D7F]/u,pa:/[\u0A00-\u0A7F]/u,ne:/[\u0900-\u097F]/u,
si:/[\u0D80-\u0DFF]/u,ps:/[\u0600-\u06FF]/u,ku:/[A-Za-zÇÊÎÛŞçêîûş]/u
};
const westernOnly=/[\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0DE6-\u0DEF]/u;
const dangerousControls=/[\u202A-\u202E\u2066-\u2069\u200E\u200F]/u;
function read(code){const pack=JSON.parse(fs.readFileSync(path.join(dir,code+'.json'),'utf8'));assert.equal(pack.language,code);assert.equal(pack.status,'REVIEW_REQUIRED');return pack.sections;}
test('exactly 15 independent lane files; no excluded Hebrew codes',()=>{
 assert.deepEqual(fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort(),langs.map(x=>x+'.json').sort());
 assert.equal(langs.length,15);
 assert.ok(!langs.includes('he')&&!langs.includes('iw'));
});
for(const code of langs){
 test(code+': no shadowing reviewed namespaces; added namespace keys are complete',()=>{
  const pack=read(code);
  assert.ok(!Array.isArray(pack)&&typeof pack==='object');
  for(const [family,body] of Object.entries(pack)){
   assert.ok(namespaceKeys[family],'unexpected namespace '+family);
   assert.ok(!Object.prototype.hasOwnProperty.call(reviewed[code]||{},family),'would replace reviewed '+code+'/'+family);
   assert.deepEqual(Object.keys(body).sort(),namespaceKeys[family].slice().sort(),code+'/'+family);
  }
  for(const family of Object.keys(namespaceKeys)){
   const source=pack[family]||(reviewed[code]||{})[family];
   assert.ok(source,'missing source '+code+'/'+family);
   assert.deepEqual(Object.keys(source).sort(),namespaceKeys[family].slice().sort(),code+'/'+family);
  }
 });
 test(code+': NFC, Indic shaping, RTL control safety and Western digits',()=>{
  const pack=read(code);
  const text=Object.values(pack).flatMap(body=>Object.values(body));
  assert.ok(text.length>0);
  assert.ok(text.some(x=>scripts[code].test(x)),'no native script found');
  for(const value of text){
   assert.equal(typeof value,'string');
   assert.ok(value.trim().length>0 && value.length<=1000);
   assert.equal(value,value.normalize('NFC'));
   assert.ok(!westernOnly.test(value),'non-Western digit '+code);
   assert.ok(!dangerousControls.test(value),'explicit bidi control '+code);
   assert.ok(!/<\/?(?:script|iframe|style)/i.test(value));
  }
  if(rtl.has(code)) assert.ok(text.some(x=>/[\u0600-\u08FF]/u.test(x)),'missing RTL script');
  else if(code==='ku')assert.ok(text.some(x=>/[A-Za-z]/u.test(x)),'Kurmanji Latin script required');
  else assert.ok(!text.every(x=>/[\u0600-\u08FF]/u.test(x)),'LTR locale incorrectly translated as RTL');
 });
}
test('direction policy is per locale: ur/fa/ps RTL, pa Gurmukhi and ku Kurmanji LTR',()=>{
 const direction=Object.fromEntries(langs.map(code=>[code,rtl.has(code)?'rtl':'ltr']));
 assert.equal(direction.ur,'rtl');assert.equal(direction.fa,'rtl');assert.equal(direction.ps,'rtl');
 assert.equal(direction.pa,'ltr');assert.equal(direction.ku,'ltr');
 assert.equal(Object.values(direction).filter(d=>d==='rtl').length,3);
});
test('contribution scope never includes user text, saved v21 keys or UI runtime files',()=>{
 assert.deepEqual(fs.readdirSync(dir).filter(x=>x.endsWith('.json')).length,15);
 assert.ok(!fs.existsSync(path.join(dir,'app.js')));
});
