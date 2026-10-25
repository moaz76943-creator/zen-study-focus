"use strict";
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.resolve(__dirname,'../android/app/src/main/assets/web');
const source=fs.readFileSync(path.join(dir,'quick_training.js'),'utf8');
const boundary=source.indexOf('let quickTraining = null;');
const start=source.indexOf('function quickText(key)');
const end=source.indexOf('function timeString(seconds)',start);
assert.ok(boundary>0 && start>boundary && end>start,'Quick training structure changed');
const cfg={lang:'en'};
const elements={
 title:{textContent:'',getAttribute:()=>'trainingTitle'},
 stop:{textContent:'',getAttribute:()=>'stopTraining'},
 hint:{placeholder:'',getAttribute:()=>'exercisePlaceholder'}
};
const ctx={cfg,document:{querySelectorAll(key){return key==='[data-qt]'?[elements.title,elements.stop]:key==='[data-qt-placeholder]'?[elements.hint]:[];}},renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(ctx);
vm.runInContext(source.slice(0,boundary)+'\n'+source.slice(start,end)+'\nthis.keys=QUICK_KEYS;this.packs=QUICK_TRANSLATIONS;this.lookup=quickText;this.refresh=quickL10n;',ctx);
const titles={uz:'Tezkor mashg‘ulot',kk:'Жылдам жаттығу',ky:'Ыкчам машыгуу',tg:'Тамрини зуд',tk:'Çalt türgenleşik'};
const oldCodes='en ar de es fr pt it nl tr ru zh hi ja ko id vi pl bn ur fa th sv el cs ro da fi no sk uk bg hr sr sl lt lv et sw fil af hu az sq is ca gl bs mk be eo ta te mr gu kn'.split(' ');

test('Five new languages are listed in official catalog and provide 36 nonempty strings',()=>{
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 for(const code of Object.keys(titles)){
  assert.match(app,new RegExp('"code"\\s*:\\s*"'+code+'"'));
  assert.ok(Array.isArray(ctx.packs[code]),code+' missing');
  assert.equal(ctx.packs[code].length,36,code+' incorrect count');
  assert.ok(ctx.packs[code].every(s=>typeof s==='string'&&s.trim()),code+' empty value');
 }
 assert.equal(ctx.keys.length,36);
 assert.equal(new Set(ctx.keys).size,36);
});

test('Actual label and confirmation lookup change with language',()=>{
 for(const [code,title] of Object.entries(titles)){
  cfg.lang=code;
  assert.equal(ctx.lookup('trainingTitle'),title,code);
  assert.notEqual(ctx.lookup('cancelPrompt'),ctx.packs.en[30],code);
  assert.notEqual(ctx.lookup('replacePrompt'),ctx.packs.en[31],code);
 }
});

test('Visible elements update without writing to any user notes',()=>{
 const note='ملاحظة المستخدم ٢٠٢٦';
 for(const code of Object.keys(titles)){
  cfg.lang=code;ctx.refresh();
  assert.equal(elements.title.textContent,ctx.lookup('trainingTitle'),code);
  assert.equal(elements.stop.textContent,ctx.lookup('stopTraining'),code);
  assert.equal(elements.hint.placeholder,ctx.lookup('exercisePlaceholder'),code);
 }
 assert.equal(note,'ملاحظة المستخدم ٢٠٢٦');
});

test('All 55 older packs survive and unsupported codes use English fallback',()=>{
 assert.ok(Object.keys(ctx.packs).length>=60);
 for(const code of oldCodes){
  assert.ok(Array.isArray(ctx.packs[code]),code+' lost');
  assert.equal(ctx.packs[code].length,36,code+' incomplete');
 }
 for(const lang of ['zz','he','iw']){
  cfg.lang=lang;
  assert.equal(ctx.lookup('trainingTitle'),ctx.packs.en[4]);
 }
});
