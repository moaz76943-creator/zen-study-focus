'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {fraction,summarize,countBlankStrings,staticSections}=require('../../../tools/i18n/e2e/coverage.cjs');
const locales=Array.from({length:99},(_,i)=>'x'+String(i).padStart(2,'0'));
function inventory(){
  return {target:99,summary:locales.map(code=>({
    code,core:true,quick:true,areas:{timer:'2/2',tasks:'3/3',notes:'1/1'}
  }))};
}
test('fractions reject corrupt or impossible results',()=>{
  assert.deepEqual(fraction('4/6'),{translated:4,total:6,missing:2});
  for(const s of ['6/4','1/0','abc','1 / 2'])assert.throws(()=>fraction(s));
});
test('source audit requires exactly 99 catalog rows and unique codes',()=>{
  assert.throws(()=>summarize({target:99,summary:[]},{},'s'));
  const duplicated=inventory();
  duplicated.summary[98].code=duplicated.summary[0].code;
  assert.throws(()=>summarize(duplicated,{},'s'));
});
test('fallback and absent dictionaries cannot masquerade as translation',()=>{
  const r=inventory();
  r.summary[0].areas.timer='1/2';
  r.summary[1].core=false;
  const output=summarize(r,{},'abc123');
  assert.equal(output.per_language_coverage[0].status,'FAIL');
  assert.equal(output.per_language_coverage[0].missing_or_fallback,1);
  assert.ok(output.per_language_coverage[1].reasons.includes('CORE_DICTIONARY_MISSING'));
  assert.equal(output.per_language_coverage[2].android_e2e,'NOT_TESTED');
  assert.deepEqual(output.summary,{PASS:97,FAIL:2,NOT_TESTED:0});
});
test('blank source strings are measured independently of fallback',()=>{
  const r=inventory(),source={[locales[0]]:{core:1,quick:0}};
  assert.equal(countBlankStrings(['','  ','ok',{title:'x',child:['']}]),3);
  const output=summarize(r,source,'abc123');
  assert.equal(output.per_language_coverage[0].status,'FAIL');
  assert.ok(output.per_language_coverage[0].reasons.includes('CORE_EMPTY_STRINGS'));
});
test('baseline declares all 6 screens and their navigation',()=>{
  for(const [screen,state] of Object.entries(staticSections())){
    assert.ok(state.page_present,screen+' missing page');
    assert.ok(state.navigation_present,screen+' missing navigation');
  }
});
