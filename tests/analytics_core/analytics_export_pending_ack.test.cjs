'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');

function mountNativeExport(onExport) {
  const doc={createElement(tag) {
    return {
      tagName:tag.toUpperCase(), children:[], attributes:{}, style:{}, events:{},
      value:'', disabled:false, textContent:'', className:'', 
      setAttribute(k,v){this.attributes[k]=v;},
      getAttribute(k){return this.attributes[k];},
      addEventListener(k,fn){this.events[k]=fn;},
      appendChild(c){this.children.push(c);if(this.tagName==='SELECT'&&!this.value)this.value=c.value;return c;},
      replaceChildren(...cs){this.children=cs;},
      append(...cs){this.children.push(...cs);},
      remove(){this.removed=true;}
    };
  }};
  const host={ownerDocument:doc,appendChild(child){this.child=child;}};
  const instance=Studio.mount(host,()=>({cfg:{sessionHistory:[
    {id:'session-1',date:'2026-10-19',domain:'study',minutes:25,completed:true}
  ]},tasksList:[]}),{
    today:'2026-10-20',startDate:'2026-10-18',endDate:'2026-10-20',onExport
  });
  const filters=host.child.children.find(x=>x.className==='dfa-filters');
  const fields=filters.children.filter(x=>x.tagName==='LABEL').map(x=>x.children[0]);
  const button=filters.children.find(x=>x.tagName==='BUTTON');
  return {instance,button,start:fields[2],end:fields[3]};
}
test('native SAF callback cannot be submitted twice while unresolved',async()=>{
  let done, calls=0;
  const wait=new Promise(resolve=>{done=resolve;});
  const ui=mountNativeExport(()=>{calls++;return wait;});
  const first=ui.button.events.click();
  const second=ui.button.events.click();
  assert.equal(calls,1,'Only one OS picker may be active');
  assert.equal(ui.button.disabled,true,'Export control stays disabled while pending');
  done({status:'saved'});
  await Promise.all([first,second]);
  assert.equal(ui.button.disabled,false,'Valid range can export again');
  ui.instance.destroy();
});
test('late native receipt must not revive invalid range or allow another picker',async()=>{
  let done, calls=0;
  const wait=new Promise(resolve=>{done=resolve;});
  const ui=mountNativeExport(()=>{calls++;return wait;});
  const first=ui.button.events.click();
  ui.start.value='2030-01-01';
  ui.start.events.change();
  assert.equal(ui.button.disabled,true);
  done({status:'saved'});
  await first;
  assert.equal(ui.button.disabled,true,'Range invalidated during save remains blocked');
  await ui.button.events.click();
  assert.equal(calls,1);
  ui.instance.destroy();
});
test('native SAF failures remain retryable without data or range mutation',async()=>{
  let calls=0;
  const ui=mountNativeExport(async()=>{calls++;throw Error('DocumentsUI unavailable');});
  await ui.button.events.click();
  assert.equal(calls,1);
  assert.equal(ui.button.disabled,false,'Failure must unlock a still-valid range');
  await ui.button.events.click();
  assert.equal(calls,2);
  ui.instance.destroy();
});
