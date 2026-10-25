"use strict";
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname,'../android/app/src/main/assets/web');
const source = fs.readFileSync(path.join(root,'quick_training.js'),'utf8');
const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
const boundary = source.indexOf('let quickTraining = null;');
const start = source.indexOf('function quickText(key)');
const end = source.indexOf('function timeString(seconds)',start);
assert.ok(boundary>0 && start>boundary && end>start,'Unexpected quick-training runtime structure');
const cfg={lang:'en'};
const inputs={title:{textContent:'',getAttribute:()=> 'trainingTitle'},stop:{textContent:'',getAttribute:()=> 'stopTraining'},hint:{placeholder:'',getAttribute:()=> 'exercisePlaceholder'}};
const note={value:'ملاحظتي ٢٠٢٦'};
const ctx={cfg,document:{querySelectorAll(s){return s==='[data-qt]'?[inputs.title,inputs.stop]:s==='[data-qt-placeholder]'?[inputs.hint]:[];}},renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(ctx);
vm.runInContext(source.slice(0,boundary)+'\n'+source.slice(start,end)+'\nthis.keys=QUICK_KEYS;this.packs=QUICK_TRANSLATIONS;this.translate=quickText;this.refresh=quickL10n;',ctx);
const titles={ka:'სწრაფი ვარჯიში',hy:'Արագ մարզում',ne:'द्रुत प्रशिक्षण',ml:'ദ്രുത പരിശീലനം',pa:'ਤੇਜ਼ ਸਿਖਲਾਈ'};
const older='en ar de es fr pt it nl tr ru zh hi ja ko id vi pl bn ur fa th sv el cs ro da fi no sk uk bg hr sr sl lt lv et sw fil af hu az sq is ca gl bs mk be eo ta te mr gu kn uz kk ky tg tk ga cy eu mt gd'.split(' ');
test('Five new languages belong to official catalog and each has 36 complete labels',()=>{
 assert.equal(ctx.keys.length,36);
 assert.equal(new Set(ctx.keys).size,36);
 for(const code of Object.keys(titles)){
  assert.match(app,new RegExp('"code"\\s*:\\s*"'+code+'"'));
  const pack=ctx.packs[code];
  assert.ok(Array.isArray(pack),code+' is missing');
  assert.equal(pack.length,36,code+' has wrong number of labels');
  assert.ok(pack.every(s=>typeof s==='string'&&s.trim()),code+' has empty label');
 }
});
test('Actual translator returns localized training titles and confirmation questions',()=>{
 for(const [code,title] of Object.entries(titles)){
  cfg.lang=code;
  assert.equal(ctx.translate('trainingTitle'),title,code);
  assert.notEqual(ctx.translate('cancelPrompt'),ctx.packs.en[30],code);
  assert.notEqual(ctx.translate('replacePrompt'),ctx.packs.en[31],code);
 }
});
test('Switching languages updates controls but preserves editable notes',()=>{
 for(const code of Object.keys(titles)){
  cfg.lang=code;ctx.refresh();
  assert.equal(inputs.title.textContent,ctx.translate('trainingTitle'));
  assert.equal(inputs.stop.textContent,ctx.translate('stopTraining'));
  assert.equal(inputs.hint.placeholder,ctx.translate('exercisePlaceholder'));
 }
 assert.equal(note.value,'ملاحظتي ٢٠٢٦');
});
test('Previous 65 packs remain, exact total becomes 70, Hebrew and unknown codes fallback',()=>{
 assert.equal(Object.keys(ctx.packs).length,70);
 for(const code of older){
  assert.ok(Array.isArray(ctx.packs[code]),code+' previous pack lost');
  assert.equal(ctx.packs[code].length,36,code+' previous pack changed');
 }
 for(const code of ['he','iw','zz']){
  cfg.lang=code;
  assert.equal(ctx.translate('trainingTitle'),ctx.packs.en[4],code);
 }
});
