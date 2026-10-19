'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const api = require(path.resolve(__dirname, '../../android/app/src/main/assets/web/numerals_ascii_v21.js'));
const EASTERN = /[\u0660-\u0669\u06f0-\u06f9]/;
const locales = ['en','ar','fa','ur','de','fr','es','zh','hi','ru','ja','tr','bn'];
function fakeElement(tag='SPAN', attributes={}, text='') {
  const attrs = {...attributes};
  return {
    tagName: tag.toUpperCase(), textContent:text, value:text, style:{}, childElementCount:0,
    getAttribute(name){return Object.hasOwn(attrs,name)?attrs[name]:null;},
    setAttribute(name,value){attrs[name]=String(value);},
    hasAttribute(name){return Object.hasOwn(attrs,name);},
    closest(){return null;},
    attrs
  };
}
test('DF-060/062: formatting forces Western digits in every relevant locale', () => {
  for(const locale of locales) for (const value of [0,9,10,25,100,1234,-2,0.75,100]) {
    const result=api.formatNumber(value,{locale});
    assert.doesNotMatch(result,EASTERN,locale + ' ' + value);
    assert.match(result,/[0-9]/,locale + ' ' + value);
  }
  assert.equal(api.formatNumber(1234,{locale:'ar'}),'1234');
  assert.equal(api.formatNumber(0.75,{locale:'fa'}),'0.75');
  assert.equal(api.formatPercent(100,{locale:'ur'}),'100%');
  assert.equal(api.toAsciiDigits('٠١٢٣٤٥٦٧٨٩ ۰۱۲۳۴۵۶۷۸۹'),'0123456789 0123456789');
});
test('DF-062: unsupported locales and missing Intl formatters fall back safely', () => {
  assert.equal(api.formatNumber(1234.5,{locale:'invalid_locale!!'}),'1234.5');
  const original = Intl.NumberFormat;
  try {
    Intl.NumberFormat=class {format(){return '١٬٢٣٤٫٥';}};
    assert.doesNotMatch(api.formatNumber(1234.5,{locale:'ar'}),EASTERN);
  } finally { Intl.NumberFormat=original; }
});
test('DF-061/067: zero-padded timer, rounds and metrics', () => {
  assert.equal(api.formatTimer(5),'00:05');
  assert.equal(api.formatTimer(125),'02:05');
  assert.equal(api.formatTimer(3605),'60:05');
  assert.equal(api.formatTimer(3605,{hours:true}),'01:00:05');
  assert.equal(api.formatNumber(3,{locale:'ar'}),'3');
  assert.throws(()=>api.formatTimer(-2),RangeError);
  assert.throws(()=>api.formatNumber(Infinity),RangeError);
});
test('DF-061/067: ISO date keys unchanged, rendered dates always latn', () => {
  assert.equal(api.isoDate('2026-10-19'),'2026-10-19');
  for(const locale of locales) {
    const formatted=api.formatDateLabel('2026-10-19',{locale});
    assert.doesNotMatch(formatted,EASTERN,locale);
    assert.match(formatted,/2026/,locale);
  }
  assert.throws(()=>api.isoDate('2026-02-30'),RangeError);
  assert.throws(()=>api.isoDate('۲۰۲۶-۱۰-۱۹'),RangeError);
});
test('DF-065: generated numeric nodes receive LTR isolation',()=>{
  const node=fakeElement('STRONG');
  api.renderNumber(node,-2,{locale:'ar'});
  assert.equal(node.textContent,'-2');
  assert.equal(node.attrs.dir,'ltr');
  assert.equal(node.style.unicodeBidi,'isolate');
  assert.equal(node.attrs['data-df-generated-number'],'');
  assert.equal(node.attrs['data-df-raw-number'],'-2');
});
test('DF-064/066: marked DOM and SVG only, never user-authored content',()=>{
  const numeric=fakeElement('span',{'data-df-generated-number':'','data-df-raw-number':'1234'},'١٢٣٤');
  const svg=fakeElement('text',{'data-df-generated-number':''},'٢٥%');
  const tick=fakeElement('title',{'data-df-generated-number':'','aria-label':'جلسات ۱۲'},'الوقت ١٢');
  const note=fakeElement('textarea',{},'ملاحظتي ١٢٣');
  const task=fakeElement('span',{'data-df-user-content':''},'Task ۷');
  const root={querySelectorAll(selector){assert.equal(selector,'[data-df-generated-number]');return [numeric,svg,tick,note,task];}};
  const converted=api.refresh(root,{locale:'fa'});
  assert.equal(converted,3);
  assert.equal(numeric.textContent,'1234');
  assert.equal(svg.textContent,'25%');
  assert.equal(tick.textContent,'الوقت 12');
  assert.equal(tick.attrs['aria-label'],'جلسات 12');
  assert.equal(note.textContent,'ملاحظتي ١٢٣');
  assert.equal(task.textContent,'Task ۷');
});
test('DF-063/064: numeric inputs opt in; notes, titles and backups are untouched',()=>{
  const numeric=fakeElement('input',{'data-df-numeric-input':''},'۱۲٫۵');
  const note=fakeElement('textarea',{},'١٢ مخزنة');
  const task=fakeElement('input',{},'عنوان ۱۲');
  assert.equal(api.normalizeNumericInput(numeric),true);
  assert.equal(numeric.value,'12.5');
  assert.equal(numeric.attrs.dir,'ltr');
  assert.equal(api.normalizeNumericInput(note),false);
  assert.equal(api.normalizeNumericInput(task),false);
  assert.equal(note.value,'١٢ مخزنة');
  assert.equal(task.value,'عنوان ۱۲');
});
test('DF-064/068: invariant CSV numeric/date fields, original free-text digits retained',()=>{
  const rows=[{id:25,minutes:0.75,date:'2026-10-19',title:'تعلم ١٢',note:'Hello, "World"\n۱۲۳'}];
  const old=JSON.stringify(rows);
  const csv=api.serializeCsv(rows,[{key:'id',kind:'number'},{key:'minutes',kind:'number'},{key:'date',kind:'date'},{key:'title',kind:'text'},{key:'note',kind:'text'}]);
  assert.ok(csv.startsWith('id,minutes,date,title,note\r\n25,0.75,2026-10-19,'));
  assert.ok(csv.includes('تعلم ١٢'));
  assert.ok(csv.includes('"Hello, ""World""\n۱۲۳"'));
  assert.equal(JSON.stringify(rows),old);
});
test('DF-068: malformed exports rejected, no locale conversion of text columns',()=>{
  assert.throws(()=>api.serializeCsv([{minutes:'١٢'}],[{key:'minutes',kind:'number'}]),TypeError);
  assert.throws(()=>api.serializeCsv([{date:'2026-02-30'}],[{key:'date',kind:'date'}]),RangeError);
});
test('DF-069: rerender uses live state values on locale switch and restore',()=>{
  const el=fakeElement('output');
  api.renderNumber(el,9,{locale:'en'});
  el.setAttribute('data-df-raw-number','۲۵');
  api.refresh({querySelectorAll(){return [el];}},{locale:'ar'});
  assert.equal(el.textContent,'25');
  el.setAttribute('data-df-raw-number','100');
  api.refresh({querySelectorAll(){return [el];}},{locale:'ur'});
  assert.equal(el.textContent,'100');
  assert.equal(el.attrs.dir,'ltr');
});
test('DF-063/069: focused numeric listener is attached only once',()=>{
  let listeners=[];
  const input=fakeElement('input',{'data-df-numeric-input':''},'١٢');
  input.addEventListener=(name,fn)=>listeners.push({name,fn});
  const scope={querySelectorAll(selector){assert.equal(selector,'input[data-df-numeric-input]');return [input];}};
  assert.equal(api.wireNumericInputs(scope),1);
  assert.equal(input.value,'12');
  assert.equal(api.wireNumericInputs(scope),0);
  assert.equal(listeners.length,1);
  input.value='۱۰۰';listeners[0].fn();assert.equal(input.value,'100');
});
test('DF-064: a container with descendants never loses nested user data',()=>{
  const container=fakeElement('DIV',{'data-df-generated-number':''},'٩');
  container.childElementCount=1;
  assert.equal(api.refresh({querySelectorAll(){return [container];}}),0);
  assert.equal(container.textContent,'٩');
});
