'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {buildReview,writeReview}=require('../../tools/language_review/track11_review.cjs');

function fixture(){
  const langs=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
  const screens=['timer','notes'];
  const coverage=Object.fromEntries(langs.map(l=>[l,{
    timer:{present:1,total:2,missing:1,percent:50,englishIdentical:0},
    notes:{present:1,total:1,missing:0,percent:100,englishIdentical:0}
  }]));
  return {pinnedSha:'a'.repeat(40),workingTreeDirty:false,
    languages:langs.map(code=>({code,dir:['ar','fa','ur'].includes(code)?'rtl':'ltr'})),
    screens,coverage,missing:[{language:'ar',catalog:'core.timer',key:'modeShort',english:'Short break'},{language:'de',catalog:'notes.editor',key:'save',english:'Save'}],
    englishIdentical:[{language:'fr',catalog:'core.timer',key:'sample',value:'Session'}],
    eastern:[{language:'ar',catalog:'core.timer',key:'counter',value:'١٠'}],
    staticCandidates:[{file:'index.html',line:25,kind:'unmarked_html_text',text:'Reset settings'}],
    markup:{checked:1,unknown:[]},warnings:[]};
}
test('Track11 requires exactly the 20 live languages and retains RTL ar/fa/ur',()=>{
 const r=buildReview(fixture());
 assert.equal(r.languages.length,20);
 assert.deepEqual(r.languages.filter(x=>x.dir==='rtl').map(x=>x.code).sort(),['ar','fa','ur']);
 assert.equal(r.releaseApproved,false);
 assert.equal(r.futureLanguagesActivated,0);
 assert.equal(r.sourceSha,'a'.repeat(40));
});
test('Track11 does not conflate catalog gaps with rendered errors or auto-approve text',()=>{
 const r=buildReview(fixture());
 assert.equal(r.gaps.length,2);
 assert.equal(r.gaps[0].classification,'EXPLICIT_CATALOG_GAP');
 assert.equal(r.gaps[0].rendered,'NOT_TESTED');
 assert.equal(r.gaps[0].fallback,'NOT_VERIFIED');
 assert.equal(r.gaps[0].candidate,null);
 assert.equal(r.gaps[0].reviewStatus,'PENDING_HUMAN');
 assert.equal(r.surfaces.length,1);
 assert.equal(r.surfaces[0].classification,'UNMARKED_SOURCE_CANDIDATE');
 assert.equal(r.identicalEnglish.length,1);
 assert.equal(r.easternLiterals.length,1);
 assert.equal(r.easternLiterals[0].status,'REVIEW_LITERAL_CONTEXT');
});
test('Track11 produces bounded CSV cells without mutating any provided source text',()=>{
 const source=fixture();
 source.missing[0].english='=HYPERLINK("https://bad.example","x"), الفاصل\nKeep {count}';
 const original=structuredClone(source);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'track11-'));
 try{
  const review=buildReview(source);
  writeReview(review,tmp);
  assert.deepEqual(source,original);
  const report=JSON.parse(fs.readFileSync(path.join(tmp,'track11-coverage.json'),'utf8'));
  assert.equal(report.sourceSha,'a'.repeat(40));
  const csv=fs.readFileSync(path.join(tmp,'track11-review-queue.csv'),'utf8');
  assert.ok(csv.includes('PENDING_HUMAN'));
  assert.ok(csv.includes("'=HYPERLINK"),'Spreadsheet formulas must be escaped');
  assert.ok(csv.includes('{count}'));
  const matrix=fs.readFileSync(path.join(tmp,'track11-matrix.md'),'utf8');
  for(const code of source.languages.map(x=>x.code))assert.match(matrix,new RegExp('\\| '+code+' \\|'));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('Track11 fails closed on unrecognized extra or missing active locale',()=>{
 const x=fixture();x.languages.push({code:'sw',dir:'ltr'});
 assert.throws(()=>buildReview(x),/EXACTLY_20/);
 const y=fixture();y.languages=y.languages.filter(x=>x.code!=='ur');
 assert.throws(()=>buildReview(y),/EXACTLY_20/);
});
