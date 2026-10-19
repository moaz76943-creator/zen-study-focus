'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const L=require('../../android/app/src/main/assets/web/completion_alert_locales.js');
const A=require('../../android/app/src/main/assets/web/completion_alert_settings.js');
const root=join(__dirname,'../../android/app/src/main/assets/web');
const read=p=>readFileSync(join(root,p),'utf8');

test('all 20 advertised languages have every completion picker label',()=>{
  const langs=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
  assert.deepEqual([...L.languages],langs);
  assert.equal(L.KEYS.length,11);
  assert.equal(new Set(L.KEYS).size,L.KEYS.length);
  for(const lang of langs)for(const key of L.KEYS){
    const text=L.translate(lang,'completionAlerts.'+key);
    assert.equal(typeof text,'string',lang+'.'+key);
    assert.ok(text.trim(),lang+'.'+key);
  }
  assert.equal(L.translate('zz','completionAlerts.title'),null);
  assert.equal(L.translate('ar','arbitrary.action'),null);
  assert.equal(L.translate('ar','completionAlerts.missing'),null);
});
test('all original alert choices have a label in each locale',()=>{
  for(const lang of L.languages)for(const choice of A.CHOICES)
    assert.ok(L.translate(lang,'completionAlerts.'+choice.id));
  assert.equal(L.translate('ar','completionAlerts.silent'),'صمت تام');
  assert.equal(L.translate('fa','completionAlerts.volume'),'بلندی صدای هشدار');
  assert.equal(L.translate('ur','completionAlerts.preview'),'آواز سنیں');
  assert.equal(L.translate('de-DE','completionAlerts.title'),'Abschlusston');
});
test('live picker uses locale translations but leaves stored IDs untouched',()=>{
  const html=read('index.html'),bridge=read('integration_v22.js');
  assert.ok(html.includes('completion_alert_locales.js'));
  assert.ok(html.indexOf('completion_alert_settings.js')<html.indexOf('completion_alert_locales.js'));
  assert.ok(html.indexOf('completion_alert_locales.js')<html.indexOf('integration_v22.js'));
  assert.ok(bridge.includes('DeepFocusCompletionAlertLocales.translate(cfg.lang,key)'));
  const ids=A.CHOICES.map(x=>x.id);
  assert.deepEqual(ids,['silent','soft-bell','wood-tap','water-drop','muted-metal','two-taps']);
});
