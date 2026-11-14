'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
test('SovereignViewportOptimizer never overwrites an inline transform (centred Studios pill stays on screen)',()=>{
  const i=app.indexOf('function applyHighRefreshOptimizations()');assert.ok(i>0);
  const body=app.slice(i,i+700);
  assert.match(body,/if \(!el\.style\.transform\) el\.style\.transform = "translateZ\(0\)"/);
});
