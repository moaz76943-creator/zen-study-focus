'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const java=fs.readFileSync(path.resolve(__dirname,
  '../../android/app/src/main/java/com/zenstudy/focus/MainActivity.java'),'utf8');

test('WebView denies unrestricted local filesystem access',()=>{
  assert.match(java,/settings\.setAllowFileAccess\(false\);/);
  assert.doesNotMatch(java,/settings\.setAllowFileAccess\(true\);/);
  assert.match(java,/settings\.setAllowFileAccessFromFileURLs\(false\);/);
  assert.match(java,/settings\.setAllowUniversalAccessFromFileURLs\(false\);/);
  assert.match(java,/settings\.setAllowContentAccess\(false\);/);
});

test('existing bundled android_asset entrypoint stays referenced',()=>{
  assert.match(java,/file:\/\/\/android_asset\/web\/index\.html/);
  assert.match(java,/settings\.setJavaScriptEnabled\(true\);/);
  assert.match(java,/settings\.setDomStorageEnabled\(true\);/);
});
