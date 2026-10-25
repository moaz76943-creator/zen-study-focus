'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../android/app/src/main/assets/web');
const src=fs.readFileSync(path.join(root,'quick_training.js'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const boundary=src.indexOf('let quickTraining = null;');
const start=src.indexOf('function quickText(key)');
const stop=src.indexOf('function timeString(seconds)',start);
assert.ok(boundary>0&&start>boundary&&stop>start,'Quick training source layout changed');
const cfg={lang:'en'};
const fields={
 title:{textContent:'',getAttribute:()=> 'trainingTitle'},
 stop:{textContent:'',getAttribute:()=> 'stopTraining'},
 hint:{placeholder:'',getAttribute:()=> 'exercisePlaceholder'}
};
const ctx={cfg,document:{querySelectorAll(sel){
 return sel==='[data-qt]'?[fields.title,fields.stop]:sel==='[data-qt-placeholder]'?[fields.hint]:[];
}},renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(ctx);
vm.runInContext(src.slice(0,boundary)+'\n'+src.slice(start,stop)+'\nthis.keys=QUICK_KEYS;this.packs=QUICK_TRANSLATIONS;this.lookup=quickText;this.refresh=quickL10n;',ctx);
const titles={
 ga:'Traenáil thapa',
 cy:'Hyfforddiant cyflym',
 eu:'Entrenamendu azkarra',
 mt:'Taħriġ ta’ malajr',
 gd:'Trèanadh luath'
};
const oldCodes='en ar de es fr pt it nl tr ru zh hi ja ko id vi pl bn ur fa th sv el cs ro da fi no sk uk bg hr sr sl lt lv et sw fil af hu az sq is ca gl bs mk be eo ta te mr gu kn uz kk ky tg tk'.split(' ');
test('Five new codes are in the official 99-language catalog and have all 36 labels',()=>{
 assert.equal(ctx.keys.length,36);
 assert.equal(new Set(ctx.keys).size,36);
 for(const code of Object.keys(titles)){
  assert.match(app,new RegExp('"code"\\s*:\\s*"'+code+'"'),code+' not in official catalog');
  assert.ok(Array.isArray(ctx.packs[code]),code+' missing');
  assert.equal(ctx.packs[code].length,36,code+' wrong label count');
  assert.ok(ctx.packs[code].every(t=>typeof t==='string'&&t.trim()),code+' empty label');
 }
});
test('Native quick-training labels and consent questions change with language',()=>{
 for(const [code,title] of Object.entries(titles)){
  cfg.lang=code;
  assert.equal(ctx.lookup('trainingTitle'),title,code);
  assert.notEqual(ctx.lookup('cancelPrompt'),ctx.packs.en[30],code);
  assert.notEqual(ctx.lookup('replacePrompt'),ctx.packs.en[31],code);
 }
});
test('Language changes update actual labels and placeholder without user data edits',()=>{
 const original='ملاحظتي ٢٠٢٦ — do not change';
 for(const code of Object.keys(titles)){
  cfg.lang=code;ctx.refresh();
  assert.equal(fields.title.textContent,ctx.lookup('trainingTitle'),code);
  assert.equal(fields.stop.textContent,ctx.lookup('stopTraining'),code);
  assert.equal(fields.hint.placeholder,ctx.lookup('exercisePlaceholder'),code);
 }
 assert.equal(original,'ملاحظتي ٢٠٢٦ — do not change');
});
test('The previous 60 quick-training languages persist and excluded codes fallback',()=>{
 assert.ok(Object.keys(ctx.packs).length>=65,'Prior 60 plus five must exist');
 for(const code of oldCodes){
  assert.ok(Array.isArray(ctx.packs[code]),code+' old pack lost');
  assert.equal(ctx.packs[code].length,36,code+' old pack changed');
 }
 for(const code of ['zz','he','iw']){
  cfg.lang=code;
  assert.equal(ctx.lookup('trainingTitle'),ctx.packs.en[4]);
 }
});
