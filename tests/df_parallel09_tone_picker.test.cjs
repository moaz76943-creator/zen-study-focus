'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../android/app/src/main/assets/web');
const T=require(path.join(base,'js/completion_tone_picker.js'));
const L=require(path.join(base,'completion_alert_locales.js'));
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const css=fs.readFileSync(path.join(base,'completion_alert_picker.css'),'utf8');
test('20 complete historic completion picker locales remain present and no he/iw',()=>{
  assert.equal(L.languages.length,20);assert.equal(L.KEYS.length,11);
  assert.deepEqual(T.supported,[...L.languages]);
  assert.ok(!T.supported.includes('he')&&!T.supported.includes('iw'));
  for(const locale of T.supported) {
    for(const k of L.KEYS)assert.ok(L.translate(locale,'completionAlerts.'+k));
    for(const id of T.CHOICES)assert.ok(T.label(locale,id)?.trim());
  }
});
test('original real tone IDs match current audio engine, never old incompatible sound IDs',()=>{
  const src=fs.readFileSync(path.join(base,'app.js'),'utf8');
  const segment=src.slice(src.indexOf('const COMPLETION_TONES = {'),src.indexOf('function playCompletionTone('));
  for(const id of T.CHOICES)assert.ok(segment.includes(id+':'),id);
  assert.deepEqual([...T.CHOICES],['zen_bell','tibetan_bowl','woodblock','crystal','gong','vibrate']);
  assert.doesNotMatch(fs.readFileSync(path.join(base,'js/completion_tone_picker.js'),'utf8'),/zen_fortress_cfg_v21|tasks_v21|notes_v21|window\.location\s*=|fetch\(/);
});
test('picker is live in existing nature section, CSS offline after premium theme',()=>{
  assert.ok(html.indexOf('id="df-tone-picker-card"')<html.indexOf('id="soundsGridBox"'));
  assert.ok(html.indexOf('completion_alert_picker.css')>html.indexOf('ui_components_v22.css'));
  assert.ok(html.indexOf('completion_alert_locales.js')<html.indexOf('js/completion_tone_picker.js'));
  assert.match(css,/#completionAlertPickerHost/);
  assert.match(css,/@media\s*\(max-width:\s*360px\)/);
  assert.match(css,/min-height:\s*44px/);
  assert.doesNotMatch(css,/@import|https?:\/\//i);
});
test('unsupported languages show English fallback but are not counted as translated',()=>{
  assert.equal(T.label('xx','zen_bell'),T.label('en','zen_bell'));
  assert.equal(T.supported.includes('xx'),false);
  assert.equal(T.label('ar','zen_bell'),'جرس زن');
  assert.equal(T.label('de-DE','gong'),'Tempelgong');
});
