'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=path.resolve(__dirname,'../../android/app/src/main/java/com/zenstudy/focus/MainActivity.java');
const source=fs.readFileSync(file,'utf8');
test('WebView denies unrestricted local file reads and file-origin privilege expansion',()=>{
  assert.match(source,/settings\.setAllowFileAccess\(false\)/);
  assert.match(source,/settings\.setAllowFileAccessFromFileURLs\(false\)/);
  assert.match(source,/settings\.setAllowUniversalAccessFromFileURLs\(false\)/);
  assert.match(source,/settings\.setAllowContentAccess\(false\)/);
  assert.doesNotMatch(source,/settings\.setAllowFileAccess\(true\)/);
});
test('bundled offline application shell remains the entry point and JavaScript storage remains enabled',()=>{
  assert.match(source,/webView\.loadUrl\("file:\/\/\/android_asset\/web\/index\.html"\)/);
  assert.match(source,/settings\.setJavaScriptEnabled\(true\)/);
  assert.match(source,/settings\.setDomStorageEnabled\(true\)/);
});
