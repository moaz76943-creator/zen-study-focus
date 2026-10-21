'use strict';
// Track 02: Native SAF file selection must preserve WebView's blocked
// content:// access and use the established v21 backup validator.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../..');
const native=fs.readFileSync(path.join(base,'android/app/src/main/java/com/zenstudy/focus/MainActivity.java'),'utf8');
const html=fs.readFileSync(path.join(base,'android/app/src/main/assets/web/index.html'),'utf8');

test('restore file button uses native SAF on Android with existing web fallback',()=>{
 assert.match(html,/ZenNative\.importBackupFromFile\(\)/);
 assert.match(html,/fileRestoreInput/);
});

test('native SAF selects readable document without broadening WebView content privileges',()=>{
 assert.match(native,/public void importBackupFromFile\(\)/);
 assert.match(native,/REQUEST_BACKUP_IMPORT/);
 assert.match(native,/Intent\.ACTION_OPEN_DOCUMENT/);
 assert.match(native,/getContentResolver\(\)\.openInputStream\(/);
 assert.match(native,/setAllowContentAccess\(false\)/);
 assert.doesNotMatch(native,/setAllowContentAccess\(true\)/);
});

test('native import bounds bytes and delegates validation and consent to v21 verifier',()=>{
 assert.match(native,/MAX_BACKUP_IMPORT_BYTES/);
 assert.match(native,/org\.json\.JSONObject\.quote\(/);
 assert.match(native,/verifyAndRestoreBackupCode/);
 assert.match(native,/existing data unchanged/);
});
