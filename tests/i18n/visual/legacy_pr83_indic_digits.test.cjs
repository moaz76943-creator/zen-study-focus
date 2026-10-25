'use strict';
// Legacy PR #83 RED-first regression. Generated UI only, not user-authored text.
const test=require('node:test');
const assert=require('node:assert/strict');
const n=require('../../../android/app/src/main/assets/web/js/numeral_invariant_guard.js');

test('generated Devanagari and Bengali numerals normalize to Latin 0-9',()=>{
 const generated='समय ०१२३४५६७८९, সময় ০১২৩৪৫৬৭৮৯';
 const normalized=n.sanitizeToWesternDigits(generated);
 assert.equal(normalized,'समय 0123456789, সময় 0123456789');
 assert.equal(n.containsOnlyWesternDigits(normalized),true);
});

test('Indic numeral validation is stateless across repeated invocations',()=>{
 for(let i=0;i<12;i++){
  assert.equal(n.containsOnlyWesternDigits('१२३'),false);
  assert.equal(n.containsOnlyWesternDigits('১২৩'),false);
  assert.equal(n.containsOnlyWesternDigits('١۲3'),false);
  assert.equal(n.containsOnlyWesternDigits('2026-10-26'),true);
 }
});

test('system normalization never rewrites stored user text',()=>{
 const task={title:'अध्ययन १२३',note:'পড়া ১২৩',id:42};
 const unchanged=JSON.stringify(task);
 const ui=n.sanitizeToWesternDigits('कार्य १२३ — কাজ ১২৩');
 assert.equal(ui,'कार्य 123 — কাজ 123');
 assert.equal(JSON.stringify(task),unchanged);
});
