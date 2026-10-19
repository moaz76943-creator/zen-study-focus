'use strict';
const fs=require('node:fs'),path=require('node:path'),test=require('node:test'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const core=require('../../docs/control-center/studio-core.js');
test('Android UI imports the generated control-center style exactly once',()=>{
 const html=read('android/app/src/main/assets/web/index.html');
 assert.equal((html.match(/href="control_center_overrides\.css"/g)||[]).length,1);
 assert.ok(html.indexOf('href="control_center_overrides.css"')<html.indexOf('</head>'));
});
test('approved design JSON and packaged CSS always match',()=>{
 const design=JSON.parse(read('docs/control-center/design-config.json'));
 assert.equal(core.renderCSS(design),read('android/app/src/main/assets/web/control_center_overrides.css'));
});
test('dashboard uses separate scripts and all six actual screen selectors exist',()=>{
 const html=read('docs/control-center/index.html');
 const app=read('android/app/src/main/assets/web/index.html');
 assert.match(html,/studio-core\.js/);
 assert.match(html,/studio\.js/);
 for(const screen of Object.keys(core.SCREENS)){
  assert.ok(app.includes('id="sec-'+screen+'"'),'Missing '+screen+' app screen');
 }
});
test('owner authorization and draft PR guard are present in issue workflow',()=>{
 const workflow=read('.github/workflows/control_center_design_requests.yml');
 assert.match(workflow,/github\.event\.issue\.user\.login == github\.repository_owner/);
 assert.match(workflow,/draft:true/);
 assert.match(workflow,/designCore\.parseDesignIssue/);
 assert.doesNotMatch(workflow,/force: true|merge\(\s*\{|pulls\.merge/);
});
test('QA lanes do not run arbitrary shell command or write to the repository',()=>{
 const workflow=read('.github/workflows/control_center_agents.yml');
 assert.match(workflow,/contents: read/);
 assert.match(workflow,/Unsupported lane/);
 assert.doesNotMatch(workflow,/bash -c|eval "/);
});
