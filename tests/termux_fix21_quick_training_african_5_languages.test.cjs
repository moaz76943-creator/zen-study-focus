"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../android/app/src/main/assets/web');
const source=fs.readFileSync(path.join(root,'quick_training.js'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const boundary=source.indexOf('let quickTraining = null;');
const start=source.indexOf('function quickText(key)');
const stop=source.indexOf('function timeString(seconds)',start);
assert.ok(boundary>0&&start>boundary&&stop>start,'Unexpected quick-training source layout');
const cfg={lang:'en'};
const note={value:'نص المستخدم ٢٠٢٦'};
const ui={
  title:{textContent:'',getAttribute:()=>'trainingTitle'},
  stop:{textContent:'',getAttribute:()=>'stopTraining'},
  hint:{placeholder:'',getAttribute:()=>'exercisePlaceholder'}
};
const ctx={cfg,document:{querySelectorAll(s){return s==='[data-qt]'?[ui.title,ui.stop]:s==='[data-qt-placeholder]'?[ui.hint]:[];}},renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(ctx);
vm.runInContext(source.slice(0,boundary)+'\n'+source.slice(start,stop)+'\nthis.keys=QUICK_KEYS;this.packs=QUICK_TRANSLATIONS;this.lookup=quickText;this.refresh=quickL10n;',ctx);
const titles={ha:'Horarwa cikin sauri',yo:'Ìdánilẹ́kọ̀ọ́ kánkán',ig:'Ọzụzụ ngwa ngwa',zu:'Ukuqeqesha okusheshayo',xh:'Uqeqesho olukhawulezayo'};
const oldCodes=["en","ar","de","es","fr","pt","it","nl","tr","ru","zh","hi","ja","ko","id","vi","pl","bn","ur","fa","th","sv","el","cs","ro","da","fi","no","sk","uk","bg","hr","sr","sl","lt","lv","et","sw","fil","af","hu","az","sq","is","ca","gl","bs","mk","be","eo","ta","te","mr","gu","kn","uz","kk","ky","tg","tk","ga","cy","eu","mt","gd","ka","hy","ne","ml","pa","si","my","km","lo","mn"];

test('Five African catalog languages have 36 nonempty quick-training labels',()=>{
 assert.equal(ctx.keys.length,36);
 assert.equal(new Set(ctx.keys).size,36);
 for(const code of Object.keys(titles)){
  assert.match(app,new RegExp('"code"\\s*:\\s*"'+code+'"'),code+' absent from catalog');
  const pack=ctx.packs[code];
  assert.ok(Array.isArray(pack),code+' missing');
  assert.equal(pack.length,36,code+' label count');
  assert.ok(pack.every(x=>typeof x==='string'&&x.trim()),code+' empty value');
 }
});
test('Actual quickText returns native labels and prompts',()=>{
 for(const [code,title] of Object.entries(titles)){
  cfg.lang=code;
  assert.equal(ctx.lookup('trainingTitle'),title,code);
  assert.notEqual(ctx.lookup('cancelPrompt'),ctx.packs.en[30],code);
  assert.notEqual(ctx.lookup('replacePrompt'),ctx.packs.en[31],code);
 }
});
test('Changing language updates visible labels without editing user text',()=>{
 for(const code of Object.keys(titles)){
  cfg.lang=code;ctx.refresh();
  assert.equal(ui.title.textContent,ctx.lookup('trainingTitle'),code);
  assert.equal(ui.stop.textContent,ctx.lookup('stopTraining'),code);
  assert.equal(ui.hint.placeholder,ctx.lookup('exercisePlaceholder'),code);
 }
 assert.equal(note.value,'نص المستخدم ٢٠٢٦');
});
test('Previous 75 language packs preserved, excluded codes use English',()=>{
 assert.ok(Object.keys(ctx.packs).length>=80,'retain all existing packs while allowing additive locale batches');
 for(const code of oldCodes){
  assert.ok(Array.isArray(ctx.packs[code]),code+' previous pack missing');
  assert.equal(ctx.packs[code].length,36,code+' previous pack incomplete');
 }
 for(const code of ['he','iw','zz']){
  cfg.lang=code;
  assert.equal(ctx.lookup('trainingTitle'),ctx.packs.en[4]);
 }
});
