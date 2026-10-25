'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const dir = path.join(root,'assets/i18n/contributions/europe_extended');
const original = JSON.parse(fs.readFileSync(path.join(root,'assets/i18n/df99_reviewed_packs.json'),'utf8'));
const qa = JSON.parse(fs.readFileSync(path.join(__dirname,'qa_report.json'),'utf8'));
const requested = 'bg hr sr sl lt lv et sq eu ca gl is ga mk mt cy be bs eo la gd yi co fy'.split(' ');
const missingInCanonical = new Set(['is','la','gd','yi','co','fy']);
const status = new Set(['TRANSLATED','REVIEW_REQUIRED','MACHINE_DRAFT','VERIFIED']);
const schema = Object.fromEntries(Object.keys(original.bg).map(f=>[f,new Set(Object.keys(original.bg[f]))]));
const signatures = {};
const tokenRe = /\{\{[A-Za-z_][\w]*\}\}|\$\{[A-Za-z_][\w]*\}|\{[A-Za-z_][\w]*\}|%(?:[1-9]\d*\$)?[sdif]/g;
const tokens = text => (text.match(tokenRe)||[]).sort().join('|');
for(const sections of Object.values(original)){
 for(const [family,entries] of Object.entries(sections)){
  for(const [key,value] of Object.entries(entries)){
   signatures[family+'/'+key] ??= tokens(value);
  }
 }
}
function load(lang){return JSON.parse(fs.readFileSync(path.join(dir,lang+'.json'),'utf8'));}
function inventory(lang){
 const x=load(lang),items=[],byFamily={};
 for(const [family,entries] of Object.entries(x.sections)){
  for(const [key,raw] of Object.entries(entries)){
   const entry=typeof raw==='string'?{text:raw,status:x.status}:raw;
   items.push({family,key,...entry});
   byFamily[family]=(byFamily[family]||0)+1;
  }
 }
 return {x,items,byFamily};
}
test('all 24 independent locale contribution files exist with no forbidden aliases',()=>{
 const names=fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort();
 assert.deepEqual(names,requested.map(x=>x+'.json').sort());
 assert.equal(requested.includes('he')||requested.includes('iw'),false);
 for(const lang of requested){const x=load(lang);assert.equal(x.language,lang);assert.ok(status.has(x.status));}
});
test('every proposed key belongs to the approved 147-key/6-family canonical schema',()=>{
 assert.equal(Object.values(schema).reduce((n,s)=>n+s.size,0),147);
 for(const lang of requested)for(const i of inventory(lang).items){
  assert.ok(schema[i.family]?.has(i.key),lang+'/'+i.family+'/'+i.key);
 }
});
test('all pre-existing translations are byte-identical and additions are review-gated',()=>{
 for(const lang of requested){
  const {items,x}=inventory(lang);
  for(const i of items){
   const old=original[lang]?.[i.family]?.[i.key];
   if(old!==undefined) assert.equal(i.text,old,'protect existing '+lang+'/'+i.family+'/'+i.key);
   else assert.equal(i.status||x.status,'REVIEW_REQUIRED','new string must not auto-deploy: '+lang+'/'+i.family+'/'+i.key);
  }
 }
});
test('valid text, Unicode, ASCII UI numerals, placeholders, and no unsafe markup',()=>{
 for(const lang of requested)for(const i of inventory(lang).items){
  const id=lang+'/'+i.family+'/'+i.key;
  assert.equal(typeof i.text,'string',id);
  assert.ok(i.text.trim().length>0 && i.text.length<=1000,id);
  assert.doesNotMatch(i.text,/[\u0660-\u0669\u06f0-\u06f9]|<|>|&(?:#\d+|#x[\da-f]+|[a-z]+);/iu,id);
  assert.doesNotMatch(i.text,/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u,id);
  assert.equal(tokens(i.text),signatures[i.family+'/'+i.key],id+' placeholders');
 }
});
test('Yiddish requires RTL and script; other 23 regions use LTR',()=>{
 assert.equal(qa.direction.yi,'rtl');
 for(const lang of requested.filter(x=>x!=='yi')) assert.equal(qa.direction[lang],'ltr');
 assert.ok(inventory('yi').items.some(x=>/[\u0590-\u05ff]/u.test(x.text)));
});
test('limited-resource languages and incomplete app namespaces must not claim verification',()=>{
 for(const lang of missingInCanonical){
  assert.equal(original[lang],undefined);
  assert.equal(load(lang).status,'REVIEW_REQUIRED');
 }
 assert.equal(qa.human_verified,false);
 assert.equal(qa.release_approved,false);
 assert.equal(qa.full_app_coverage_certified,false);
 assert.equal(qa.unrepresented_app_sections.length>0,true);
});
test('QA counts and review-required key IDs are derived without trusting coverage claims',()=>{
 const byLanguage={};
 for(const lang of requested){
  const {items}=inventory(lang);
  const flagged=items.filter(x=>x.status==='REVIEW_REQUIRED'||(!x.status&&load(lang).status==='REVIEW_REQUIRED'));
  const count=items.length;
  byLanguage[lang]={keys:count,review_required:flagged.length,missing:147-count};
  assert.ok(count>0&&count<=147);
 }
 const total=Object.values(byLanguage).reduce((a,x)=>a+x.keys,0);
 const pending=Object.values(byLanguage).reduce((a,x)=>a+x.review_required,0);
 assert.equal(total,qa.counts.provided);
 assert.equal(pending,qa.counts.review_required);
 assert.equal(24*147-total,qa.counts.missing);
});
