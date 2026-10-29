'use strict';
/* node --test tests/design_quality/test_design_v22.cjs — no extra dependencies */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '../../android/app/src/main/assets/web');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const cssTokens = read('design_tokens_v22.css');
const cssUI = read('ui_components_v22.css');
const localeSource = read('locale_premium_v22.js');

function hexToLum(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i, 'hex color required');
  const rgb = [1,3,5].map(i => parseInt(hex.slice(i, i + 2),16)/255);
  const values = rgb.map(v => v <= 0.04045 ? v/12.92 : ((v + 0.055)/1.055)**2.4);
  return values[0]*0.2126 + values[1]*0.7152 + values[2]*0.0722;
}
function ratio(a,b) {
  const luminances = [hexToLum(a),hexToLum(b)].sort((x,y)=>y-x);
  return (luminances[0]+0.05)/(luminances[1]+0.05);
}
function token(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match = cssTokens.match(new RegExp(escaped + '\\s*:\\s*(#[0-9a-f]{6})\\s*;', 'i'));
  assert.ok(match, name+' must be a literal, auditably accessible color');
  return match[1];
}

test('WCAG AA: actual design-token text/background and button contrast', () => {
  const checks = [
    ['--df22-ink','--df22-surface',4.5],
    ['--df22-muted','--df22-surface',4.5],
    ['--df22-primary','--df22-surface',4.5],
    ['--df22-success','--df22-surface',4.5],
    ['--df22-danger','--df22-surface',4.5],
    ['--df22-on-primary','--df22-primary-fill',4.5],
    ['--df22-ink','--df22-page',4.5],
    ['--df22-focus','--df22-surface',3]
  ];
  for (const [fg,bg,min] of checks) {
    const found = ratio(token(fg),token(bg));
    assert.ok(found >= min, fg+'/'+bg+' '+found.toFixed(2)+':1 is below '+min+':1');
  }
});

test('white premium components are opt-in, complete and WebView-friendly', () => {
  assert.match(cssTokens,/\.df-v22\s*\{/);
  for (const cls of ['df22-card','df22-button','df22-input','df22-empty','df22-modal',
                     'df22-bottom-nav','df22-timer-zone','df22-chart','df22-icon-button']) {
    assert.ok(cssUI.includes('.'+cls), 'missing component: '+cls);
  }
  for (const selector of ['.focus-hero-card','.quick-training-card','.ns-card',
                          '.showcase-task-card','.an-kpi-card','.modal-card']) {
    assert.ok(cssUI.includes(selector), 'missing adapter: '+selector);
  }
  assert.doesNotMatch(cssUI,/backdrop-filter\s*:\s*blur\(/, 'avoid expensive WebView blur');
  assert.doesNotMatch(cssUI,/animation\s*:\s*[^;]*infinite/, 'no perpetual animation');
  assert.match(cssUI,/:focus-visible/);
  assert.match(cssUI,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(cssUI, /@media\s*\(max-width:\s*359px\)/);
  assert.match(cssUI, /\[dir="rtl"\]/);
  assert.match(cssUI, /overflow-wrap:\s*anywhere/);
  assert.match(cssUI, /unicode-bidi:\s*isolate/);
});

test('320px layout keeps timer on top and prevents fixed width overflow', () => {
  assert.match(cssUI,/\.df22-timer-zone\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(cssUI, /@media\s*\(min-width:\s*440px\)/);
  assert.match(cssUI, /\.df-v22\.timer-home[^{}]*\.ring-container\s*\{[^}]*max-width:/s);
  assert.doesNotMatch(cssUI, /(?:^|[;{])\s*min-width:\s*(?:3[3-9]\d|[4-9]\d\d|\d{4,})px\s*;/m, 'no mandatory width >320');
});

test('separate locale module covers all 20 languages and all new UI labels', () => {
  const context={window:{}};
  vm.createContext(context);
  vm.runInContext(localeSource,context,{filename:'locale_premium_v22.js',timeout:2000});
  const api=context.window.DF22Locale;
  assert.ok(api && typeof api.t==='function');
  const expected=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
  assert.deepEqual(Object.keys(api.translations).sort(), expected.sort());
  const keys=Object.keys(api.translations.en).sort();
  assert.ok(keys.length>=16,'at least 16 premium UI labels');
  for(const lang of expected) {
    const row=api.translations[lang];
    assert.deepEqual(Object.keys(row).sort(), keys,lang+' keys differ');
    assert.ok(keys.every(k=>typeof row[k]==='string' && row[k].trim().length>0), lang+' has empty values');
    if(lang !== 'en') assert.ok(keys.filter(k=>row[k]!==api.translations.en[k]).length>=8,lang+' has suspicious English fallback');
    assert.equal(api.t(lang,'start'),row.start);
  }
  assert.equal(api.dir('ar'),'rtl');
  assert.equal(api.dir('ur'),'rtl');
  assert.equal(api.dir('fa'),'rtl');
  assert.equal(api.dir('de'),'ltr');
  assert.equal(api.t('nonexistent','start'),api.translations.en.start);
  assert.equal(api.t('ar','undefined-key'),null);
  assert.equal(api.keys.length,keys.length);
});

test('existing app stays unchanged by opt-in design assets', () => {
  for(const js of [localeSource,cssTokens,cssUI]) {
    assert.doesNotMatch(js,/zen_fortress_(?:cfg|notes|tasks)_v21/);
    assert.doesNotMatch(js,/localStorage\.(setItem|removeItem)/);
  }
  assert.match(cssUI,/\.df-v22/);
});

test('locale application updates only explicitly marked text and accessibility attributes', () => {
  const context={window:{}};
  vm.createContext(context);
  vm.runInContext(localeSource,context,{filename:'locale_premium_v22.js'});
  function element(attribute,key) {
    return { attributes:{[attribute]:key},textContent:'old',
      getAttribute(k){return this.attributes[k];},setAttribute(k,v){this.attributes[k]=v;} };
  }
  const textEl=element('data-df22-i18n','newNote');
  const ariaEl=element('data-df22-aria-label','timerLabel');
  const placeholderEl=element('data-df22-placeholder','search');
  const root={querySelectorAll(selector){
    if(selector==='[data-df22-i18n]')return [textEl];
    if(selector==='[data-df22-aria-label]')return [ariaEl];
    if(selector==='[data-df22-placeholder]')return [placeholderEl];
    return [];
  }};
  assert.equal(context.window.DF22Locale.apply(root,'ar'),3);
  assert.equal(textEl.textContent,'ملاحظة جديدة');
  assert.equal(ariaEl.attributes['aria-label'],'مؤقت التركيز');
  assert.equal(placeholderEl.placeholder,'بحث');
});
