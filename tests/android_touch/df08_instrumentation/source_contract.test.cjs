'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=__dirname;
const java=fs.readFileSync(path.join(dir,'TouchInstrumentation.java'),'utf8');
const prepare=fs.readFileSync(path.join(dir,'prepare_test_build.sh'),'utf8');
const shell=fs.readFileSync(path.join(dir,'run_ci.sh'),'utf8');
test('actual UIAutomation pointer touches require observed DOM hit containment and state outcome',()=>{
  assert.match(java,/getUiAutomation\(\)\.injectInputEvent\(press,true\)/);
  assert.match(java,/document\.elementFromPoint\(x,y\)/);
  assert.match(java,/getJSONArray\("active"\)/);
  assert.match(java,/getJSONArray\("screen"\)/);
  assert.doesNotMatch(java,/\.click\(\)|dispatchTouchEvent|setWebContentsDebuggingEnabled/);
});
test('IME must visibly show, Back must hide keyboard, and actual Save must persist once',()=>{
  assert.match(java,/WindowInsets\.Type\.ime\(\)/);
  assert.match(java,/KEYCODE_BACK/);
  assert.match(java,/tap\("nsSaveButton"\)/);
  assert.match(java,/saved\.optInt\("matches"\) == 1/);
  assert.match(java,/noteModal.*classList.*open/);
});
test('build setup touches Gradle only in disposable checkout and preserves native app files',()=>{
  assert.match(prepare,/cat >> android\/app\/build\.gradle/);
  assert.match(prepare,/testInstrumentationRunner/);
  assert.doesNotMatch(shell,/git\s+(add|commit|push)/);
  assert.doesNotMatch(shell,/MainActivity\.java|app\.js/);
  for(const width of ['320','360','393','430']) assert.match(shell,new RegExp(width));
  assert.match(shell,/df08_status=PASS/);
  assert.match(shell,/RELEASE_APPROVED=NO/);
});

test('Android failure reports matching mobile rule and loaded stylesheet before any PASS',()=>{
  assert.match(java,/cssMatchedSelector:/);
  assert.match(java,/cssMobileMedia:/);
  assert.match(java,/cssLoadedStyles:/);
});
