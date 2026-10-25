'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const app = fs.readFileSync(path.join(root,'android/app/src/main/assets/web/app.js'),'utf8');
const main = fs.readFileSync(path.join(root,'android/app/src/main/java/com/zenstudy/focus/MainActivity.java'),'utf8');
test('untrusted user text is escaped before legacy task/note HTML interpolation',()=>{
  const start = app.indexOf('function escapeHtmlText(value) {');
  assert.ok(start>=0, 'render-safe encoder required');
  const end = app.indexOf('\n}',start);
  assert.ok(end>start, 'encoder function boundary required');
  const escape = vm.runInNewContext(app.slice(start,end+2)+'\nescapeHtmlText;', {});
  const encoded = escape('<img src=x onerror="alert(1)"> & quoted');
  assert.ok(!encoded.includes('<') && !encoded.includes('>'));
  assert.ok(encoded.includes('&lt;img') && encoded.includes('&amp;'));
  assert.ok(app.includes("escapeHtmlText(String(t.title || ''))"));
  assert.ok(app.includes("escapeHtmlText(String(n.body || ''))"));
});
test('WebView privilege restriction is retained at current source',()=>{
  for(const k of ['setAllowFileAccess(false)','setAllowContentAccess(false)','setAllowFileAccessFromFileURLs(false)','setAllowUniversalAccessFromFileURLs(false)','setWebContentsDebuggingEnabled(false)']){
    assert.ok(main.includes(k),'missing WebView restriction: '+k);
  }
});
test('native share uses an ACTION_SEND text-only chooser, not an implicit URI execution',()=>{
  const start=main.indexOf('public void shareAppInvite(String statsSummary)');
  assert.ok(start>=0);
  const end=main.indexOf('@JavascriptInterface',start+20);
  const method=main.slice(start,end);
  assert.ok(method.includes('Intent.ACTION_SEND'));
  assert.ok(method.includes('text/plain'));
  assert.ok(method.includes('Intent.EXTRA_TEXT'));
  assert.ok(method.includes('Intent.createChooser'));
  assert.ok(!method.includes('Intent.ACTION_VIEW'));
});
