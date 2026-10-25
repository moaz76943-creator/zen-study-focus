'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.resolve(
  __dirname,'../android/app/src/main/assets/web'
);

const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const premium=fs.readFileSync(
  path.join(root,'locale_premium_v22.js'),'utf8'
);

test('Quick training follows existing translations',()=>{
  const win={};
  vm.runInNewContext(premium,{window:win});

  const start=app.indexOf(
    "  const tn = document.getElementById('navTrainingText');"
  );
  const stop=app.indexOf(
    '  if (typeof refreshTimerSettings',start
  );

  assert.ok(start>=0 && stop>start);
  const snippet=app.slice(start,stop);

  for(const locale of Object.keys(win.DF22Locale.translations)){
    const el={textContent:'OLD'};
    const button={attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
    const document={
      getElementById(id){
        assert.ok(['navTrainingText','navTraining'].includes(id));
        return id==='navTrainingText'?el:button;
      }
    };

    vm.runInNewContext(
      'const meta={code:'+JSON.stringify(locale)+'};\n'+snippet,
      {document,window:win}
    );

    assert.equal(
      el.textContent,
      win.DF22Locale.t(locale,'quickTraining'),
      locale
    );
    assert.equal(button.attrs['aria-label'],el.textContent,locale+' accessible training label');
  }
});

test('No external Google Fonts dependency',()=>{
  assert.doesNotMatch(
    html,/https:\/\/fonts\.(?:googleapis|gstatic)\.com/
  );
  assert.match(html,/font-family:\s*system-ui/);
});

test('RTL writing and accessibility zoom',()=>{
  assert.doesNotMatch(
    html,/input,\s*textarea\s*\{[^}]*direction:\s*ltr/
  );

  assert.match(
    html,/<textarea\b[^>]*\bid="inpNoteBody"[^>]*\bdir="auto"/
  );

  assert.match(
    html,/<input\b[^>]*\bid="inpNoteTitle"[^>]*\bdir="auto"/
  );

  assert.doesNotMatch(html,/user-scalable=no/);
  assert.doesNotMatch(html,/maximum-scale=1\.0/);
});
