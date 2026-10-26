'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Picker=require('../../android/app/src/main/assets/web/js/completion_tone_picker.js');

class Element {
  constructor(tag) {
    this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.attributes={};
    this.dataset={};this.checked=false;this.value='';this.textContent='';
  }
  appendChild(child){this.children.push(child);return child;}
  replaceChildren(...children){this.children=[...children];}
  setAttribute(name,value){this.attributes[name]=String(value);}
  addEventListener(event,handler){(this.listeners[event]||=[]).push(handler);}
  emit(event){for(const fn of this.listeners[event]||[])fn({target:this});}
  get descendants(){return [this,...this.children.flatMap(child=>child.descendants)];}
  querySelectorAll(selector) {
    if(selector==='input[name="df-completion-tone-choice"]') {
      return this.descendants.filter(el=>el.tagName==='INPUT'&&el.name==='df-completion-tone-choice');
    }
    throw new Error('Unexpected selector: '+selector);
  }
}

test('a failed second save restores the last successfully persisted completion tone',()=>{
  let value='zen_bell',fail=false;
  globalThis.localStorage={
    getItem(key){assert.equal(key,'df_end_tone');return value;},
    setItem(key,next){assert.equal(key,'df_end_tone');if(fail)throw new Error('storage quota');value=next;}
  };
  const host=new Element('div');
  const doc={documentElement:{lang:'ar'},getElementById:id=>id==='completionAlertPickerHost'?host:null,
    createElement:tag=>new Element(tag)};
  try {
    assert.equal(Picker.render(doc),true);
    const radios=()=>host.querySelectorAll('input[name="df-completion-tone-choice"]');
    const saved=radios().find(x=>x.value==='woodblock');
    saved.checked=true;saved.emit('change');
    assert.equal(value,'woodblock');
    fail=true;
    const rejected=radios().find(x=>x.value==='crystal');
    rejected.checked=true;rejected.emit('change');
    assert.equal(value,'woodblock','storage must stay at last successful choice');
    assert.deepEqual(radios().filter(x=>x.checked).map(x=>x.value),['woodblock'],
      'visible selection must match the last successfully saved preference');
  } finally {delete globalThis.localStorage;}
});
