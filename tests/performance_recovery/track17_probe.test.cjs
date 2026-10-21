'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
test('Android probe source parses after nested template-literal decoding, not only as outer Node JS',()=>{
  const source=fs.readFileSync(path.join(__dirname,'track17_webview_probe.cjs'),'utf8');
  const match=source.match(/const js=(`[\s\S]*?`);\nlet record=/u);
  assert.ok(match,'One complete bounded WebView expression must be present');
  const runtimeExpression=Function('return '+match[1])();
  new vm.Script(runtimeExpression,{filename:'track17-cdp-expression'});
  assert.match(runtimeExpression,/5000/);
  assert.match(runtimeExpression,/10000/);
  assert.match(runtimeExpression,/file:\/\/\/android_asset\/web\/index\.html/);
});
