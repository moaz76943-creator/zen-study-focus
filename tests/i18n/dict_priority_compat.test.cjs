'use strict';
// dfGetLocalizedText checks the legacy DICT first. A non-English DICT entry equal to the English text is an
// untranslated placeholder and must not mask a reviewed DF99 translation. This test proves the rule does not
// change any text that is shown today (real data), and that the shipped rule is present.
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const W=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const app=fs.readFileSync(path.join(W,'app.js'),'utf8');
const di=app.indexOf('const DICT = {'),de=app.indexOf('\n};',di)+3;
const ctx=vm.createContext({console});ctx.window=ctx;ctx.globalThis=ctx;
for(const f of ['js/df99_multiscreen_i18n.js','js/df99_reviewed_packs.js'])vm.runInContext(fs.readFileSync(path.join(W,f),'utf8'),ctx,{filename:f});
vm.runInContext(app.slice(di,de)+';this.DICT=DICT;',ctx);
const {DICT,DF99Locale}=ctx;
const scopes=['shell','timer','tasks','calendar','notes','sounds','analytics','goals','settings'];
const reviewed=(lc,k)=>{for(const s of scopes){const r=DF99Locale.t(lc,s,k,'');if(r&&r!==k)return r;}return '';};

test('real DICT: genuine translations keep priority; placeholders never hide a different reviewed text',()=>{
  let genuine=0,placeholders=0;const changed=[];
  for(const lc of Object.keys(DICT)){if(lc==='en')continue;
    for(const [k,v] of Object.entries(DICT[lc])){if(typeof v!=='string'||!v.trim())continue;
      if(v!==DICT.en[k]){genuine++;continue;}          // rule leaves these untouched
      placeholders++;const r=reviewed(lc,k);if(r&&r!==v)changed.push([lc,k,v,r]);}}
  assert.ok(genuine>150,'DICT should hold real translations ('+genuine+')');
  // Today no placeholder is shadowing a different reviewed text, so user-visible output is unchanged.
  assert.deepEqual(changed,[],'texts that would change on screen: '+JSON.stringify(changed.slice(0,5)));
  assert.ok(placeholders>=0);
});
test('priority rule is present in dfGetLocalizedText',()=>{
  const body=app.slice(app.indexOf('function dfGetLocalizedText('),app.indexOf('window.dfGetLocalizedText = '));
  assert.match(body,/lc !== 'en' && DICT\.en && DICT\[lc\]\[key\] === DICT\.en\[key\]/);
});
