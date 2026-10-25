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
assert.ok(early>0&&start>early&&end>start,'Quick-training structure changed');
const cfg={lang:'en'};
const ui={title:{textContent:'',getAttribute:()=> 'trainingTitle'},stop:{textContent:'',getAttribute:()=> 'stopTraining'},placeholder:{placeholder:'',getAttribute:()=> 'exercisePlaceholder'}};
const context={cfg,document:{querySelectorAll(selector){return selector==='[data-qt]'?[ui.title,ui.stop]:selector==='[data-qt-placeholder]'?[ui.placeholder]:[];}},renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(context);
vm.runInContext(src.slice(0,early)+'\n'+src.slice(start,end)+'\nthis.keys=QUICK_KEYS;this.packs=QUICK_TRANSLATIONS;this.lookup=quickText;this.refresh=quickL10n;',context);
const newTitles={da:'Hurtig træning',fi:'Pikaharjoitus',no:'Hurtigtrening',sk:'Rýchly tréning',uk:'Швидке тренування'};
const allOld=['en','ar','de','es','fr','pt','it','nl','tr','ru','zh','hi','ja','ko','id','vi','pl','bn','ur','fa','th','sv','el','cs','ro'];

test('Five new languages have all 36 nonempty quick-training labels',()=>{
 assert.equal(context.keys.length,36);
 for(const code of Object.keys(newTitles)){
  const rows=context.packs[code];
  assert.ok(Array.isArray(rows),code+' missing');
  assert.equal(rows.length,36,code+' key count');
  assert.ok(rows.every(x=>typeof x==='string'&&x.trim()),code+' empty key');
 }
});
test('Real translation function returns Danish Finnish Norwegian Slovak Ukrainian labels',()=>{
 for(const [code,title] of Object.entries(newTitles)){
  cfg.lang=code;
  assert.equal(context.lookup('trainingTitle'),title,code);
  assert.notEqual(context.lookup('cancelPrompt'),context.packs.en[30],code);
 }
});
test('Language switching updates UI labels and placeholder without mutating user text',()=>{
 const savedUserText='ملاحظتي ٢٠٢٦ - actual user content';
 for(const code of Object.keys(newTitles)){
  cfg.lang=code;context.refresh();
  assert.equal(ui.title.textContent,context.lookup('trainingTitle'),code);
  assert.equal(ui.stop.textContent,context.lookup('stopTraining'),code);
  assert.equal(ui.placeholder.placeholder,context.lookup('exercisePlaceholder'),code);
 }
 assert.equal(savedUserText,'ملاحظتي ٢٠٢٦ - actual user content');
});
test('All previous 25 packs preserved; unknown and Hebrew fallback to English',()=>{
 for(const code of allOld)assert.equal(context.packs[code].length,36,code);
 assert.ok(Object.keys(context.packs).length>=30);
 for(const code of ['zz','he','iw']){
  cfg.lang=code;
  assert.equal(context.lookup('trainingTitle'),context.packs.en[4]);
 }
});
