'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const A=require('../../tools/language_review/audit.cjs');

test('every supported locale exists, with three RTL locales',()=>{
 const r=A.audit();
 assert.equal(r.languages.length,20);
 assert.equal(new Set(r.languages.map(x=>x.code)).size,20);
 assert.deepEqual(r.languages.filter(x=>x.dir==='rtl').map(x=>x.code).sort(),['ar','fa','ur']);
 assert.deepEqual(r.warnings,[]);
});
test('v21 runtime dictionary assembly retains the exact same top-level keys',()=>{
 const data=A.actualLocales();
 assert.equal(data.languageCatalog.length,20);
 assert.deepEqual(Object.keys(data.dict).sort(),A.LANGS.slice().sort());
 const keys=Object.keys(data.dict.en).sort().join(',');
 for(const lang of A.LANGS)assert.equal(Object.keys(data.dict[lang]).sort().join(','),keys,lang);
 assert.equal(Object.keys(data.premium.translations).length,20);
 assert.equal(data.recovery.audit().valid,true);
});
test('quick training is genuinely en/ar only, not silently marked 20/20',()=>{
 const r=A.audit(),c=r.catalogs.find(x=>x.id==='quick.training');
 assert.ok(c&&c.keys>=30);
 assert.deepEqual(c.explicitLocales,['en','ar']);
 assert.ok(r.coverage.de.training.missing>0);
 assert.equal(r.coverage.en.training.missing,0);
});
test('binary locale support is made visible per affected screen',()=>{
 const r=A.audit();
 for(const id of ['notes.studio','notes.editor','tasks.studio','goals.studio','timer.settings']){
  const c=r.catalogs.find(x=>x.id===id);
  assert.ok(c,id+' not audited');
  assert.deepEqual(c.explicitLocales,['en','ar'],id);
 }
 for(const s of ['notes','tasks','goals','settings','analytics','training'])
  assert.ok(r.coverage.fr[s].missing>0,s);
});
test('all missing keys get an independent entry; untranslated is null, never invented English',()=>{
 const r=A.audit(),p=A.proposals(r);
 assert.ok(p.entries.length>20);
 assert.equal(p.entries.reduce((n,x)=>n+Object.keys(x.translations).length,0),r.missing.length);
 let reused=0;
 for(const row of p.entries)for(const v of Object.values(row.translations)){
  if(v.suggestion===null){
   assert.ok(['NEEDS_TRANSLATION','AMBIGUOUS_REUSE_NEEDS_REVIEW'].includes(v.status));
  }else{
   reused++;
   assert.equal(v.status,'REUSE_CANDIDATE_NEEDS_REVIEW');
   assert.equal(typeof v.provenance,'string');
   assert.ok(v.provenance.length>0);
  }
 }
 assert.ok(reused>0,'safe reusable translations should be proposed with provenance');
});
test('all explicit HTML i18n binding keys are compared with real locale catalogs',()=>{
 const r=A.markupReferences();
 assert.ok(r.checked>20);
 assert.ok(Array.isArray(r.unknown));
 for(const issue of r.unknown){
  assert.equal(issue.file,'index.html');
  assert.ok(issue.line>0);
  assert.ok(issue.attribute&&issue.key);
 }
});
test('static HTML/JS candidates have attributable lines',()=>{
 const rows=A.unmarked();
 assert.ok(rows.length>0);
 assert.ok(rows.some(x=>x.file==='index.html'));
 assert.ok(rows.every(x=>x.line>=1&&Number.isSafeInteger(x.line)));
});
test('Western digits formatting and RTL classification of actual recovery catalog',()=>{
 const l=A.actualLocales().recovery;
 assert.equal(l.westernDigits('٠١٢٣٤٥٦٧٨٩ ۰۱۲۳۴۵۶۷۸۹'),'0123456789 0123456789');
 for(const lang of A.LANGS){
  assert.equal(l.direction(lang),A.RTL.has(lang)?'rtl':'ltr');
  assert.equal(/[\u0660-\u0669\u06f0-\u06f9]/.test(l.formatNumber(2456,lang)),false,lang);
 }
});
test('CLI writes only into an explicitly supplied report directory',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'df-locale-review-'));
 try{
  const r=A.main(['--out',tmp]);
  for(const file of ['coverage.json','proposals.json','REPORT.md'])
   assert.ok(fs.statSync(path.join(tmp,file)).size>0,file);
  const report=JSON.parse(fs.readFileSync(path.join(tmp,'coverage.json'),'utf8'));
  assert.equal(report.languages.length,r.languages.length);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('audit recognizes integrated picker and Arabic analytics catalogs without claiming full UI parity',()=>{
 const r=A.audit();
 assert.equal(r.catalogs.find(c=>c.id==='sounds.alerts').explicitLocales.length,20);
 assert.deepEqual(r.catalogs.find(c=>c.id==='analytics.recovery.ui').explicitLocales,['en','ar']);
 assert.equal(r.coverage.fr.sounds.missing,0);
 assert.ok(r.missing.length>0);
 assert.match(r.pinnedSha,/^[a-f0-9]{40}$/);
 assert.equal(typeof r.workingTreeDirty,'boolean');
});
