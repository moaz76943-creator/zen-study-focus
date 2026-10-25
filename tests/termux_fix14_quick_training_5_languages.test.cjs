'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../android/app/src/main/assets/web');
const source=fs.readFileSync(path.join(root,'quick_training.js'),'utf8');
const boundary=source.indexOf('let quickTraining = null;');
const from=source.indexOf('function quickText(key)');
const to=source.indexOf('function timeString(seconds)',from);
assert.ok(boundary>0 && from>boundary && to>from,'Unexpected production translation structure');
const cfg={lang:'en'};
const ui={title:{textContent:'',getAttribute:()=> 'trainingTitle'},stop:{textContent:'',getAttribute:()=> 'stopTraining'},hint:{placeholder:'',getAttribute:()=> 'exercisePlaceholder'}};
const ctx={cfg,document:{querySelectorAll(s){return s==='[data-qt]'?[ui.title,ui.stop]:s==='[data-qt-placeholder]'?[ui.hint]:[];}},renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(ctx);
vm.runInContext(source.slice(0,boundary)+'\n'+source.slice(from,to)+'\nthis.keys=QUICK_KEYS;this.packs=QUICK_TRANSLATIONS;this.translate=quickText;this.refresh=quickL10n;',ctx);
const titles={hu:'Gyors edzés',az:'Sürətli məşq',sq:'Stërvitje e shpejtë',is:'Fljótleg æfing',ca:'Entrenament ràpid'};
const oldLocales=['en','ar','de','es','fr','pt','it','nl','tr','ru','zh','hi','ja','ko','id','vi','pl','bn','ur','fa','th','sv','el','cs','ro','da','fi','no','sk','uk','bg','hr','sr','sl','lt','lv','et','sw','fil','af'];
test('All 36 quick-training keys are present for the 5 new catalog languages',()=>{
 assert.equal(ctx.keys.length,36);
 assert.equal(new Set(ctx.keys).size,36);
 for(const code of Object.keys(titles)) {
  const pack=ctx.packs[code];
  assert.ok(Array.isArray(pack),code+' missing');
  assert.equal(pack.length,36,code+' wrong length');
  assert.ok(pack.every(s=>typeof s==='string' && s.trim()),code+' has empty text');
 }
});
test('Real translation lookup returns native labels and native consent messages',()=>{
 for(const [code,title] of Object.entries(titles)) {
  cfg.lang=code;
  assert.equal(ctx.translate('trainingTitle'),title,code);
  assert.notEqual(ctx.translate('cancelPrompt'),ctx.packs.en[30],code+' untranslated cancel');
  assert.notEqual(ctx.translate('replacePrompt'),ctx.packs.en[31],code+' untranslated replace');
 }
});
test('Switching languages refreshes visible controls and placeholder',()=>{
 for(const code of [...Object.keys(titles),'ar','en']) {
  cfg.lang=code;
  ctx.refresh();
  assert.equal(ui.title.textContent,ctx.translate('trainingTitle'),code);
  assert.equal(ui.stop.textContent,ctx.translate('stopTraining'),code);
  assert.equal(ui.hint.placeholder,ctx.translate('exercisePlaceholder'),code);
 }
});
test('All 40 previous locale packs remain complete; excluded codes use English',()=>{
 for(const code of oldLocales) {
  assert.ok(Array.isArray(ctx.packs[code]),'Missing old locale '+code);
  assert.equal(ctx.packs[code].length,36,'Old locale changed: '+code);
 }
 assert.equal(Object.keys(ctx.packs).length,45);
 for(const code of ['zz','he','iw']) {
  cfg.lang=code;
  assert.equal(ctx.translate('trainingTitle'),ctx.packs.en[4]);
 }
});
