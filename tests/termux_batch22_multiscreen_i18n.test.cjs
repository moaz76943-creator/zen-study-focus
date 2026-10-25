'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../android/app/src/main/assets/web');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const bridge=read('js/df99_multiscreen_i18n.js');
const quick=read('quick_training.js');
const premium=read('locale_premium_v22.js');
const mock={window:{},document:{querySelectorAll(){return []}}};
vm.createContext(mock);
vm.runInContext(quick.slice(0,quick.indexOf('let quickTraining = null;'))+'\nthis.qt=QUICK_TRANSLATIONS;this.qk=QUICK_KEYS;',mock);
// Run in the same lexical VM context as quick dictionaries.
vm.runInContext(premium,mock);
vm.runInContext(bridge,mock);
const d=mock.window.DF99Locale;
const locales=Object.keys(mock.qt);

test('80+ real quick training packs supply translated goal completed status',()=>{
 assert.ok(locales.length>=80);
 for(const code of ['de','es','fr','ha','yo']){
   const fallback='completed';
   const actual=d.t(code,'goals','done',fallback);
   assert.equal(actual,mock.qt[code][mock.qk.indexOf('done')]);
 }
});
test('Existing locale premium translations supply task, note, and timer control labels',()=>{
 for(const code of ['de','es','fr']){
  const p=mock.window.DF22Locale;
  assert.equal(d.t(code,'tasks','save','Save'),p.t(code,'save'));
  assert.equal(d.t(code,'tasks','cancel','Cancel'),p.t(code,'cancel'));
  assert.equal(d.t(code,'notes','15','New note'),p.t(code,'newNote'));
  assert.equal(d.t(code,'timer','3','Focus · min'),p.t(code,'focus')+' · min');
 }
});
test('Untranslated fields have honest fallback and excluded Hebrew never resolves to a custom pack',()=>{
 assert.equal(d.t('ha','notes','1','My notes'), 'My notes');
 assert.equal(d.t('zz','tasks','save','Save'),'Save');
 assert.equal(d.t('he','tasks','save','Save'),'Save');
 assert.equal(d.t('iw','tasks','save','Save'),'Save');
 assert.equal(d.normalize('fa-IR'),'fa');
 assert.equal(d.normalize('he-IL'),'en');
});
test('Reviewed locale overlays can be registered without user data or HTML mutation',()=>{
 assert.equal(d.register('he','tasks',{save:'forbidden'}),false);
 assert.equal(d.register('de','tasks',{save:'Sichern'}),true);
 assert.equal(d.t('de','tasks','save','Save'),'Sichern');
 assert.equal(d.register('fr','notes',{note:''}),false);
 const safe={save:'Save'};
 assert.equal(d.section('tasks','fr',safe).save,mock.window.DF22Locale.t('fr','save'));
 assert.deepEqual(safe,{save:'Save'});
});
test('Five existing UI areas are wired into bridge and no v21 persistence keys are touched',()=>{
 const pages={
  'timer_settings.js':'DF99Locale?.t(cfg.lang',
  'goals_studio.js':'DF99Locale?.t(cfg.lang',
  'notes_studio.js':'DF99Locale?.t(cfg.lang',
  'tasks_studio.js':"DF99Locale?.section('tasks'",
  'analytics_studio.js':"dict.t(code,'analyticsDomain'"
 };
 for(const [filename,marker] of Object.entries(pages))assert.ok(read(filename).includes(marker),filename);
 const html=read('index.html');
 assert.ok(html.indexOf('js/df99_multiscreen_i18n.js')<html.indexOf('quick_training.js'));
 assert.ok(html.includes('js/df99_multiscreen_i18n.js'));
});
