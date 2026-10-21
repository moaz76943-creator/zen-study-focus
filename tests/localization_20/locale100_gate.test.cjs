'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const x=require('../../tools/localization_100/guard.cjs');
const old='en ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl'.split(' ');
const source={ 'core.timer':{start:'Start',duration:'{n} minutes'}, 'analytics.chart':{chartLabel:'Chart',minutes:'Minutes'} };
const pack=()=>({locale:'sw',inventorySha256:x.inventoryHash(source),
  strings:{'core.timer':{start:'Anza',duration:'Dakika {n}'},'analytics.chart':{chartLabel:'Chati',minutes:'Dakika'}},
  review:{reviewer:'Linguistic reviewer',reviewedAt:'2026-10-21',contextReview:'PASS',androidWebView:'PASS',rtlLtr:'PASS',
    accessibility:'PASS',nativeUi:'PASS',westernDigits:'PASS',offline:'PASS',dataSafety:'PASS',evidence:['review/1','review/2']}});
test('100 registered, exact existing 20 preserved, no banned Hebrew, RTL and scripts valid',()=>{
  assert.equal(x.REGISTRY.length,100);
  assert.deepEqual([...x.LEGACY_CODES],old);
  assert.deepEqual(x.REGISTRY.filter(v=>v.phase==='existing').map(v=>v.code),old);
  assert.equal(x.REGISTRY.filter(v=>v.phase==='planned').length,80);
  assert.equal(new Set(x.REGISTRY.map(v=>v.code)).size,100);
  assert.deepEqual(x.validateRoster(),[]);
  assert.ok(!x.REGISTRY.some(v=>['he','iw'].includes(v.code)));
});
test('BCP47 normalization and deliberate non-fallback for excluded, unknown, script-incompatible, unreleased',()=>{
  assert.equal(x.resolve('ar-JO').direction,'rtl');
  assert.equal(x.resolve('ku-Latn-TR').direction,'ltr');
  assert.equal(x.resolve('ckb-IQ').direction,'rtl');
  assert.equal(x.resolve('sw-TZ').selectable,false);
  assert.equal(x.resolve('en-US').selectable,true);
  assert.equal(x.normalize('AR_jo'),'ar-JO');
  for(const lang of ['he','iw-IL','bad','zh-Hant','pa-Arab'])assert.equal(x.resolve(lang),null);
});
test('complete native-reviewed sample passes, missing, stale, mismatched keys and placeholders fail',()=>{
  assert.equal(x.validatePack(pack(),source).ok,true);
  const p=pack();delete p.strings['core.timer'].duration;assert.equal(x.validatePack(p,source).ok,false);
  const old=pack();old.inventorySha256='stale';assert.equal(x.validatePack(old,source).ok,false);
  const mismatch=pack();mismatch.strings['core.timer'].duration='minutes';assert.equal(x.validatePack(mismatch,source).ok,false);
  const extra=pack();extra.strings['core.timer'].extra='extra';assert.equal(x.validatePack(extra,source).ok,false);
});
test('fail closed on fabricated fallback, unsafe digits, control chars and unreviewed evidence',()=>{
  const english=pack();english.strings['core.timer'].start='Start';assert.equal(x.validatePack(english,source).ok,false);
  const eastern=pack();eastern.strings['core.timer'].start='ابدأ ١٢';assert.equal(x.validatePack(eastern,source).ok,false);
  const bidi=pack();bidi.strings['core.timer'].start='bad\u202e';assert.equal(x.validatePack(bidi,source).ok,false);
  const missing=pack();missing.review=null;assert.equal(x.validatePack(missing,source).ok,false);
  const native=pack();native.review.androidWebView='NOT_TESTED';assert.equal(x.validatePack(native,source).ok,false);
});

test('region-implied scripts must never silently select the wrong Chinese, Punjabi, Serbian, Uzbek, Azerbaijani, Mongolian or Kurdish UI',()=>{
 for(const tag of ['zh-TW','zh-HK','pa-PK','sr-ME','uz-AF','az-IR','mn-CN','ku-IQ','nan-CN'])
   assert.equal(x.resolve(tag),null,tag+' must not silently resolve to wrong writing system');
 for(const tag of ['zh-CN','pa-IN','sr-RS','uz-UZ','az-AZ','mn-MN','ku-TR','nan-TW'])
   assert.ok(x.resolve(tag),tag+' must correctly resolve for matching region/script');
 // Explicit script beats regional heuristics: e.g. a Traditional-region user asks for Simplified by choice.
 assert.equal(x.resolve('zh-Hans-TW').script,'Hans');
 assert.equal(x.resolve('pa-Guru-PK').script,'Guru');
 assert.equal(x.resolve('nan-Hant-CN').script,'Hant');
});

test('PR admission CI watches every Java source and all locale100 regressions without cross-PR cancellation',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const workflow=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/locale_100_admission_gate.yml'),'utf8');
 assert.match(workflow,/^\s+- 'android\/app\/src\/main\/java\/\*\*\/\*\.java'$/m);
 assert.match(workflow,/^\s+- 'tests\/localization_20\/\*\*'$/m);
 assert.match(workflow,/group: locale-100-admission-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}/);
 assert.match(workflow,/node --test tests\/localization_20\/locale100_\*\.test\.cjs/);
});
test('new Java files in nested packages enter native review source discovery',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const native=require('../../tools/localization_100/native_copy.cjs');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'df-locale100-java-'));
 try{
  fs.mkdirSync(path.join(temp,'nested'));
  fs.writeFileSync(path.join(temp,'MainActivity.java'),'class MainActivity {}');
  fs.writeFileSync(path.join(temp,'nested','NewUi.java'),'class NewUi {}');
  fs.writeFileSync(path.join(temp,'nested','notes.txt'),'not Java');
  assert.deepEqual(native.listJavaFiles(temp),['MainActivity.java','nested/NewUi.java']);
  assert.ok(native.report().files>=5,'current source includes at least five Java classes');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('CI cannot miss canonical key discovery or future native Android resource and manifest edits',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const yaml=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/locale_100_admission_gate.yml'),'utf8');
 for(const watched of [
  "'tools/language_review/**'",
  "'tests/language_review/**'",
  "'tests/localization_20/**'",
  "'android/app/src/main/res/**'",
  "'android/app/src/main/AndroidManifest.xml'"
 ])assert.ok(yaml.includes(watched),'missing path trigger: '+watched);
});

test('browser acceptance workflow reruns when its own actual browser regression files change',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const yaml=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/locale_100_admission_gate.yml'),'utf8');
 for(const item of [
  "'tests/df4_browser/**'",
  "'tests/track07_functional/**'",
  "'tests/localization_20/**'",
  "'tests/validate_locales.cjs'",
  "'tests/smoke_app.cjs'"
 ])assert.ok(yaml.includes(item),'missing browser/source acceptance trigger: '+item);
});
