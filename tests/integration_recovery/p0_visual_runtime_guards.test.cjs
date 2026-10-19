'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const web=path.join(root,'android/app/src/main/assets/web');
const read=p=>fs.readFileSync(path.join(web,p),'utf8');

test('completion audio picker uses matching layout hooks and actual locale registry',()=>{
  const js=read('completion_alert_settings.js');
  const css=read('design_recovery/white_premium_recovery10.css');
  const integration=read('integration_v22.js');
  const locales=require(path.join(web,'completion_alert_locales.js'));
  for(const cls of ['completion-alert-choices','completion-alert-option','completion-alert-label','completion-alert-preview','completion-alert-enabled','completion-alert-volume']){
    assert.match(js,new RegExp(cls));
    assert.match(css,new RegExp('\\.'+cls));
  }
  assert.match(integration,/DeepFocusCompletionAlertLocales\.translate\(cfg\.lang,key\)/);
  assert.equal(locales.translate('ar','completionAlerts.title'),'صوت انتهاء الوقت');
  assert.equal(locales.languages.length,20);
});

test('nature filters show translated empty state and verified-only counts without admitting unapproved assets',()=>{
  const js=read('app.js'),css=read('design_recovery/white_premium_recovery10.css');
  assert.match(js,/NATURE_APPROVED_FOR_PLAYBACK = new Set\(\['forest','wind'\]\)/);
  assert.match(js,/NATURE_EMPTY_LABELS\[cfg\.lang\]/);
  assert.match(js,/message\.setAttribute\('role','status'\)/);
  assert.match(js,/pill\.dataset\.availableCount/);
  assert.match(css,/nature-empty-state/);
  const x=js.match(/const NATURE_EMPTY_LABELS = Object\.freeze\((\{[\s\S]*?\})\);/);
  assert.ok(x,'nature empty translations present');
  const labels=JSON.parse(x[1]);
  assert.equal(Object.keys(labels).length,20);
  for(const value of Object.values(labels))assert.ok(value.trim().length>12);
});

test('note type labels use the established 20-language presentation resolver, not stored type identifiers',()=>{
  const editor=read('notes_editor_ui.js'),app=read('app.js');
  assert.match(editor,/getNoteTagLabel\(n\.catKey\)/);
  assert.match(app,/function getNoteTagLabel\(k\)/);
  assert.match(app,/flash: d\.tagFlash, quick: d\.tagQuick/);
});

test('do not replace the v21 analytics normalizer or discard valid historic minutes',()=>{
  const core=require(path.join(web,'analytics_recovery_core.js'));
  const res=core.normalizeSessions([
    {id:1,date:'2026-10-19',minutes:0,domain:'study'},
    {id:2,date:'2026-10-19',minutes:25,domain:'read'}
  ]);
  assert.equal(res.sessions.length,2);
  assert.equal(res.sessions[1].minutes,25);
  assert.equal(res.quality.accepted,2);
});
