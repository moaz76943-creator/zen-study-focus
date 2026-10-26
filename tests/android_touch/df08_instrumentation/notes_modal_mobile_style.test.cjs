'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.resolve(__dirname,'../../../android/app/src/main/assets/web/white_2100.css'),'utf8');
const guard=css.split('/* DF08 actual Android Notes modal: viewport and sticky Save */')[1]||'';
test('compact Note editor stays confined to visual viewport without horizontal overflow',()=>{
  assert.match(guard,/@media\s*\(max-width:\s*430px\)/);
  assert.match(guard,/#noteModal\s+\.ns-editor\s*\{/);
  assert.match(guard,/max-block-size:\s*min\(/);
  assert.match(guard,/overflow-y:\s*auto/);
  assert.match(guard,/overflow-x:\s*hidden/);
  assert.match(guard,/inline-size:\s*calc\(100vw\s*-\s*16px\)/);
});
test('Save and Cancel stay real touch buttons at keyboard dismissal',()=>{
  assert.match(guard,/\.ns-editor\s*>\s*\.modal-actions\s*\{/);
  assert.match(guard,/position:\s*sticky/);
  assert.match(guard,/bottom:\s*0/);
  assert.match(guard,/\.modal-actions\s*>\s*button/);
  assert.match(guard,/min-block-size:\s*44px/);
  assert.doesNotMatch(guard,/display:\s*none|pointer-events:\s*none/);
});
