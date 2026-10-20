'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {validateTouchTarget,missingPrerequisites}=require('../../tests/android_e2e_recovery/cdp_touch_target.cjs');
test('real visible intersecting target with top hit belonging to target can be touched',()=>{
 assert.deepEqual(validateTouchTarget({present:true,width:44,height:54,x:121,y:729,viewportWidth:393,viewportHeight:800,hitWithin:true,selector:'#navTasks'}),{x:121,y:729});
});
test('offscreen bottom navigation may have positive size but must not dispatch touch',()=>{
 assert.throws(()=>validateTouchTarget({present:true,width:44,height:54,x:510,y:729,viewportWidth:393,viewportHeight:800,hitWithin:false,selector:'#navTasks'}),/OUTSIDE_VIEWPORT/);
});
test('overlay that intercepts click reports actual obstruction instead of false navigation app result',()=>{
 assert.throws(()=>validateTouchTarget({present:true,width:44,height:54,x:121,y:729,viewportWidth:393,viewportHeight:800,hitWithin:false,selector:'#navNotes',hit:'div#startup-dialog'}),/OCCLUDED.*startup-dialog/);
});
test('hidden task form cannot be touched just because CSS selector exists',()=>{
 assert.throws(()=>validateTouchTarget({present:true,width:0,height:0,x:121,y:729,viewportWidth:393,viewportHeight:800,hitWithin:false,selector:'.df-quick input'}),/ZERO_SIZE/);
});
test('missing selectors and non-finite viewport coordinates fail before input dispatch',()=>{
 assert.throws(()=>validateTouchTarget({present:false,selector:'#unknown'}),/MISSING/);
 assert.throws(()=>validateTouchTarget({present:true,width:10,height:10,x:NaN,y:0,viewportWidth:393,viewportHeight:800,hitWithin:true}),/INVALID_GEOMETRY/);
});
test('restart check cannot claim app failure if note or task fixture was never created',()=>{
 const statuses=new Map([['notes_create_edit',{status:'FAIL'}],['tasks_create',{status:'FAIL'}]]);
 assert.deepEqual(missingPrerequisites(statuses,['notes_create_edit','tasks_create']),['notes_create_edit','tasks_create']);
 statuses.set('notes_create_edit',{status:'PASS'});statuses.set('tasks_create',{status:'PASS'});
 assert.deepEqual(missingPrerequisites(statuses,['notes_create_edit','tasks_create']),[]);
});
test('failure cause distinguishes app assertions, protocol rejection, unmet prerequisites and unknown infrastructure',()=>{
 const {classifyFailure}=require('./cdp_touch_target.cjs');
 assert.equal(classifyFailure(new assert.AssertionError({message:'Actual task not persisted'})),'FAIL_APP');
 assert.equal(classifyFailure(new Error('UI_TARGET_OCCLUDED: #navNotes')),'FAIL_APP');
 assert.equal(classifyFailure(new Error('TRANSPORT: Runtime.evaluate timed out')),'FAIL_TEST_TRANSPORT');
 assert.equal(classifyFailure(new Error('TEST_PROTOCOL: unknown method')),'FAIL_TEST_TRANSPORT');
 assert.equal(classifyFailure(new Error('APP_RUNTIME: TypeError in mounted application')),'FAIL_APP');
 assert.equal(classifyFailure(new Error('DEPENDENCY_NOT_TESTED: task creation')),'BLOCKED');
 assert.equal(classifyFailure(new Error('TEST_EVALUATION: injected expression failed')),'FAIL_TEST_INFRA');
 assert.equal(classifyFailure(new Error('unclassified runner failure')),'FAIL_TEST_INFRA');
});
test('focused diagnostics keep the full case registry and reject unknown or duplicate selections',()=>{
 const {selectCases}=require('./cdp_touch_target.cjs'),known=['preflight','tasks_create','task_subtasks'];
 assert.equal(selectCases('',known),null);
 assert.deepEqual([...selectCases('preflight, tasks_create,task_subtasks',known)],known);
 assert.throws(()=>selectCases('not_a_case',known),/Unknown/);
 assert.throws(()=>selectCases('preflight,preflight',known),/Duplicate/);
});
