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
const a=src.indexOf('function quickText(key)');
const b=src.indexOf('function timeString(seconds)',a);
assert.ok(boundary>0&&a>boundary&&b>a,'Quick-training source structure changed');
const cfg={lang:'en'};
const ui={title:{textContent:'',getAttribute:()=> 'trainingTitle'},stop:{textContent:'',getAttribute:()=> 'stopTraining'},hint:{placeholder:'',getAttribute:()=> 'exercisePlaceholder'}};
const note={value:'ملاحظتي ٢٠٢٦'};
const ctx={cfg,document:{querySelectorAll(s){return s==='[data-qt]'?[ui.title,ui.stop]:s==='[data-qt-placeholder]'?[ui.hint]:[];}},renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(ctx);
vm.runInContext(src.slice(0,boundary)+'\n'+src.slice(a,b)+'\nthis.keys=QUICK_KEYS;this.packs=QUICK_TRANSLATIONS;this.lookup=quickText;this.refresh=quickL10n;',ctx);
const titles={si:'ඉක්මන් පුහුණුව',my:'အမြန်လေ့ကျင့်မှု',km:'ការហ្វឹកហាត់រហ័ស',lo:'ການຝຶກໄວ',mn:'Шуурхай дасгал'};
const previous='en ar de es fr pt it nl tr ru zh hi ja ko id vi pl bn ur fa th sv el cs ro da fi no sk uk bg hr sr sl lt lv et sw fil af hu az sq is ca gl bs mk be eo ta te mr gu kn uz kk ky tg tk ga cy eu mt gd ka hy ne ml pa'.split(' ');
test('Five more catalog languages have exactly 36 nonempty quick-training fields',()=>{
 assert.equal(ctx.keys.length,36);
 assert.equal(new Set(ctx.keys).size,36);
 for(const code of Object.keys(titles)){
   assert.match(app,new RegExp('"code"\\s*:\\s*"'+code+'"'));
   assert.ok(Array.isArray(ctx.packs[code]),code+' missing');
   assert.equal(ctx.packs[code].length,36,code+' wrong count');
   assert.ok(ctx.packs[code].every(x=>typeof x==='string'&&x.trim()),code+' empty field');
 }
});
test('Actual translator returns local titles and actual localized consent prompts',()=>{
 for(const [code,title] of Object.entries(titles)){
   cfg.lang=code;
   assert.equal(ctx.lookup('trainingTitle'),title,code);
   assert.notEqual(ctx.lookup('cancelPrompt'),ctx.packs.en[30],code);
   assert.notEqual(ctx.lookup('replacePrompt'),ctx.packs.en[31],code);
 }
});
test('Actual locale refresh changes controls but not user-written content',()=>{
 for(const code of Object.keys(titles)){
   cfg.lang=code; ctx.refresh();
   assert.equal(ui.title.textContent,ctx.lookup('trainingTitle'),code);
   assert.equal(ui.stop.textContent,ctx.lookup('stopTraining'),code);
   assert.equal(ui.hint.placeholder,ctx.lookup('exercisePlaceholder'),code);
 }
 assert.equal(note.value,'ملاحظتي ٢٠٢٦');
});
test('All 70 older packs remain, 75 current, excluded codes use English',()=>{
 assert.equal(Object.keys(ctx.packs).length,75);
 for(const code of previous){
   assert.ok(Array.isArray(ctx.packs[code]),code+' previous locale missing');
   assert.equal(ctx.packs[code].length,36,code+' previous locale incomplete');
 }
 for(const code of ['he','iw','zz']){
   cfg.lang=code;
   assert.equal(ctx.lookup('trainingTitle'),ctx.packs.en[4]);
 }
});
