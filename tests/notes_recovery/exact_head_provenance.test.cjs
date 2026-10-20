'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const y=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/verify_draft_20_locales.yml'),'utf8');
test('DF-151: both source and Android build jobs checkout the exact reviewed PR head',()=>{
 const marker="ref: \${{ github.event.pull_request.head.sha || github.sha }}";
 assert.equal(y.split(marker).length-1,2,'both jobs must pin the same exact PR-head sha');
 const checkpoints="test \"$actual\" = \"$expected\"";
 assert.equal(y.split(checkpoints).length-1,2,'every job must enforce checkout identity before reporting evidence');
 assert.match(y,/github\.event\.pull_request\.head\.sha/);
});
test('DF-156: APK hash evidence and release limitations cannot be omitted',()=>{
 assert.match(y,/git rev-parse HEAD > evidence\/source-sha\.txt/);
 assert.match(y,/sha256sum android\/app\/build\/outputs\/apk\/debug\/\*\.apk/);
 assert.match(y,/Android UI E2E: NOT_TESTED/);
 assert.match(y,/Media license gate: BLOCKED/);
 assert.match(y,/Release: NOT APPROVED/);
});
