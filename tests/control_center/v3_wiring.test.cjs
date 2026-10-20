'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../../docs/control-center');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const ui=fs.readFileSync(path.join(base,'v3-ui.js'),'utf8');

test('Control Center V3 has no missing local JavaScript modules',()=>{
  const scripts=[...html.matchAll(/<script[^>]+src=["'](\.\/[^"']+\.js)["']/g)].map(m=>m[1]);
  assert.equal(scripts.length,9);
  for(const file of scripts)assert.ok(fs.existsSync(path.join(base,file)), 'Missing script: '+file);
});
test('Interactive V3 controls are implemented with local, bounded UI handlers',()=>{
  const ids=['v3-search','v3-task-view','v3-task-sort','v3-task-export','v3-pr-filter',
    'v3-pr-search','v3-risk-filter','v3-snapshot-import','v3-theme-preset',
    'v3-undo','v3-redo','v3-reset-screen','v3-design-import'];
  for(const id of ids){
    assert.ok(html.includes('id="'+id+'"'), 'Missing DOM control '+id);
    assert.ok(ui.includes("'"+id+"'"), 'Unwired control '+id);
  }
  assert.match(ui,/DeepFocusControlCenter\.getSnapshot|api\.getSnapshot/);
  assert.match(ui,/textContent/);
  assert.doesNotMatch(ui,/innerHTML\s*=|eval\(/);
  assert.doesNotMatch(ui,/fetch\(|localStorage\.|ZenNative\.|pulls\.merge/);
});
test('Production WebView imports generated design CSS exactly once and after primary CSS',()=>{
  const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/index.html'),'utf8');
  assert.equal((app.match(/href="control_center_overrides\.css"/g)||[]).length,1);
  assert.ok(app.indexOf('href="control_center_overrides.css"')>app.indexOf('href="completion_alert_settings.css"'));
});
