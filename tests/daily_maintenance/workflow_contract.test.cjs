'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/daily_maintenance.yml'),'utf8');
const build=fs.readFileSync(path.join(root,'.github/workflows/build_apk.yml'),'utf8');
test('daily and weekly scheduled scans default to latest master completion branch, not stale recovery',()=>{
 assert.match(workflow,/default:\s*master-draft/);
 const expected="inputs.target == 'recovery' && 'integration/deep-focus-recovery-00-final-20261019' || 'fix/master-completion-20261020'";
 assert.equal(workflow.split(expected).length,3,'both source and debug-build jobs must select latest source on schedule');
 assert.match(workflow,/cron: '17 2 \* \* \*'/);
 assert.match(workflow,/cron: '47 1 \* \* 5'/);
});
test('nightly repairs never publish; weekly job assembles Debug only',()=>{
 assert.match(workflow,/gradle assembleDebug --no-daemon/);
 assert.doesNotMatch(workflow,/gradle .*assembleRelease/);
 assert.doesNotMatch(workflow,/softprops\/action-gh-release/);
 assert.match(workflow,/gh pr create .*--draft/);
 assert.match(build,/github\.event_name == 'workflow_dispatch' && inputs\.publish_release == true/);
});
test('nightly QA requires source SHA evidence and preserves blocked release gates',()=>{
 assert.match(workflow,/git -C source rev-parse HEAD/);
 assert.match(workflow,/media_provenance_gate\.test\.cjs/);
 assert.match(workflow,/MEDIA_RELEASE_GATE_BLOCKED/);
 assert.match(workflow,/RELEASE NOT APPROVED/);
});

test('weekly Android build finds executable SDK manager without assuming PATH layout',()=>{
 assert.match(workflow,/find \/usr\/local\/lib\/android\/sdk\/cmdline-tools -type f -name sdkmanager/);
 assert.match(workflow,/test -x "\$SDKMANAGER"/);
 assert.match(workflow,/"\$SDKMANAGER" 'platforms;android-36' 'build-tools;36\.0\.0'/);
 assert.doesNotMatch(workflow,/run: sdkmanager /);
});
