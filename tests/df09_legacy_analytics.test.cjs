'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const web=path.resolve(__dirname,'../android/app/src/main/assets/web');
require(path.join(web,'js/df99_multiscreen_i18n.js'));
require(path.join(web,'js/df99_reviewed_packs.js'));
const old=require(path.join(web,'localization_20_recovery.js'));
globalThis.DeepFocusLocale20Recovery=old;
const beforeDe=globalThis.DF99Locale.t('de','analytics','title','Recorded analytics');
const beforeFr=globalThis.DF99Locale.t('fr','analytics','minutes','Recorded minutes');
const beforeBn=globalThis.DF99Locale.t('bn','analytics','title','Recorded analytics');
const beforeSw=globalThis.DF99Locale.t('sw','analytics','title','Recorded analytics');
const bridge=require(path.join(web,'js/legacy20_analytics_bridge.js'));
test('old 20-language analytics dictionary is complete; excluded Hebrew absent',()=>{
  assert.equal(old.audit().valid,true);assert.equal(old.LANGUAGES.length,20);
  assert.equal(old.KEYS.length,29);
  assert.ok(!old.LANGUAGES.includes('he')&&!old.LANGUAGES.includes('iw'));
  assert.equal(bridge.canonical.length,30);
});
test('reviewed current German and French strings are not overwritten',()=>{
  assert.equal(globalThis.DF99Locale.t('de','analytics','title','Recorded analytics'),beforeDe);
  assert.equal(globalThis.DF99Locale.t('fr','analytics','minutes','Recorded minutes'),beforeFr);
});
test('missing Bengali analytics labels become real Bengali, while other 79 locales remain untouched',()=>{
  assert.equal(beforeBn,'Recorded analytics');
  assert.equal(globalThis.DF99Locale.t('bn','analytics','title','Recorded analytics'),old.t('bn','analyticsTitle'));
  assert.equal(globalThis.DF99Locale.t('bn','analytics','noData','No data'),old.t('bn','noSessions'));
  assert.equal(globalThis.DF99Locale.t('sw','analytics','title','Recorded analytics'),beforeSw);
});
test('actual analytics UI receives the bridged translation, without changing data or session counts',()=>{
  const A=require(path.join(web,'analytics_core_v21.js'));
  const S=require(path.join(web,'analytics_studio.js'));
  const d={createElement(tag){return {tagName:tag.toUpperCase(),children:[],style:{},value:'',textContent:'',attributes:{},
    setAttribute(k,v){this.attributes[k]=v},addEventListener(){},appendChild(x){this.children.push(x);if(this.tagName==='SELECT'&&!this.value)this.value=x.value;return x},
    append(...xs){this.children.push(...xs)},replaceChildren(...xs){this.children=xs},remove(){}}}};
  const target={ownerDocument:d,children:[],appendChild(x){this.children.push(x)}};
  const data={cfg:{sessionHistory:[{id:'valid',date:'2026-10-19',minutes:15,domain:'study'}]},tasksList:[],projects:[]};
  const frozen=JSON.stringify(data);
  const mount=S.mount(target,()=>data,{locale:'bn',today:'2026-10-19',startDate:'2026-10-18',endDate:'2026-10-19'});
  assert.equal(target.children[0].children[0].textContent,old.t('bn','analyticsTitle'));
  assert.equal(mount.getReport().totals.minutes,15);assert.equal(JSON.stringify(data),frozen);
  assert.ok(A);
});
test('bridge is loaded after active reviewed packs and before analytics runtime; no user records touched',()=>{
  const html=fs.readFileSync(path.join(web,'index.html'),'utf8');
  const a=html.indexOf('js/df99_reviewed_packs.js'),b=html.indexOf('localization_20_recovery.js'),c=html.indexOf('js/legacy20_analytics_bridge.js'),d=html.indexOf('analytics_studio.js');
  assert.ok(a>0&&a<b&&b<c&&c<d);
  const src=fs.readFileSync(path.join(web,'js/legacy20_analytics_bridge.js'),'utf8');
  assert.doesNotMatch(src,/localStorage|setItem\(|saveFortressData|zen_fortress_cfg_v21|he-IL|iw-IL/);
});
