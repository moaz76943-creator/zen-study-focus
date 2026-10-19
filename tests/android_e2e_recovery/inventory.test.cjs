'use strict';
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const scan=require('./inventory.cjs');

test('inventory identifies click, change, submit and data entry, without calling them E2E passes',()=>{
 const sample = '<main id="sec-tasks"><button id="add" onclick="createNewTask()" aria-label="Add">+</button>'+
  '<input id="t" placeholder="Task title" onkeydown="createNewTask()">'+
  '<div role="button" onclick="openModal()">Hi</div></main>';
 const r=scan.inventory(sample,{"custom.js":"a.addEventListener('click', fn);\nb.addEventListener('submit', fn)"});
 assert.equal(r.controls.length,3);
 assert.equal(r.dynamic.length,2);
 assert.equal(r.controls[0].id,'add');
 assert.equal(r.controls[0].owner,'sec-tasks');
 assert.match(r.controls[0].expected,/persists/);
 for(const control of r.controls)assert.equal(control.androidStatus,'NOT_TESTED');
});
test('live PR25 source has all seven main navigation buttons and note save controls',()=>{
 const report=scan.build();
 const controls=report.controls;
 for(const id of ['navTasks','navCalendar','navNotes','navTimer','navTraining','navSounds',
                   'navAnalytics','nsNewButton','nsSaveButton','mainPlayBtn','nsExport']){
  assert.ok(controls.some(x=>x.id===id),'missing inventoried control '+id);
 }
 assert.equal(report.missingScripts.length,0);
 assert.ok(report.totals.dynamicEventListeners>0);
 assert.ok(report.totals.staticControls>50);
 assert.equal(report.androidE2EPassed,0,'static inventory must not claim passing device checks');
});
test('every inline clickable handler appears in read-only inventory',()=>{
 const root=path.resolve(__dirname,'../../android/app/src/main/assets/web/index.html');
 const html=fs.readFileSync(root,'utf8');
 const num=[...html.matchAll(/\bonclick\s*=\s*["']/gi)].length;
 const report=scan.build();
 const found=report.controls.reduce((n,x)=>n+x.handlers.filter(y=>y[0]==='click').length,0);
 assert.equal(found,num);
});
