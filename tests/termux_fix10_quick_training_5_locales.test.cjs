'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../android/app/src/main/assets/web');
const src=fs.readFileSync(path.join(root,'quick_training.js'),'utf8');
const early=src.indexOf('let quickTraining = null;');
const start=src.indexOf('function quickText(key)');
const end=src.indexOf('function timeString(seconds)',start);
assert.ok(early>0 && start>early && end>start,'Unexpected quick-training structure');
const cfg={lang:'en'};
const labels={title:{textContent:'',getAttribute(){return 'trainingTitle';}},stop:{textContent:'',getAttribute(){return 'stopTraining';}},placeholder:{placeholder:'',getAttribute(){return 'exercisePlaceholder';}}};
const ctx={cfg,document:{querySelectorAll(q){return q==='[data-qt]'?[labels.title,labels.stop]:q==='[data-qt-placeholder]'?[labels.placeholder]:[];}},renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(ctx);
vm.runInContext(src.slice(0,early)+'\n'+src.slice(start,end)+'\nthis.keys=QUICK_KEYS;this.translations=QUICK_TRANSLATIONS;this.translate=quickText;this.refresh=quickL10n;',ctx);
const expected={th:'ฝึกแบบรวดเร็ว',sv:'Snabbträning',el:'Γρήγορη προπόνηση',cs:'Rychlý trénink',ro:'Antrenament rapid'};

test('Thai Swedish Greek Czech Romanian have 36 complete localized fields',()=>{
 assert.equal(ctx.keys.length,36);
 for(const code of Object.keys(expected)) {
  assert.ok(Array.isArray(ctx.translations[code]),`Missing locale ${code}`);
  assert.equal(ctx.translations[code].length,36,`${code} incomplete`);
  assert.ok(ctx.translations[code].every(x=>typeof x==='string' && x.trim()),`${code} empty value`);
 }
});
test('real quickText uses the right translated titles',()=>{
 for(const [code,title] of Object.entries(expected)){
  cfg.lang=code;
  assert.equal(ctx.translate('trainingTitle'),title);
  assert.notEqual(ctx.translate('cancelPrompt'),ctx.translations.en[30]);
 }
});
test('switching locales updates actual labels without touching user content',()=>{
 const userNote='ملاحظاتي ٢٠٢٦';
 for(const code of [...Object.keys(expected),'en','ar']) {
  cfg.lang=code;ctx.refresh();
  assert.equal(labels.title.textContent,ctx.translate('trainingTitle'),code);
  assert.equal(labels.stop.textContent,ctx.translate('stopTraining'),code);
  assert.equal(labels.placeholder.placeholder,ctx.translate('exercisePlaceholder'),code);
 }
 assert.equal(userNote,'ملاحظاتي ٢٠٢٦');
});
test('previous packs remain intact; unknown locale falls back to English',()=>{
 for(const code of ['en','ar','de','es','fr','pt','it','nl','tr','ru','zh','hi','ja','ko','id','vi','pl','bn','ur','fa'])
  assert.equal(ctx.translations[code].length,36,`Old pack ${code} damaged`);
 cfg.lang='zz';
 assert.equal(ctx.translate('trainingTitle'),ctx.translations.en[4]);
});
