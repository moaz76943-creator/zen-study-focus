'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const web='android/app/src/main/assets/web/';
const app=()=>read(web+'app.js');
test('nature playback never synthesizes fake ambience or silently substitutes other sounds',()=>{
 const src=app(), tree=fs.readdirSync(path.join(root,web+'sounds'));
 assert.doesNotMatch(src,/function createNatureSynthFallback\s*\(/);
 const catalog=src.match(/const SOUNDS_DATA = \[([\s\S]*?)\];/)[1];
 const files=[...catalog.matchAll(/src:\s*'sounds\/([^']+)'/g)].map(m=>m[1]);
 assert.ok(files.length>=2);
 for(const filename of files)assert.ok(tree.includes(filename),'Catalog file missing: '+filename);
 assert.doesNotMatch(catalog,/id:\s*'(?:waterfall|night|earth)'/);
 assert.doesNotMatch(src,/url:\s*'https:\/\/actions\.google\.com\/sounds/);
});
test('Arabic-script localizations remain stored but are not selectable for display; initial UI has no Arabic script',()=>{
 const src=app(),index=read(web+'index.html');
 assert.match(src,/const UI_BLOCKED_SCRIPTS\s*=\s*new Set\(/);
 assert.match(src,/function visualLanguage\(/);
 assert.match(src,/LANG_CATALOG\.filter\(l\s*=>\s*!UI_BLOCKED_SCRIPTS\.has\(l\.code\)\)/);
 assert.match(src,/function applyLanguage\(code\)\s*\{[\s\S]*?visualLanguage\(code\)/);
 const htmlWithoutScripts=index.replace(/<script\b[\s\S]*?<\/script>/gi,'');
 assert.doesNotMatch(htmlWithoutScripts,/[\u0600-\u06FF]/,'Hard-coded Arabic letters in screen markup');
});
test('analytics export uses a real native Android document picker instead of silent WebView download',()=>{
 const js=read(web+'integration_v22.js'),java=read('android/app/src/main/java/com/zenstudy/focus/MainActivity.java');
 assert.match(js,/exportAnalyticsCsvToFile/);
 assert.match(java,/@JavascriptInterface\s+public void exportAnalyticsCsvToFile\(/);
 assert.match(java,/REQUEST_ANALYTICS_EXPORT/);
});
test('analytics controls guard invalid date ranges and handle export failure visibly',()=>{
 const js=read(web+'analytics_studio.js');
 assert.match(js,/function normalizeDates\(/);
 assert.match(js,/Export unavailable/);
 assert.match(js,/try\s*\{[\s\S]*?opts\.onExport/);
});
