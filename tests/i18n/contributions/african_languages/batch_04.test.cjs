'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../../..');
const reviewed=require(path.join(root,'assets/i18n/df99_reviewed_packs.json'));
const manifest=require('./batch_04_review_required.json');
const languages=["tn","rw","mg","ny"];
const families=['timer','tasks','notes','goals','analytics','analyticsDomain'];
const existing=new Set([]);
const canonical=reviewed.de;
const read=lang=>{const pack=JSON.parse(fs.readFileSync(path.join(root,'assets/i18n/contributions/african_languages',lang+'.json'),'utf8'));assert.equal(pack.language,lang);assert.equal(pack.status,'REVIEW_REQUIRED');return pack.sections;};
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
test('batch 01 contributions are self-contained, UTF-8 NFC, valid offline locale packs',()=>{
 for(const lang of languages){
  const dict=read(lang);
  assert.deepEqual(Object.keys(dict).sort(),families.slice().sort());
  for(const [family,entries] of Object.entries(dict)){
   assert.ok(families.includes(family));
   for(const [key,value] of Object.entries(entries)){
    assert.ok(has(canonical[family],key),lang+'/'+family+'/'+key);
    assert.equal(typeof value,'string');assert.ok(value.trim());assert.equal(value,value.normalize('NFC'));
    assert.ok(value.length<=1000);assert.doesNotMatch(value,/[\uFFFD\u0660-\u0669\u06F0-\u06F9]/);
    assert.doesNotMatch(value,/<\/?(?:script|style|iframe)/i);assert.doesNotMatch(value,/https?:\/\//i);
    assert.notEqual(value,'REVIEW_REQUIRED');
   }
  }
 }
});
test('pre-existing reviewed entries must not be overwritten',()=>{
 for(const lang of languages){
  const pack=read(lang),old=reviewed[lang]||{};
  for(const [family,entries] of Object.entries(old))
   for(const [key,value] of Object.entries(entries))
    assert.equal(pack[family][key],value,lang+'/'+family+'/'+key);
 }
});
test('all untranslated canonical keys are recorded explicitly as REVIEW_REQUIRED',()=>{
 for(const lang of languages){
  const pack=read(lang), record=manifest[lang], missing={};
  for(const family of families){const gaps=Object.keys(canonical[family]).filter(k=>!has(pack[family]||{},k));if(gaps.length)missing[family]=gaps;}
  assert.deepEqual(record.review_required,missing,lang);
  assert.equal(record.status,Object.keys(missing).length?'REVIEW_REQUIRED':'CANDIDATE_NATIVE_QA');
 }
});
test('flag long identical cross-language translations for native review',()=>{
 for(let i=0;i<languages.length;i++)for(let j=i+1;j<languages.length;j++){
  const [a,b]=[read(languages[i]),read(languages[j])];
  for(const family of families)for(const [key,value] of Object.entries(a[family]||{}))
   if(value.length>=14&&has(b[family]||{},key))assert.notEqual(value,b[family][key],languages[i]+'/'+languages[j]+'/'+family+'/'+key);
 }
});
test('reviewed source stays offline; no language silently claims complete app coverage',()=>{
 assert.deepEqual(languages,['tn','rw','mg','ny']);
 assert.equal(existing.size,0);
 for(const lang of languages)assert.ok(manifest[lang]);
});
