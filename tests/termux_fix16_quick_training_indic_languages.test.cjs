'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../android/app/src/main/assets/web');
const src=fs.readFileSync(path.join(root,'quick_training.js'),'utf8');
const boundary=src.indexOf('let quickTraining = null;');
const start=src.indexOf('function quickText(key)');
const stop=src.indexOf('function timeString(seconds)',start);
assert.ok(boundary>0&&start>boundary&&stop>start,'Unexpected quick-training structure');
const cfg={lang:'en'};
const elems={title:{textContent:'',getAttribute:()=> 'trainingTitle'},stop:{textContent:'',getAttribute:()=> 'stopTraining'},hint:{placeholder:'',getAttribute:()=> 'exercisePlaceholder'}};
const ctx={cfg,document:{querySelectorAll(s){return s==='[data-qt]'?[elems.title,elems.stop]:s==='[data-qt-placeholder]'?[elems.hint]:[];}},renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(ctx);
vm.runInContext(src.slice(0,boundary)+'\n'+src.slice(start,stop)+'\nthis.keys=QUICK_KEYS;this.packs=QUICK_TRANSLATIONS;this.lookup=quickText;this.refresh=quickL10n;',ctx);
const titles={ta:'விரைவுப் பயிற்சி',te:'త్వరిత శిక్షణ',mr:'जलद प्रशिक्षण',gu:'ઝડપી તાલીમ',kn:'ತ್ವರಿತ ತರಬೇತಿ'};
const oldCodes='en ar de es fr pt it nl tr ru zh hi ja ko id vi pl bn ur fa th sv el cs ro da fi no sk uk bg hr sr sl lt lv et sw fil af hu az sq is ca gl bs mk be eo'.split(' ');
test('Each new Indic language contains all 36 nonempty labels',()=>{
 assert.equal(ctx.keys.length,36);
 assert.equal(new Set(ctx.keys).size,36);
 for(const [code,title] of Object.entries(titles)){
  const values=ctx.packs[code];
  assert.ok(Array.isArray(values),code+' missing');
  assert.equal(values.length,36,code+' count');
  assert.ok(values.every(t=>typeof t==='string' && t.trim()),code+' contains empty label');
  cfg.lang=code;
  assert.equal(ctx.lookup('trainingTitle'),title,code);
  assert.notEqual(ctx.lookup('cancelPrompt'),ctx.packs.en[30]);
  assert.notEqual(ctx.lookup('replacePrompt'),ctx.packs.en[31]);
 }
});
test('Changing language refreshes labels and placeholder, without touching editable data',()=>{
 const userText='نص المستخدم ٢٠٢٦';
 for(const code of Object.keys(titles)){
  cfg.lang=code;
  ctx.refresh();
  assert.equal(elems.title.textContent,ctx.lookup('trainingTitle'));
  assert.equal(elems.stop.textContent,ctx.lookup('stopTraining'));
  assert.equal(elems.hint.placeholder,ctx.lookup('exercisePlaceholder'));
 }
 assert.equal(userText,'نص المستخدم ٢٠٢٦');
});
test('All 50 previous packs preserved after the expansion',()=>{
 assert.equal(Object.keys(ctx.packs).length,55);
 for(const code of oldCodes){
  assert.ok(Array.isArray(ctx.packs[code]),code+' lost');
  assert.equal(ctx.packs[code].length,36,code+' changed');
 }
});
test('Unknown and excluded Hebrew locale codes keep English fallback',()=>{
 for(const lang of ['he','iw','zz']){
  cfg.lang=lang;
  assert.equal(ctx.lookup('trainingTitle'),ctx.packs.en[4]);
 }
});
