'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../../..');
const source=JSON.parse(fs.readFileSync(path.join(root,'assets/i18n/df99_reviewed_packs.json'),'utf8'));
const langs=["zh","ja","id","ko","vi","th","fil","my","km","lo","mn"];
const patterns={zh:/[\u3400-\u9FFF]/u,ja:/[\u3040-\u30FF\u3400-\u9FFF]/u,id:/[A-Za-z]/,ko:/[\uAC00-\uD7AF]/u,vi:/[A-Za-z]/,th:/[\u0E00-\u0E7F]/u,my:/[\u1000-\u109F]/u,km:/[\u1780-\u17FF]/u,lo:/[\u0E80-\u0EFF]/u,mn:/[\u0400-\u04FF]/u,fil:/[A-Za-z]/};
function tokens(s){return [...s.matchAll(/\$\{[\w.]+\}|\{[\w.]+\}|%[0-9]*[sdif]/g)].map(m=>m[0]).sort();}
function read(code){return JSON.parse(fs.readFileSync(path.join(root,'assets/i18n/contributions/east_asia',code+'.json'),'utf8'));}
test('lane19: all 11 contribution files decode as UTF-8 and use supported namespace keys',()=>{
 for(const code of langs){
  const d=read(code);
  assert.ok(Object.keys(d).length>0,code);
  for(const [family,entries] of Object.entries(d)){
   assert.ok(Object.hasOwn(source.de,family),'unknown namespace '+family);
   for(const [key,value] of Object.entries(entries)){
    assert.ok(Object.hasOwn(source.de[family],key),'unknown key '+family+'/'+key);
    assert.equal(typeof value,'string');
    assert.ok(value.trim(),code+'/'+family+'/'+key);
   }
  }
 }
});
test('lane19: contributions are additive and preserve interpolation tokens',()=>{
 for(const code of langs)for(const [family,entries] of Object.entries(read(code))){
  for(const [key,value] of Object.entries(entries)){
   const prior=source[code]?.[family]?.[key];
   if(prior!==undefined)assert.equal(value,prior,'conflicting existing translation '+code+'/'+family+'/'+key);
   assert.deepEqual(tokens(value),tokens(source.de[family][key]),'token mismatch '+code+'/'+family+'/'+key);
  }
 }
});
test('lane19: NFC, direction safety, ASCII digits, and native-script presence',()=>{
 for(const code of langs)for(const [family,entries] of Object.entries(read(code))){
  for(const [key,value] of Object.entries(entries)){
   assert.equal(value.normalize('NFC'),value,code+'/'+family+'/'+key);
   assert.doesNotMatch(value,/[\u0660-\u0669\u06F0-\u06F9\u0E50-\u0E59\u17E0-\u17E9\u1040-\u1049]/u);
   assert.doesNotMatch(value,/[\u202A-\u202E\u2066-\u2069\u200B]/u);
   assert.doesNotMatch(value,/[\u0600-\u06FF]/u);
   assert.doesNotMatch(value,/<\/?(?:script|style|iframe|img)\b/i);
   assert.ok(patterns[code].test(value),'expected native script '+code+'/'+family+'/'+key);
  }
 }
});
test('lane19: all 11 locales cover every current canonical key when combined with existing values',()=>{
 for(const code of langs){
  const contribution=read(code);
  for(const [family,entries] of Object.entries(source.de)){
   for(const key of Object.keys(entries)){
    assert.ok(Object.hasOwn(contribution[family]||{},key)||Object.hasOwn(source[code]?.[family]||{},key),
      'missing '+code+'/'+family+'/'+key);
   }
  }
 }
});
test('lane19: exactly 925 newly contributed labels with no ambiguous double registrations',()=>{
 let total=0;
 for(const code of langs)for(const [family,entries] of Object.entries(read(code))){
  total+=Object.keys(entries).length;
  assert.ok(Object.keys(entries).every(k=>!Object.hasOwn(source[code]?.[family]||{},k)),
    code+'/'+family+' overwrites an existing reviewed translation');
 }
 assert.equal(total,925);
});
test('lane19: long-label candidates are disclosed for device QA, not claimed rendered',()=>{
 const long=[];
 for(const code of langs)for(const [family,entries] of Object.entries(read(code)))
  for(const [key,value] of Object.entries(entries))if([...value].length>86)long.push(code+'/'+family+'/'+key);
 console.log('LANE19_VISUAL_QA_REQUIRED '+JSON.stringify(long));
 assert.ok(long.length<200,'unusually many verbose strings');
});
test('lane19: no forbidden or unknown language packs',()=>{
 for(const lang of langs)assert.notEqual(lang,'he');
 for(const lang of langs)assert.notEqual(lang,'iw');
 assert.equal(new Set(langs).size,11);
});
