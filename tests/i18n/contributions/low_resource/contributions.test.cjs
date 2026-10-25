'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifest=read('tests/i18n/contributions/low_resource/coverage_manifest.json');
const reviewed=read('assets/i18n/df99_reviewed_packs.json'),canonical=reviewed.de;
const codes=['haw','hmn','sm','su','jw'],folder='assets/i18n/contributions/low_resource';
const families=['analytics','analyticsDomain','goals','notes','tasks','timer'];
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const tokens=s=>(s.match(/\{\{[A-Za-z_]\w*\}\}|\$\{[A-Za-z_]\w*\}|\{[A-Za-z_]\w*\}|%(?:[1-9]\d*\$)?[sdif]/g)||[]).sort();
const bad=/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF]/u;
const load=code=>read(folder+'/'+code+'.json');
test('five standalone contributions use six-family canonical schema',()=>{
 assert.deepEqual(fs.readdirSync(path.join(root,folder)).sort(),codes.map(c=>c+'.json').sort());
 assert.deepEqual(Object.keys(canonical).sort(),families);
 assert.equal(families.reduce((n,f)=>n+Object.keys(canonical[f]).length,0),147);
 for(const code of codes){
  const pack=load(code);
  assert.equal(pack.language,code);
  assert.equal(pack.status,'REVIEW_REQUIRED');
  assert.deepEqual(Object.keys(pack.sections).sort(),['tasks','timer']);
  assert.deepEqual(Object.keys(pack.sections.tasks),['save']);
  assert.deepEqual(Object.keys(pack.sections.timer),['8']);
  assert.equal(pack.sections.tasks.save,pack.sections.timer['8']);
  assert.equal(manifest.languages[code].standard_code,code==='jw'?'jv':code);
 }
});
test('source-backed text has valid keys, Unicode NFC, placeholders, Western digits and no markup',()=>{
 for(const code of codes){
  for(const [family,dict] of Object.entries(load(code).sections)){
   for(const [key,v] of Object.entries(dict)){
    assert.ok(has(canonical[family],key),code+'/'+family+'/'+key);
    assert.equal(typeof v,'string');
    assert.ok(v.trim()&&v.length<=1000);
    assert.equal(v,v.normalize('NFC'));
    assert.doesNotMatch(v,bad);
    assert.doesNotMatch(v,/https?:\/\//);
    assert.deepEqual(tokens(v),tokens(canonical[family][key]),code+'/'+family+'/'+key);
   }
  }
  assert.equal(reviewed[code],undefined,'existing reviewed strings must not be overwritten');
 }
});
test('all missing keys are explicitly inventoried and native review is not asserted',()=>{
 for(const code of codes){
  const pack=load(code),m=manifest.languages[code],missing={};
  for(const f of families){const a=Object.keys(canonical[f]).filter(k=>!has(pack.sections[f]||{},k));if(a.length)missing[f]=a;}
  assert.deepEqual(m.missing,missing,code+' missing');
  assert.equal(m.missing_count,145);
  assert.equal(Object.values(missing).flat().length,145);
  assert.equal(m.translated_candidates,2);
  assert.equal(m.unverified,2);
  assert.equal(m.status,'REVIEW_REQUIRED');
  assert.deepEqual(m.needs_native_review,['timer.8','tasks.save']);
  assert.ok(m.source.url.startsWith('https://'));
  assert.deepEqual(m.source.keys,['timer.8','tasks.save']);
 }
 assert.equal(manifest.native_review_completed,false);
 assert.equal(manifest.fallback,'app-default (runtime-provided source text)');
});
test('legacy jw catalog alias remains unchanged and forbidden locales absent',()=>{
 const app=fs.readFileSync(path.join(root,'android/app/src/main/assets/web/app.js'),'utf8');
 const a=app.slice(app.indexOf('const LANG_CATALOG = ['),app.indexOf('const DICT = {'));
 for(const code of codes)assert.match(a,new RegExp('"code"\\s*:\\s*"'+code+'"'));
 assert.equal(manifest.languages.jw.catalog_code,'jw');
 assert.equal(manifest.languages.jw.standard_code,'jv');
 assert.ok(!codes.includes('he')&&!codes.includes('iw'));
});
