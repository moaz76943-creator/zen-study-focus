'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const UI = require('../../android/app/src/main/assets/web/analytics_recovery_ui.js');
const AR = require('../../android/app/src/main/assets/web/analytics_recovery_ar_locale.js');
const source = readFileSync(join(__dirname,'../../android/app/src/main/assets/web/analytics_recovery_ui.js'),'utf8');

function documentFixture(){
  const doc={createElement(tag){
    return {tagName:tag.toUpperCase(),children:[],events:{},attributes:{},style:{},value:'',
      setAttribute(k,v){this.attributes[k]=v;},
      getAttribute(k){return this.attributes[k];},
      addEventListener(k,fn){this.events[k]=fn;},
      appendChild(child){this.children.push(child);if(this.tagName==='SELECT'&&!this.value)this.value=child.value;return child;},
      append(...nodes){for(const n of nodes)this.appendChild(n);},
      replaceChildren(...nodes){this.children=[];this.append(...nodes);},
      remove(){this.removed=true;}
    };
  }};
  return {ownerDocument:doc,children:[],appendChild(x){this.children.push(x);}};
}
test('Arabic analytics has a real translation for every visible studio label',()=>{
  const match=source.match(/const fallback=Object[.]freeze[(]({[^]*?})[)];/);
  assert.ok(match,'Analytics fallback key registry must be found');
  const fallback=Function('return ('+match[1]+')')();
  assert.deepEqual(Object.keys(AR.labels).sort(),Object.keys(fallback).sort());
  for(const key of Object.keys(fallback)){
    const value=AR.translate('analyticsRecovery.'+key,'ar');
    assert.equal(typeof value,'string',key);
    assert.ok(value.trim(),key);
    assert.notEqual(value,fallback[key],key+' should not fall back to English');
  }
  assert.equal(AR.translate('analyticsRecovery.saved','de'),null);
  assert.equal(AR.translate('untrusted.key','ar'),null);
});
test('Arabic recorded analytics mounts RTL with true data and localized chart tooltips',()=>{
  const ui=UI.mount(documentFixture(),()=>({sessionHistory:[
    {id:12,date:'2026-10-19',minutes:25,domain:'study'}
  ]}),{locale:'ar',today:'2026-10-19',translate:AR.translate});
  const wrapper=ui.element;
  assert.equal(wrapper.dir,'rtl');
  assert.equal(wrapper.children[0].textContent,'تحليلات النشاط المسجّل');
  assert.equal(ui.getReport().totals.minutes,25);
  const chart=wrapper.children[7].innerHTML;
  assert.ok(chart.includes('الدقائق المسجّلة'));
  assert.equal(chart.includes(' sessions'),false);
  assert.equal(chart.includes(' min |'),false);
  assert.equal(/[\u0660-\u0669\u06f0-\u06f9]/.test(chart),false);
  ui.destroy();
});
test('shared integration loads Arabic dictionary before activating analytics UI',()=>{
  const web=join(__dirname,'../../android/app/src/main/assets/web');
  const html=readFileSync(join(web,'index.html'),'utf8');
  const integrated=readFileSync(join(web,'integration_v22.js'),'utf8');
  assert.ok(html.indexOf('analytics_recovery_ui.js')<html.indexOf('analytics_recovery_ar_locale.js'));
  assert.ok(html.indexOf('analytics_recovery_ar_locale.js')<html.indexOf('integration_v22.js'));
  assert.ok(integrated.includes('root.DeepFocusAnalyticsArabic.translate'));
  assert.ok(integrated.includes("cfg.lang==='ar'"));
});
