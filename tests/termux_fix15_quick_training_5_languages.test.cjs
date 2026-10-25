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
const end=src.indexOf('function timeString(seconds)',start);
assert.ok(boundary>0&&start>boundary&&end>start,'Quick training source layout changed');
const cfg={lang:'en'};
const ui={
 title:{textContent:'',getAttribute:()=> 'trainingTitle'},
 stop:{textContent:'',getAttribute:()=> 'stopTraining'},
 hint:{placeholder:'',getAttribute:()=> 'exercisePlaceholder'}
};
const ctx={cfg,document:{querySelectorAll(sel){
  if(sel==='[data-qt]')return [ui.title,ui.stop];
  if(sel==='[data-qt-placeholder]')return [ui.hint];
  return [];
}},renderQuickTraining(){},renderTodayPlan(){},updateFocusStatus(){}};
vm.createContext(ctx);
vm.runInContext(src.slice(0,boundary)+'\n'+src.slice(start,end)+'\nthis.keys=QUICK_KEYS;this.packs=QUICK_TRANSLATIONS;this.lookup=quickText;this.refresh=quickL10n;',ctx);
const titles = {"gl": "Adestramento rápido", "bs": "Brzi trening", "mk": "Брз тренинг", "be": "Хуткая трэніроўка", "eo": "Rapida trejnado"};
const allPrevious = ["en", "ar", "de", "es", "fr", "pt", "it", "nl", "tr", "ru", "zh", "hi", "ja", "ko", "id", "vi", "pl", "bn", "ur", "fa", "th", "sv", "el", "cs", "ro", "da", "fi", "no", "sk", "uk", "bg", "hr", "sr", "sl", "lt", "lv", "et", "sw", "fil", "af", "hu", "az", "sq", "is", "ca"];

test('Five new locales have precisely 36 nonempty training messages',()=>{
 assert.equal(ctx.keys.length,36);
 assert.equal(new Set(ctx.keys).size,36);
 for(const [lang,title] of Object.entries(titles)){
  const pack=ctx.packs[lang];
  assert.ok(Array.isArray(pack),lang+' missing');
  assert.equal(pack.length,36,lang+' wrong number of labels');
  assert.ok(pack.every(x=>typeof x==='string' && x.trim()),lang+' has empty labels');
  cfg.lang=lang;
  assert.equal(ctx.lookup('trainingTitle'),title,lang);
  assert.notEqual(ctx.lookup('cancelPrompt'),ctx.packs.en[30],lang+' cancel not translated');
  assert.notEqual(ctx.lookup('replacePrompt'),ctx.packs.en[31],lang+' replace not translated');
 }
});

test('Real language switching refreshes controls and placeholder',()=>{
 for(const lang of [...Object.keys(titles),'ar','en']){
  cfg.lang=lang;
  ctx.refresh();
  assert.equal(ui.title.textContent,ctx.lookup('trainingTitle'),lang);
  assert.equal(ui.stop.textContent,ctx.lookup('stopTraining'),lang);
  assert.equal(ui.hint.placeholder,ctx.lookup('exercisePlaceholder'),lang);
 }
});

test('All previous 45 languages remain available and complete',()=>{
 for(const code of allPrevious){
  assert.ok(Array.isArray(ctx.packs[code]),code+' previous language lost');
  assert.equal(ctx.packs[code].length,36,code+' previous language changed');
 }
 assert.equal(Object.keys(ctx.packs).length,50);
});

test('Excluded or unknown languages use existing English fallback',()=>{
 for(const lang of ['he','iw','zz']){
  cfg.lang=lang;
  assert.equal(ctx.lookup('trainingTitle'),ctx.packs.en[4],lang);
 }
});
