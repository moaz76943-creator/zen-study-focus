'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const helper=path.join(__dirname,'track14_install_apk.sh');
function fixture(mode,run) {
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'df-track14-install-'));
  try {
    fs.writeFileSync(path.join(d,'adb'),[
      '#!/usr/bin/env bash',
      'printf "%s\\n" "$*" >> "$MOCK_CALLS"',
      'if [[ "$1" == "install" ]]; then',
      '  n=$(cat "$MOCK_COUNT" 2>/dev/null || echo 0)',
      '  n=$((n+1)); echo "$n" > "$MOCK_COUNT"',
      '  if [[ "$MOCK_MODE" == "fail" || "$n" -lt 2 ]]; then echo "Broken pipe (32)" >&2; exit 1; fi',
      '  exit 0',
      'fi',
      'if [[ "$1" == "shell" && "$2" == "pm" && "$3" == "path" ]]; then',
      '  n=$(cat "$MOCK_COUNT" 2>/dev/null || echo 0)',
      '  if [[ "$MOCK_MODE" != "fail" && "$n" -ge 2 ]]; then echo "package:/data/app/test/base.apk"; exit 0; fi',
      '  exit 1',
      'fi',
      'exit 1'
    ].join('\n')+'\n',{mode:0o755});
    const apk=path.join(d,'fixture.apk');
    fs.writeFileSync(apk,'isolated fixture bytes');
    const env={...process.env,PATH:d+path.delimiter+process.env.PATH,
      DF_TRACK14_ANDROID_EVIDENCE:path.join(d,'evidence'),
      DF_TRACK14_INSTALL_ATTEMPTS:'3',DF_TRACK14_INSTALL_BACKOFF:'0',
      MOCK_MODE:mode,MOCK_COUNT:path.join(d,'count'),MOCK_CALLS:path.join(d,'calls')};
    run({apk,env});
  } finally {fs.rmSync(d,{recursive:true,force:true});}
}
test('non-streaming install recovers after one broken pipe and verifies package',()=>{
  fixture('recover',({apk,env})=>{
    const x=spawnSync('bash',[helper,apk],{env,encoding:'utf8',timeout:15000});
    assert.equal(x.status,0,x.stderr);
    const calls=fs.readFileSync(env.MOCK_CALLS,'utf8').trim().split('\n');
    assert.equal(calls.filter(x=>x.startsWith('install ')).length,2);
    assert.ok(calls.filter(x=>x.startsWith('install ')).every(x=>x.includes('--no-streaming -r')));
    assert.ok(calls.includes('shell pm path com.zenstudy.focus'));
    assert.ok(fs.existsSync(path.join(env.DF_TRACK14_ANDROID_EVIDENCE,'apk.sha256')));
  });
});
test('permanent transport failure remains FAIL after at most three attempts',()=>{
  fixture('fail',({apk,env})=>{
    const x=spawnSync('bash',[helper,apk],{env,encoding:'utf8',timeout:15000});
    assert.equal(x.status,1,x.stderr);
    assert.match(x.stderr,/ANDROID_INSTALL_FAIL/);
    const calls=fs.readFileSync(env.MOCK_CALLS,'utf8').split('\n');
    assert.equal(calls.filter(s=>s.startsWith('install ')).length,3);
  });
});
test('missing APK fails before any emulator mutation',()=>{
  fixture('recover',({apk,env})=>{
    fs.rmSync(apk);
    const x=spawnSync('bash',[helper,apk],{env,encoding:'utf8',timeout:15000});
    assert.equal(x.status,2);
    assert.match(x.stderr,/APK missing or empty/);
    assert.equal(fs.existsSync(env.MOCK_CALLS),false);
  });
});
