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
  // API30 measured position:static and Save y=1644 with a 748px visible viewport.
  // Assert an old-WebView-safe fallback and precedence over late injected styles.
  assert.ok(guard.includes('position: fixed !important'));
  assert.ok(guard.includes('bottom: 14px !important'));
  assert.ok(guard.includes('max-height: calc(var(--nsux-height'));
  assert.match(guard,/\.modal-actions\s*>\s*button/);
  assert.match(guard,/min-block-size:\s*44px/);
  assert.doesNotMatch(guard,/display:\s*none|pointer-events:\s*none/);
});

test('real Notes Save controls remain visible before DF22Integration mounts the body class',()=>{
  // Android API30 at 320 CSS px: Save was at y=1644 despite a 748px visual viewport.
  // The legacy editor can be opened before the df-v22 mount class is applied.
  assert.match(guard,/body:not\(\.deep-lockdown\)\s+#noteModal\s+\.ns-editor\s*>\s*\.modal-actions\s*\{/);
  assert.doesNotMatch(guard,/body\.df-v22:not\(\.deep-lockdown\)\s+#noteModal/);
});
