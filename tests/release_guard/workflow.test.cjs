'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const y=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/build_apk.yml'),'utf8');
test('push and pull request produce debug test artifacts with exact source SHA',()=>{
 assert.match(y,/pull_request:/);assert.match(y,/gradle assembleDebug --no-daemon/);
 assert.match(y,/git rev-parse HEAD/);assert.match(y,/DEBUG_APK_SHA256/);
 assert.match(y,/NOT_RELEASE_APPROVED/);
});
test('publishing is manual-only and waits for tests and explicit runtime guard',()=>{
 assert.match(y,/needs: verify/);
 assert.match(y,/github\.event_name == 'workflow_dispatch' && inputs\.publish_release == true && github\.ref == 'refs\/heads\/main'/);
 assert.match(y,/node tools\/release_guard\/guard\.cjs/);
 assert.match(y,/EXPECTED_RELEASE_SHA: \$\{\{ inputs\.release_sha \}\}/);
 assert.match(y,/ZEN_CANDIDATE_SHA: \$\{\{ vars\.ZEN_CANDIDATE_SHA \}\}/);
});
test('never publish or sign Debug as a release on pushes',()=>{
 const start=y.indexOf('\n  release:');assert.ok(start>0);
 const verify=y.slice(0,start),release=y.slice(start);
 assert.doesNotMatch(verify,/assembleRelease|bundleRelease|action-gh-release/);
 assert.match(release,/apksigner/);
 assert.match(release,/jarsigner -verify/);
 assert.match(release,/softprops\/action-gh-release@v2/);
 assert.match(release,/ZEN_UPLOAD_KEYSTORE_BASE64/);
});
