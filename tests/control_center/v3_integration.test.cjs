'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('docs/control-center/index.html');
const ui=read('docs/control-center/v3-ui.js');
const base=read('docs/control-center/control-center.js');
const studio=read('docs/control-center/studio.js');
const css=read('docs/control-center/v3.css');
const manifest=require('../../docs/control-center/feature-manifest-v3.json');
test('v3 manifest contains exactly 20 unique tested feature IDs',()=>{
 assert.equal(manifest.schema_version,1);
 assert.equal(manifest.features.length,20);
 assert.equal(new Set(manifest.features.map(f=>f.id)).size,20);
 for(let i=1;i<=20;i++){
  const id='F'+String(i).padStart(2,'0');
  assert.ok(manifest.features.some(f=>f.id===id),id);
 }
});
test('all interactive workbench controls exist with unique HTML IDs',()=>{
 const controls=['v3-workbench','v3-search','v3-search-results','v3-task-view','v3-task-sort','v3-task-export',
 'v3-task-results','v3-area-metrics','v3-ci-trend','v3-ci-failures','v3-pr-filter','v3-pr-search',
 'v3-prs','v3-release-gates','v3-risk-filter','v3-audit-freshness','v3-risks','v3-snapshot-import',
 'v3-snapshot-result','v3-use-offline','v3-return-live','v3-offline-state','v3-theme-preset','v3-undo','v3-redo','v3-reset-screen','v3-design-import','v3-design-diff','v3-design-status','v3-draft-save','v3-draft-restore','v3-draft-clear','v3-draft-status'];
 for(const name of controls)assert.equal((html.match(new RegExp('id="'+name+'"','g'))||[]).length,1,'Control '+name);
});
test('script ordering ensures both existing read-only bridges before v3 boot',()=>{
 const order=['control-center.js','studio-core.js','studio.js','v3-core.js','v3-ui.js'];
 const positions=order.map(name=>html.indexOf('src="./'+name+'"'));
 assert.ok(positions.every(x=>x>0));
 assert.deepEqual(positions,positions.slice().sort((a,b)=>a-b));
 assert.match(base,/getSnapshot/);assert.match(base,/df:project-refreshed/);
 assert.match(studio,/getState/);assert.match(studio,/df:studio-changed/);
});
test('query results use safe DOM creation not innerHTML or remote writes',()=>{
 assert.doesNotMatch(ui,/\.innerHTML\s*=|document\.write\(|\beval\s*\(|github\.rest\.issues\.create/);
 assert.match(ui,/textContent/);
 assert.doesNotMatch(ui,/\bfetch\s*\(/);
 assert.match(base,/credentials:'omit'/);
 assert.match(ui,/cleanUrl/);
});
test('imports are capped and require valid model before replacing design',()=>{
 assert.match(ui,/file\.size>20000/);
 assert.match(ui,/ops\.importConfig\(await file\.text\(\)\)/);
 assert.match(ui,/studio\.applyConfig\(next\)/);
});
test('all workflow-lifecycle and release-critical data actions remain outside v3',()=>{
 assert.doesNotMatch(ui,/zen_fortress_cfg_v21|ZEN21::|signingConfig|updateRef|forcePush/);
 assert.match(ui,/df_control_center_design_draft_v1/);
 assert.doesNotMatch(ui,/setItem\s*\(\s*['"](?:zen_|ZEN)/);
 assert.match(html,/لا توجد خاصية هنا تُغيّر بيانات مستخدمي التطبيق/);
});
test('mobile controls and focus affordances retain responsive layout',()=>{
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.v3-grid/);
 assert.match(css,/\.v3-results/);
});
