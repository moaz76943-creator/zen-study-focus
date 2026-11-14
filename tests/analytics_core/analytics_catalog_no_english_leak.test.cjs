'use strict';
// Analytics Studio builds labels in JS (select options, composite comparison lines, aria labels, export status).
// The reviewed DF99 analytics dictionaries cover only part of them; the rest must come from the shared
// 100-language UI catalog (i18n/packs). This guards against English leaking into non-English Analytics.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const repo=path.resolve(__dirname,'../..');
const web=path.join(repo,'android/app/src/main/assets/web');
const studioSrc=fs.readFileSync(path.join(web,'analytics_studio.js'),'utf8');
const EN=Function('return ({'+studioSrc.match(/const EN=Object\.freeze\(\{([\s\S]*?)\}\);/)[1]+'})')();
const norm=t=>{let i=0;return t.replace(/\s+/g,' ').trim().replace(/\d+(?:[.,:]\d+)*/g,()=>'{'+(i++)+'}');};
const packCodes=fs.readdirSync(path.join(repo,'i18n/packs')).filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5));
const pack=code=>JSON.parse(fs.readFileSync(path.join(repo,'i18n/packs',code+'.json'),'utf8')).t;

// Minimal stand-in for window.DFUiCatalog with the same normalize/substitute rule as i18n_ui_catalog.js.
function catalogFor(code){
  const t=fs.existsSync(path.join(repo,'i18n/packs',code+'.json'))?pack(code):{};
  return {active:()=>code,translate(text){
    const nums=[];let i=0;
    const key=String(text).replace(/\s+/g,' ').trim().replace(/\d+(?:[.,:]\d+)*/g,m=>{nums.push(m);return '{'+(i++)+'}';});
    const tr=t[key];if(typeof tr!=='string'||!tr)return String(text);
    return tr.replace(/\{(\d+)\}/g,(m,d)=>nums[+d]!==undefined?nums[+d]:m);
  }};
}
function fakeDoc(){
  return {createElement(tag){
    return {tagName:tag.toUpperCase(),children:[],attributes:{},events:{},style:{},value:'',disabled:false,className:'',textContent:'',innerHTML:'',
      setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k]??null;},
      addEventListener(k,fn){this.events[k]=fn;},
      appendChild(c){this.children.push(c);if(this.tagName==='SELECT'&&!this.value)this.value=c.value;return c;},
      append(...cs){this.children.push(...cs);},replaceChildren(...cs){this.children=cs;},remove(){this.removed=true;}};
  }};
}
function allText(node,out=[]){
  if(!node||typeof node!=='object')return out;
  if(typeof node.textContent==='string'&&node.textContent)out.push(node.textContent);
  if(typeof node.innerHTML==='string'&&node.innerHTML)out.push(node.innerHTML);
  for(const v of Object.values(node.attributes||{}))out.push(v);
  for(const c of node.children||[])allText(c,out);
  return out;
}
function render(code,{exportStatus}={}){
  const Studio=require(path.join(web,'analytics_studio.js'));
  const prev=globalThis.DFUiCatalog;globalThis.DFUiCatalog=catalogFor(code);
  try{
    const host={ownerDocument:fakeDoc(),appendChild(x){this.child=x;}};
    const ui=Studio.mount(host,()=>({sessionHistory:[
      {id:'a',date:'2026-03-30',domain:'study',minutes:10},{id:'b',date:'2026-03-25',domain:'read',minutes:5},
      {id:'c',date:'2026-03-20',domain:'work',minutes:7},{id:'d',date:'2026-03-18',domain:'sport',minutes:9}
    ],tasksList:[]}),{today:'2026-03-30',locale:code,
      onExport:exportStatus?async()=>({status:exportStatus}):undefined});
    return {ui,host,text:allText(host.child).join('\n')};
  }finally{globalThis.DFUiCatalog=prev;}
}

test('every pack translates every Analytics Studio English label (shared catalog is complete for Analytics)',()=>{
  const need=[...new Set(Object.values(EN).map(norm))];
  const gaps=[];
  for(const code of packCodes){const t=pack(code);for(const k of need)if(typeof t[k]!=='string'||!t[k].trim())gaps.push(code+': '+k);}
  assert.deepEqual(gaps,[],'Analytics strings missing from packs');
});

for(const code of ['fr','de','es','fa','ur','ja']){
  test('Analytics in '+code+' shows no English-only labels',()=>{
    const t=pack(code);
    const {ui,text}=render(code);
    const leaks=[];
    for(const [key,en] of Object.entries(EN)){
      if(en.length<4)continue; // "min", "All" etc. can be substrings of other words
      const tr=t[norm(en)];
      if(!tr||tr===en)continue; // genuinely identical in this language
      // whole-word match: "Period" must not match the Spanish "Periodo"
      const esc=en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      if(new RegExp('(?<![\\p{L}\\p{N}])'+esc+'(?![\\p{L}\\p{N}])','u').test(text))leaks.push(key+': '+en);
    }
    assert.deepEqual(leaks,[],code+' leaks');
    ui.destroy();
  });
}

test('comparison line is fully localized and digits stay Western (fr)',()=>{
  const {ui,text}=render('fr');
  assert.ok(!/Last 7 days|Previous 7 days/.test(text),'composite comparison still English');
  assert.ok(!/[٠-٩۰-۹]/.test(text),'non-Western digits');
  ui.destroy();
});

test('English stays English and Arabic keeps its own reviewed table',()=>{
  const en=render('en');assert.ok(en.text.includes('Last 7 days'));en.ui.destroy();
  const ar=render('ar');assert.ok(ar.text.includes('آخر 7 أيام'));assert.ok(!ar.text.includes('Last 7 days'));ar.ui.destroy();
});
