'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {fraction,summarize,countBlankStrings,staticSections}=require('../../../tools/i18n/e2e/coverage.cjs');
const locales=Array.from({length:99},(_,i)=>'x'+String(i).padStart(2,'0'));
function inventory(){
  return {target:99,summary:locales.map(code=>({
    code,core:true,quick:true,areas:{timer:'2/2',goals:'1/1',tasks:'3/3',notes:'1/1',analytics:'2/2',analyticsDomain:'4/4'}
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

test('a missing measured family fails instead of silently passing',()=>{
  const sample=inventory();
  delete sample.summary[0].areas.goals;
  const result=summarize(sample,{},'abc123');
  assert.equal(result.summary.FAIL,1);
  assert.ok(result.per_language_coverage[0].reasons.includes('SECTION_NOT_MEASURED:goals'));
  assert.equal(result.per_language_coverage[1].status,'PASS');
});


const {auditSection,makeRepairQueue}=require('../../../tools/i18n/e2e/coverage.cjs');

test('en/ar cannot get automatic translated PASS from registry bypass',()=>{
  for(const code of ['en','ar']){
    const row=auditSection({code,section:'timer',keys:['start','pause'],read:()=>({proven:true,value:'Start'}),owner:'D',source_file:'registered'});
    assert.equal(row.status,'NOT_TESTED');
    assert.deepEqual(row.unverified_keys,['start','pause']);
    assert.equal(row.present_keys,0);
  }
});
test('unmeasured Native keys must not be counted as zero-gap PASS',()=>{
  const row=auditSection({code:'de',section:'Native',keys:null,owner:'F',source_file:null});
  assert.equal(row.status,'NOT_TESTED');
  assert.equal(row.expected_keys,null);
  assert.equal(row.missing_keys,null);
});
test('missing fallback and empty values are not translated; duplicates are review candidates',()=>{
  const rows={a:{proven:true,value:'  '},b:{proven:false,value:'English'},c:{proven:true,value:'Save'},d:{proven:true,value:'Save'}};
  const row=auditSection({code:'de',section:'tasks',keys:['a','b','c','d'],read:key=>rows[key],
    english:{c:'Save',d:'Save'},owner:'E',source_file:'sample'});
  assert.equal(row.status,'FAIL');
  assert.equal(row.expected_keys,4);
  assert.equal(row.present_keys,2);
  assert.deepEqual(row.missing_keys,['b']);
  assert.deepEqual(row.empty_values,['a']);
  assert.equal(row.fallback_count,1);
  assert.deepEqual(row.english_identical_candidates,['c','d']);
  assert.deepEqual(row.duplicate_value_candidates,[['c','d']]);
});
test('non-string, missing, or mismatched keys cannot pass as localized values',()=>{
  assert.throws(()=>auditSection({code:'de',section:'timer',keys:['a','a'],read:()=>({proven:true,value:'ok'})}));
  const row=auditSection({code:'de',section:'timer',keys:['ok','bad'],read:key=>({proven:true,value:key==='ok'?'Ja':123})});
  assert.deepEqual(row.empty_values,['bad']);
  assert.equal(row.present_keys,1);
  assert.equal(row.status,'FAIL');
});
test('repair queues are grouped deterministically by lane, exact file, and code',()=>{
  const a=auditSection({code:'de',section:'timer',keys:['x'],read:()=>({proven:false}),owner:'D',
    source_file:'android/app/src/main/assets/web/js/df99_reviewed_packs.js'});
  const b=auditSection({code:'fr',section:'Quick Training',keys:['go'],read:()=>({proven:false}),owner:'F',
    source_file:'android/app/src/main/assets/web/quick_training.js'});
  const first=makeRepairQueue([b,a]);
  assert.equal(JSON.stringify(first),JSON.stringify(makeRepairQueue([a,b])));
  assert.equal(first.items.length,2);
  assert.equal(first.items[0].owner,'D');
  assert.equal(first.items[0].language_code,'de');
  assert.deepEqual(first.items[0].missing_keys,['x']);
});


test('nested Core arrays and strings are measured at leaf paths, not flagged as empty objects',()=>{
 const {flattenSourceLeaves}=require('../../../tools/i18n/e2e/coverage.cjs');
 const en=flattenSourceLeaves({title:'Title',weekdays:['Sun','Mon'],sounds:{rain:'Rain'},sampleNotes:[{t:'Title',b:'Text'}]});
 const translated=flattenSourceLeaves({title:'Titel',weekdays:['So','Mo'],sounds:{rain:'Regen'},sampleNotes:[{t:'Titel',b:'Text'}]});
 assert.deepEqual(Object.keys(en).sort(),['sampleNotes.0.b','sampleNotes.0.t','sounds.rain','title','weekdays.0','weekdays.1']);
 const result=auditSection({code:'de',section:'Core',keys:Object.keys(en).sort(),
   english:en,read:key=>({proven:Object.hasOwn(translated,key),value:translated[key]})});
 assert.equal(result.present_keys,6);
 assert.equal(result.empty_values.length,0);
 assert.deepEqual(result.english_identical_candidates,['sampleNotes.0.b']);
 assert.equal(result.status,'PASS');
});


test('Core English object-reference fallback cannot count as a localized dictionary',()=>{
 const {eligibleCoreDictionary}=require('../../../tools/i18n/e2e/coverage.cjs');
 const english={title:'Start',nested:{label:'Save'}};
 const native={title:'Los'};
 assert.equal(eligibleCoreDictionary('de',{en:english,de:english}),null);
 assert.equal(eligibleCoreDictionary('de',{en:english,de:native}),native);
 assert.equal(eligibleCoreDictionary('en',{en:english}),english);
 assert.equal(eligibleCoreDictionary('de',{en:english}),null);
});

test('deep copies of English Core and Quick Training never count as localized values',()=>{
 const {eligibleCoreDictionary}=require('../../../tools/i18n/e2e/coverage.cjs');
 const english={title:'Start',nested:{save:'Save',weekdays:['Mon','Tue']}};
 const cloned={nested:{weekdays:['Mon','Tue'],save:'Save'},title:'Start'};
 assert.equal(eligibleCoreDictionary('fr',{en:english,fr:cloned}),null);
 const quick=['Start','Pause','Save'];
 assert.equal(eligibleCoreDictionary('fr',{en:quick,fr:[...quick]}),null);
 assert.deepEqual(eligibleCoreDictionary('fr',{en:quick,fr:['Démarrer','Pause','Save']}),['Démarrer','Pause','Save']);
});
