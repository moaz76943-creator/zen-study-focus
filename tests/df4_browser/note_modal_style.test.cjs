'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const css=fs.readFileSync(path.join(root,'android/app/src/main/assets/web/design_recovery/white_premium_recovery10.css'),'utf8');
const html=fs.readFileSync(path.join(root,'android/app/src/main/assets/web/index.html'),'utf8');
test('small Android WebView editor pins Save/Cancel into its own scrollport',()=>{
  assert.match(css,/#noteModal\s+\.ns-editor\s*>\s*\.modal-actions\s*\{[^}]*position\s*:\s*sticky\s*;/s);
  assert.match(css,/#noteModal\s+\.ns-editor\s*>\s*\.modal-actions\s*\{[^}]*bottom\s*:\s*0\s*;/s);
  assert.match(css,/#noteModal\s+\.ns-editor\s*>\s*\.modal-actions\s*\{[^}]*background\s*:/s);
});
test('note dialog scales down to the actual visualViewport (keyboard) without scroll locking',()=>{
  assert.match(css,/#noteModal\s+\.ns-editor\s*\{[^}]*--nsux-height/s);
  assert.match(css,/#noteModal\s+\.ns-editor\s*\{[^}]*overflow-y\s*:\s*auto\s*;/s);
  assert.match(html,/<button[^>]*id="nsSaveButton"[^>]*onclick="saveNewNote\(\)"/);
});
