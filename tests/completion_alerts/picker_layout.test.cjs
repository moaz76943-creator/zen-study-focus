'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'../../android/app/src/main/assets/web');
const read=p=>readFileSync(join(root,p),'utf8');

test('completion sound picker has an offline stylesheet loaded after the main theme',()=>{
  const html=read('index.html');
  const theme=html.indexOf('design_recovery/white_premium_recovery10.css');
  const style=html.indexOf('completion_alert_picker.css');
  assert.ok(theme>=0,'main white theme must remain');
  assert.ok(style>theme,'picker overrides must load after existing theme');
  assert.match(html,/<link rel="stylesheet" href="completion_alert_picker\.css">/);
  const css=read('completion_alert_picker.css');
  assert.doesNotMatch(css,/@import|https?:\/\//i);
});

test('radio rows and Preview controls have independent responsive layout',()=>{
  const css=read('completion_alert_picker.css');
  assert.match(css,/#completionAlertPickerHost\s+\.completion-alert-option\s*\{/);
  assert.match(css,/grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s*;/);
  assert.match(css,/\.completion-alert-option\s*>\s*label/);
  assert.match(css,/\.completion-alert-option\s*>\s*button/);
  assert.match(css,/min-height:\s*44px/);
  assert.match(css,/@media\s*\(max-width:\s*360px\)/);
  assert.match(css,/overflow-wrap:\s*anywhere/);
});

test('picker preserves real radio selection, independent audio preview and verified save',()=>{
  const js=read('completion_alert_settings.js');
  assert.match(js,/radio\.type="radio"/);
  assert.match(js,/radio\.addEventListener\("change"/);
  assert.match(js,/preview\.type="button"/);
  assert.match(js,/engine\.preview\(choice\.id\)/);
  assert.match(js,/if\(!engine\.update\(\{sound:choice\.id\}\)\)/);
});
