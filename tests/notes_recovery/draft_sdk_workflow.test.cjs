'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const workflow=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/verify_draft_20_locales.yml'),'utf8');
test('Android SDK manager is discovered from the hosted tools location, not assumed on PATH',()=>{
 assert.match(workflow,/find \/usr\/local\/lib\/android\/sdk\/cmdline-tools -type f -name sdkmanager/);
 assert.match(workflow,/test -x "\$SDKMANAGER"/);
 assert.match(workflow,/"\$SDKMANAGER" 'platforms;android-36' 'build-tools;36\.0\.0'/);
 assert.doesNotMatch(workflow,/run:\s*sdkmanager/);
});
test('locale workflow remains debug-only and release-blocked',()=>{
 assert.match(workflow,/gradle assembleDebug --no-daemon/);
 assert.doesNotMatch(workflow,/gradle .*assembleRelease|action-gh-release|gh pr merge/);
 assert.match(workflow,/Media license gate: BLOCKED/);
 assert.match(workflow,/Release: NOT APPROVED/);
});
