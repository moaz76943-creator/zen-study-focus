'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const policy=require('./cdp_result_policy.cjs');
const workflow=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/verify_rescue_webview.yml'),'utf8');
const harness=fs.readFileSync(path.resolve(__dirname,'cdp_actions.cjs'),'utf8');

test('actual Android run does not silently test a synthetic pull request merge commit',()=>{
 assert.match(workflow,/ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
 assert.match(workflow,/test "\$actual" = "\$expected"/);
});
test('a failed navigation or app fixture prevents misleading persistence failure',()=>{
 const r=new Map([['notes_create_edit',{status:'FAIL'}],['tasks_create',{status:'PASS'}]]);
 const block=policy.prerequisiteBlock(r,['notes_create_edit','tasks_create']);
 assert.equal(block.status,'NOT_TESTED');
 assert.match(block.detail,/notes_create_edit/);
 r.get('notes_create_edit').status='PASS';
 assert.equal(policy.prerequisiteBlock(r,['notes_create_edit','tasks_create']),null);
});
test('CDP timeout remains NOT_TESTED while a verifiable app assertion remains FAIL',()=>{
 assert.equal(policy.classifyError(new Error('TRANSPORT: Input.dispatchTouchEvent timed out')),'NOT_TESTED');
 assert.equal(policy.classifyError(new Error('Matching active section failed')),'FAIL');
});
test('per-step navigation evidence identifies the actual failing button',()=>{
 assert.match(harness,/Navigation failed at \$\{id\}/);
 assert.match(harness,/currentActiveSection/);
 assert.match(harness,/prerequisiteBlock\(results,\['notes_create_edit','tasks_create'\]\)/);
});

test('API30 source artifact names and CDP JSON must identify the checked out head SHA',()=>{
 assert.match(workflow,/DF_TEST_SOURCE_SHA/);
 assert.match(harness,/sha:process\.env\.DF_TEST_SOURCE_SHA\|\|null/);
 assert.doesNotMatch(harness,/sha:process\.env\.GITHUB_SHA\|\|null/);
});
