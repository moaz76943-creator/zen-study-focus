'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const j=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/java/com/zenstudy/focus/MainActivity.java'),'utf8');
const helper=path.resolve(__dirname,'../../android/app/src/main/java/com/zenstudy/focus/FocusAppWebChromeClient.java');
const source=fs.existsSync(helper)?fs.readFileSync(helper,'utf8'):'';
const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const integration=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/integration_v22.js'),'utf8');

test('P0 WebView host replaces raw browser-native dialogs for ALL synchronous JS dialog types',()=>{
 assert.match(j,/appDialogs\s*=\s*new FocusAppWebChromeClient\(this\)/);
 assert.match(j,/setWebChromeClient\(appDialogs\)/);
 for(const method of ['onJsConfirm','onJsAlert','onJsPrompt']){
  assert.match(source,new RegExp('boolean\\s+'+method+'\\s*\\('),method);
 }
 assert.match(source,/androidx\.appcompat\.app\.AlertDialog/);
 assert.match(source,/setTitle\(["']Deep Focus["']\)/);
 assert.doesNotMatch(source,/setTitle\(url\)|setMessage\(url\)|new WebChromeClient\(\)/);
});
test('native dialog host must return complete JS results, Cancel/Back is never implicit confirmation',()=>{
 assert.match(source,/result\.confirm\(\)/,'confirm/alert accepted');
 assert.match(source,/\(\(JsPromptResult\) result\)\.confirm\(input\.getText\(\)\.toString\(\)\)/,'prompt accepted text preserved');
 assert.match(source,/result\.cancel\(\)/,'cancel/back never approves destructive operations');
 assert.match(source,/setNegativeButton\(android\.R\.string\.cancel/);
 assert.match(source,/setOnCancelListener\(/);
 assert.match(source,/setOnDismissListener\(/);
 assert.match(source,/AtomicBoolean|compareAndSet/,'resolve each JsResult at most once');
 assert.match(source,/cancelPending\(/,'activity must cancel pending dialogs on destroy');
 assert.match(j,/void\s+onDestroy\s*\(/);
});
test('dialogs are restricted to exact local bundled WebView and reject arbitrary origins',()=>{
 assert.match(source,/file:\/\/\/android_asset\/web\/index\.html/);
 assert.match(source,/url\.equals\(|\.equals\(url\)/);
 assert.match(source,/isFinishing\(\)|isDestroyed\(\)/);
 assert.match(source,/result\.cancel\(\)/);
});
test('source retains original synchronous focus/task/note confirmation contracts',()=>{
 assert.match(app,/window\.confirm\(quickText\('replacePrompt'\)\)/);
 assert.match(app,/window\.confirm\(quickText\('replacePrompt'\)\)/);
 assert.match(integration,/root\.confirm\(noteMessage\('confirmDelete'\)\)/);
 assert.match(integration,/root\.prompt\(label\)/);
 assert.match(j,/zen_fortress_cfg_v21/);
 assert.match(j,/zen_fortress_notes_v21/);
});

test('successive prompts such as permanent delete then backup acknowledgement do not auto-cancel each other',()=>{
 const click=source.slice(source.indexOf('setPositiveButton(android.R.string.ok'));
 const resolved=click.indexOf('result.confirm()');
 assert.ok(resolved>0,'positive resolution should invoke JavaScript');
 const cleared=click.slice(0,resolved);
 assert.match(cleared,/activeDialog\s*=\s*null;/,'release current native dialog before JavaScript resumes');
 assert.match(cleared,/activeCancel\s*=\s*null;/,'release pending cancellation before chained dialog');
 const cancel=source.slice(source.indexOf('final Runnable cancel'),source.indexOf('AlertDialog.Builder builder'));
 assert.match(cancel,/activeDialog\s*=\s*null;/,'cancel can permit follow-up dialog instead of blocking it');
});
