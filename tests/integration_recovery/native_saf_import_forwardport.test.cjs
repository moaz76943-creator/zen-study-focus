'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const java=fs.readFileSync(path.join(root,'android/app/src/main/java/com/zenstudy/focus/MainActivity.java'),'utf8');
const html=fs.readFileSync(path.join(root,'android/app/src/main/assets/web/index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'android/app/src/main/assets/web/app.js'),'utf8');

test('native SAF opens only a user-selected document, with browser fallback',()=>{
 assert.match(html,/ZenNative\.importBackupFromFile\(\)/);
 assert.match(html,/fileRestoreInput/);
 assert.match(java,/REQUEST_BACKUP_IMPORT\s*=\s*7412/);
 assert.match(java,/new Intent\(Intent\.ACTION_OPEN_DOCUMENT\)/);
 assert.match(java,/Intent\.CATEGORY_OPENABLE/);
 assert.match(java,/backupImportPickerOpen/);
});
test('file read is bounded, escaped and handed to existing consent validator',()=>{
 assert.match(java,/MAX_BACKUP_IMPORT_BYTES\s*=\s*8\s*\*\s*1024\s*\*\s*1024/);
 assert.match(java,/getContentResolver\(\)\.openInputStream\(data\.getData\(\)\)/);
 assert.match(java,/org\.json\.JSONObject\.quote\(backupCode\)/);
 assert.match(java,/verifyAndRestoreBackupCode/);
 assert.match(app,/function verifyAndRestoreBackupCode\(codeStr\)/);
 assert.match(app,/confirmSensitiveAction/);
});
test('native SAF preserves WebView isolation and v21 backup export behavior',()=>{
 assert.match(java,/settings\.setAllowFileAccess\(false\)/);
 assert.match(java,/settings\.setAllowContentAccess\(false\)/);
 assert.match(java,/REQUEST_BACKUP_EXPORT\s*=\s*7410/);
 assert.doesNotMatch(java,/setAllowUniversalAccessFromFileURLs\(true\)/);
 assert.doesNotMatch(java,/setAllowContentAccess\(true\)/);
});
test('native cancel is no-op and the native side never commits v21 records',()=>{
 assert.match(java,/if\s*\(resultCode\s*!=\s*Activity\.RESULT_OK[^\n]*\)\s*return;/);
 const from=java.indexOf('if (requestCode == REQUEST_BACKUP_IMPORT)');
 assert.ok(from>0);
 const frag=java.slice(from,from+2600);
 assert.doesNotMatch(frag,/setItem\(|clear\(\)|writeDurable|commitPlan\(/);
});
