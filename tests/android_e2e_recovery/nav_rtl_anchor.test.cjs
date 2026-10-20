'use strict';
// Regression for API30 WebView bottom navigation shifted out of the viewport
// when CSS logical inset-inline-start is unsupported or ignored.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.resolve(__dirname,
  '../../android/app/src/main/assets/web/design_recovery/white_premium_recovery10.css'),'utf8');
const selector='html[dir="rtl"] body.df-v22.df-recovery10 .bottom-nav-capsule';
const at=css.indexOf(selector);
assert.ok(at>=0,'The existing RTL navigation rule must be preserved');
const rule=css.slice(at,css.indexOf('}',at)+1);
test('RTL navigation has physical right 50 percent fallback for older Android WebView',()=>{
  assert.match(rule,/\bright\s*:\s*50%\s*;/,
    'CSS logical inset-inline-start alone left nav center at x=412 on a 412px Android viewport');
  assert.match(rule,/\bleft\s*:\s*auto\s*;/);
  assert.match(rule,/\btransform\s*:\s*translateX\(50%\)\s*;/);
});
test('LTR navigation still anchors at the physical midpoint with a negative half-width shift',()=>{
  assert.match(css,/body\.df-v22\.df-recovery10:not\(\.deep-lockdown\) \.bottom-nav-capsule \{[^}]*left:\s*50%;[^}]*transform:\s*translateX\(-50%\);/s);
});
