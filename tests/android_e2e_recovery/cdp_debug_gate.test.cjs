'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/java/com/zenstudy/focus/MainActivity.java'),'utf8');
test('WebView debugging is enabled ONLY for explicitly debuggable APKs',()=>{
  assert.match(src,/ApplicationInfo\.FLAG_DEBUGGABLE/);
  assert.match(src,/WebView\.setWebContentsDebuggingEnabled\(debuggableBuild\)/);
  assert.doesNotMatch(src,/WebView\.setWebContentsDebuggingEnabled\(true\)/);
  assert.doesNotMatch(src,/WebView\.setWebContentsDebuggingEnabled\(false\)/);
});
