'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const web=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const read=filename=>fs.readFileSync(path.join(web,filename),'utf8');
test('DF05: language switch reaches draft alert refresh through existing integration without app.js edits',()=>{
 const app=read('app.js'),integration=read('integration_v22.js'),notes=read('notes_editor_ui.js');
 assert.match(app,/DF22Integration\?\.refreshLocale/);
 assert.match(app,/DF22Integration\.refreshLocale\(\)/);
 assert.match(integration,/DeepFocusNotesEditorUI\.renderStack\(\)/);
 assert.match(notes,/if\s*\(typeof nsRefreshDraftLabels==='function'\)\s*nsRefreshDraftLabels\(\)/);
});
test('DF05: draft warnings retranslate for selected locale without mutating old draft',()=>{
 const c={cfg:{lang:'en'},Date,Number,JSON,localDateISO:()=> '2026-10-26',
  window:{addEventListener(){}},setTimeout(){},clearTimeout(){},
  document:{getElementById(id){return elements[id]||null;},addEventListener(){}}};
 const elements={
  nsDraftStatus:{dataset:{nsDraftStatus:'conflict'},textContent:''},
  nsDraftRestore:{textContent:'',hidden:false},
  nsDraftDiscard:{textContent:'',hidden:false}
 };
 vm.createContext(c);
 vm.runInContext(read('notes_drafts.js'),c,{timeout:1000});
 vm.runInContext('nsRefreshDraftLabels()',c,{timeout:1000});
 const english=elements.nsDraftStatus.textContent;
 c.cfg.lang='de';
 vm.runInContext('nsRefreshDraftLabels()',c,{timeout:1000});
 assert.notEqual(elements.nsDraftStatus.textContent,english);
 assert.ok(elements.nsDraftRestore.textContent);
 assert.ok(elements.nsDraftDiscard.textContent);
 assert.equal(elements.nsDraftStatus.dataset.nsDraftStatus,'conflict');
 c.cfg.lang='ar';
 vm.runInContext('nsRefreshDraftLabels()',c,{timeout:1000});
 assert.notEqual(elements.nsDraftStatus.textContent,english);
});
