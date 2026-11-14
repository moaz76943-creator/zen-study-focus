'use strict';
// Closeout 2026-11-15: tutorial / sample-data / reader strings live in the 100-language catalog.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const R=p=>path.resolve(__dirname,'../..',p);
const src=JSON.parse(fs.readFileSync(R('i18n/source_en.json'),'utf8'));
const reg=JSON.parse(fs.readFileSync(R('i18n/languages.json'),'utf8')).languages.map(l=>l.code).filter(c=>c!=='en');
const NEW=['Complete Chapter {0} & Core Concepts','HIIT Strength & Cardio Session ({0} Sets)','Read {0} Pages of Reference Book',
 'Finish Deep Work Project Milestone','Spaced Repetition System','Active Recall: Key Formula & Law','Workout & Training Log',
 'Reviewing concepts at increasing intervals strengthens long-term memory retention.','Hidden Answer: Performance = Focused Time × Intensity.',
 'Warm-up {0}m','{0} Sets Compound Exercises','Cool-down stretch.',
 'Grouping adjacent words into semantic chunks expands peripheral vision span and suppresses subvocalization at speeds between {0} and {1} words per minute.',
 'Instant Reading Comprehension Check (Cloze Recall):','✓ Correct Recall! Comprehension: {0}% ({1})','↺ Target term was: {0} (Logged {1}%)','Note #{0}'];
const ph=s=>(s.match(/\{\d+\}/g)||[]).sort().join(',');
test('source catalog contains the closeout keys (starter data, speed-reading tutorial, reader labels)',()=>{
  for(const k of NEW)assert.ok(k in src,k);
  assert.ok(Object.keys(src).length>=688);
});
test('every registered non-English pack translates every closeout key with matching placeholders and Western digits',()=>{
  const sample=Object.keys(src).filter(k=>/closeout-2026-11-15/.test(src[k].ctx||''));
  assert.equal(sample.length,38);
  assert.equal(reg.length,99);
  for(const code of reg){
    const pack=JSON.parse(fs.readFileSync(R('i18n/packs/'+code+'.json'),'utf8'));
    for(const k of sample){
      const v=pack.t[k];assert.ok(typeof v==='string'&&v.trim(),code+': missing '+k.slice(0,40));
      assert.equal(ph(v),ph(k),code+': placeholders '+k.slice(0,40));
      assert.ok(!/[٠-٩۰-۹०-९০-৯]/.test(v),code+': non-Western digit');
      assert.ok(!/[֐-׿]/.test(v),code+': Hebrew script');
    }
    assert.equal(pack.status,'ai-pending-review',code+' must stay an unreviewed AI draft');
  }
});
test('app code reads these strings through the catalog and keeps user edits',()=>{
  const app=fs.readFileSync(R('android/app/src/main/assets/web/app.js'),'utf8');
  assert.match(app,/function localizeStarterFromCatalog\(\)/);
  assert.match(app,/record\.title === record\.starterRendered/);
  assert.match(app,/dfCatalogKeyText\('Note #\{0\}'/);
  assert.match(app,/function dfSyncDefaultPassage\(\)/);
  assert.match(app,/\\p\{L\}\\p\{N\}/);
});
