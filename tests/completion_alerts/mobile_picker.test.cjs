'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Alerts=require('../../android/app/src/main/assets/web/completion_alert_settings.js');
const Locales=require('../../android/app/src/main/assets/web/completion_alert_locales.js');
class Element{
 constructor(doc,tag){this.ownerDocument=doc;this.tagName=tag.toUpperCase();this.className='';this.children=[];this.attributes={};this.listeners={};this.value='';this.checked=false;this.style={};this.textContent='';this.parentNode=null;}
 appendChild(x){this.children.push(x);x.parentNode=this;return x;}
 replaceChildren(...xs){this.children=[];xs.forEach(x=>this.appendChild(x));}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(k,fn){(this.listeners[k]||=[]).push(fn);}
 fire(k){for(const fn of this.listeners[k]||[])fn({target:this,preventDefault(){}});}
 removeChild(x){this.children=this.children.filter(v=>v!==x);x.parentNode=null;}
 get all(){return [this,...this.children.flatMap(x=>x.all)];}
 find(fn){return this.all.find(fn);}
 findAll(fn){return this.all.filter(fn);}
}
const doc={createElement(tag){return new Element(this,tag);}};
function mount(locale='ar',willSave=true){
 const host=new Element(doc,'main');
 let settings={sound:'wood-tap',volume:45,enabled:true},saves=0,previews=[],pauses=0;
 const engine={
  getSettings:()=>({...settings}),
  update:changes=>{if(!willSave)return false;settings={...settings,...changes};saves++;return true;},
  preview:id=>{previews.push(id);return Promise.resolve(true);},
  pause:()=>{pauses++;}
 };
 const ui=Alerts.mountCompletionAlertPicker(host,engine,{locale,
  translate:(key,fallback)=>Locales.translate(locale,key)||fallback});
 return {host,ui,get:()=>({...settings}),saves:()=>saves,previews,pauses:()=>pauses};
}
const cls=(n,s)=>n.className.split(/\s+/).includes(s);
test('Arabic completion picker is RTL, styled, with 5 independent preview controls',()=>{
 const a=mount('ar');
 const picker=a.host.find(n=>cls(n,'completion-alert-picker'));
 assert.ok(picker);assert.equal(picker.attributes.dir,'rtl');
 assert.ok(a.host.find(n=>n.tagName==='H3'&&n.textContent==='صوت انتهاء الوقت'));
 const rows=a.host.findAll(n=>cls(n,'completion-alert-option'));
 assert.equal(rows.length,6);
 assert.equal(a.host.findAll(n=>cls(n,'cap-preview')).length,5);
 assert.equal(rows[0].findAll(n=>n.tagName==='BUTTON').length,0,'Silence has no preview');
 const style=a.host.find(n=>n.tagName==='STYLE');
 assert.ok(style.textContent.includes('grid-template-columns:minmax(0,1fr) auto'));
 assert.ok(style.textContent.includes('max-width:340px'));
 assert.equal(a.host.find(n=>cls(n,'cap-volume-output')).textContent,'45%');
 assert.ok(a.host.find(n=>n.tagName==='INPUT'&&n.name==='completion-alert-choice'));
});
test('picker preview is independent from saved sound selection',()=>{
 const a=mount();
 const preview=a.host.find(n=>cls(n,'cap-preview'));
 preview.fire('click');assert.deepEqual(a.previews,['soft-bell']);
 assert.equal(a.get().sound,'wood-tap');assert.equal(a.saves(),0);
 const selected=a.host.findAll(n=>n.tagName==='INPUT'&&n.type==='radio').find(n=>n.value==='water-drop');
 selected.checked=true;selected.fire('change');
 assert.equal(a.get().sound,'water-drop');assert.equal(a.saves(),1);
});
test('range percentage previews 0–9 digits, but saves only on change',()=>{
 const a=mount();
 const slider=a.host.find(n=>n.tagName==='INPUT'&&n.type==='range');
 slider.value='62';slider.fire('input');assert.equal(a.host.find(n=>cls(n,'cap-volume-output')).textContent,'62%');
 assert.equal(a.saves(),0);
 slider.fire('change');assert.equal(a.saves(),1);assert.equal(a.get().volume,62);
 a.ui.unmount();assert.equal(a.host.children.length,0);assert.equal(a.pauses(),1);
});
test('failed durable write restores previous radio, volume, and checkbox UI state',()=>{
 const a=mount('ar',false);
 const volume=a.host.find(n=>n.tagName==='INPUT'&&n.type==='range');
 volume.value='99';volume.fire('change');
 assert.equal(volume.value,'45');assert.equal(a.get().volume,45);
 const checkbox=a.host.find(n=>n.tagName==='INPUT'&&n.type==='checkbox');
 checkbox.checked=false;checkbox.fire('change');assert.equal(checkbox.checked,true);
 const radio=a.host.findAll(n=>n.tagName==='INPUT'&&n.type==='radio').find(x=>x.value==='water-drop');
 radio.checked=true;radio.fire('change');
 assert.equal(radio.checked,false);assert.equal(a.get().sound,'wood-tap');
});
test('LTR picker uses localized English without moving radio/preview off-screen by source logic',()=>{
 const a=mount('en');
 assert.equal(a.host.find(n=>cls(n,'completion-alert-picker')).attributes.dir,'ltr');
 assert.ok(a.host.find(n=>n.tagName==='H3'&&n.textContent==='Completion sound'));
});
