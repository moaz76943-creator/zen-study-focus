'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const locale = require('../../android/app/src/main/assets/web/localization_20_recovery.js');

const ORIGINAL = ['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
const EASTERN = /[\u0660-\u0669\u06f0-\u06f9]/u;

test('DF-043/049/050: exactly the original 20 languages, equal complete key registries', () => {
  assert.deepEqual([...locale.LANGUAGES], ORIGINAL);
  assert.equal(new Set(locale.KEYS).size, locale.KEYS.length);
  assert.ok(locale.KEYS.length >= 29);
  const audit = locale.audit();
  assert.equal(audit.valid, true);
  for (const code of ORIGINAL) {
    assert.equal(audit.perLanguage[code].translated, locale.KEYS.length);
    assert.equal(audit.perLanguage[code].missing.length, 0);
    assert.deepEqual(Object.keys(locale.translations[code]).sort(), [...locale.KEYS].sort());
  }
});

test('DF-051/054: no missing key placeholder; non-English locales have own UI strings', () => {
  assert.equal(locale.t('de', 'unknown_internal_key'), null);
  assert.equal(locale.t('de', 'analyticsTitle'), 'Erfasste Analysen');
  assert.notEqual(locale.t('ja', 'analyticsTitle'), locale.t('en', 'analyticsTitle'));
  assert.notEqual(locale.t('fa', 'analyticsTitle'), locale.t('en', 'analyticsTitle'));
  for (const code of ORIGINAL) for (const key of locale.KEYS) {
    const value = locale.t(code, key);
    assert.equal(typeof value, 'string', code + '.' + key);
    assert.ok(value.trim());
    assert.notEqual(value, key);
    assert.equal(EASTERN.test(locale.westernDigits(value)), false);
  }
});

test('DF-053/055: RTL detection with BCP47 normalization; invalid languages safe', () => {
  for (const code of ['ar','fa','ur']) assert.equal(locale.direction(code), 'rtl');
  assert.equal(locale.direction('ar-JO'), 'rtl');
  assert.equal(locale.direction('fa-IR'), 'rtl');
  assert.equal(locale.direction('de'), 'ltr');
  assert.equal(locale.resolve('de-DE'), 'de');
  assert.equal(locale.resolve('xyz'), 'en');
});

test('DF-052: Western-generated numbers in all 20 locales, including negative and decimals', () => {
  for (const code of ORIGINAL) {
    for (const value of [0,9,10,25,100,1234,-2,0.75,100]) {
      const formatted = locale.formatNumber(value, code);
      assert.ok(formatted.length > 0);
      assert.equal(EASTERN.test(formatted), false, code + ':' + formatted);
    }
    const date = locale.formatDate(new Date('2026-10-19T12:00:00Z'), code,
      {year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'});
    assert.equal(EASTERN.test(date), false, code + ':' + date);
  }
  assert.equal(locale.westernDigits('٠١٢٣٤٥٦٧٨٩ ۰۱۲۳۴۵۶۷۸۹'), '0123456789 0123456789');
  assert.equal(locale.westernDigits('00:05 2026-10-19 100%'), '00:05 2026-10-19 100%');
});

test('DF-053/059: annotated generated UI only; user note/task content never rewritten', () => {
  class Element {
    constructor(attrs = {}, textContent = '') { this.attrs={...attrs}; this.textContent=textContent; this.placeholder=''; this.title=''; this.children=[]; this.parentElement=null; this.value=''; }
    getAttribute(k) { return Object.hasOwn(this.attrs,k)?this.attrs[k]:null; }
    setAttribute(k,v) { this.attrs[k]=v; }
    hasAttribute(k) { return Object.hasOwn(this.attrs,k); }
    closest(query) {
      if (query !== '[data-df20-user-content], [contenteditable]') return null;
      for(let e=this; e; e=e.parentElement) if(e.hasAttribute('data-df20-user-content')||e.hasAttribute('contenteditable')) return e;
      return null;
    }
    querySelectorAll(query) {
      if(!query.startsWith('[') || !query.endsWith(']')) throw new Error(query);
      const attribute = query.slice(1, -1);
      const out = []; const walk = e => { for(const c of e.children) { if(c.hasAttribute(attribute)) out.push(c); walk(c); } };
      walk(this); return out;
    }
    appendChild(child){child.parentElement=this;this.children.push(child);}
  }
  const root=new Element({'data-df20-scope':''});
  const label=new Element({'data-df20-i18n':'analyticsTitle'}, 'Old English');
  const placeholder=new Element({'data-df20-placeholder':'noSessions'});
  const input=new Element({'data-df20-i18n':'minutes'},'non-target input');input.value='My ١٢٣';
  const user=new Element({'data-df20-user-content':''});
  const note=new Element({'data-df20-i18n':'analyticsTitle'},'ملاحظتي ١٢٣');
  root.appendChild(label); root.appendChild(placeholder); root.appendChild(user);user.appendChild(note);
  root.appendChild(input);
  assert.equal(locale.apply(root,'fa'),2);
  assert.equal(label.textContent,locale.t('fa','analyticsTitle'));
  assert.equal(placeholder.placeholder,locale.t('fa','noSessions'));
  assert.equal(root.attrs.dir,'rtl');
  assert.equal(note.textContent,'ملاحظتي ١٢٣');
  assert.equal(input.value,'My ١٢٣');
  assert.equal(locale.apply(root,'de'),2);
  assert.equal(label.textContent,locale.t('de','analyticsTitle'));
  assert.equal(root.attrs.dir,'ltr');
});

test('DF-045/055: state switch persists through injected v21 adapter without copying user data', () => {
  const calls=[];const holder={value:'en'};
  const ctrl=locale.createController({locale:'en',
    persist:code=>{holder.value=code;calls.push('persist:'+code);},
    onChange:code=>calls.push('render:'+code)});
  assert.equal(ctrl.setLanguage('ur'),true);
  assert.equal(holder.value,'ur');
  assert.equal(ctrl.language(),'ur');
  assert.equal(ctrl.setLanguage('ur'),false);
  assert.deepEqual(calls,['persist:ur','render:ur']);
  const failing=locale.createController({locale:'en',persist:()=>{throw Error('quota')}});
  assert.throws(()=>failing.setLanguage('ar'),/quota/);
  assert.equal(failing.language(),'en');
  assert.equal(ctrl.dispose(),true);
  assert.equal(ctrl.setLanguage('fr'),false);
});
