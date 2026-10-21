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
