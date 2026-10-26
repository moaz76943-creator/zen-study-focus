'use strict';
// Current v21 startup/offline contract, adapted from historical performance PR #29.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {auditStartup}=require('./startup_assets.cjs');
const web=path.resolve(__dirname,'../../android/app/src/main/assets/web');

test('current offline startup has real packaged JS and CSS; no network dependencies',()=>{
  const report=auditStartup(web);
  assert.ok(report.scripts>=20,'expected actual local app startup scripts');
  assert.ok(report.styles>=3,'expected actual local stylesheets');
  assert.deepEqual(report.remote,[]);
  assert.deepEqual(report.unsafe,[]);
  assert.deepEqual(report.missing,[]);
});

test('offline audit reports missing files, external resources and traversal without fetching them',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'df-offline-audit-'));
  try {
    fs.writeFileSync(path.join(tmp,'ok.js'),'/*local*/');
    fs.writeFileSync(path.join(tmp,'index.html'),
      '<script src="ok.js?v=1"></script>'+
      '<script src="https://cdn.example.org/app.js"></script>'+
      '<script src="../outside.js"></script>'+
      '<script src="missing.js"></script>'+
      '<link rel="stylesheet" href="//cdn.example.org/style.css">');
    const r=auditStartup(tmp);
    assert.equal(r.scripts,4);
    assert.equal(r.styles,1);
    assert.deepEqual(r.missing,['missing.js']);
    assert.deepEqual(r.unsafe,['../outside.js']);
    assert.deepEqual(r.remote,['https://cdn.example.org/app.js','//cdn.example.org/style.css']);
  } finally {fs.rmSync(tmp,{force:true,recursive:true});}
});

test('directories never pass as packaged startup files',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'df-offline-dir-'));
  try {
    fs.mkdirSync(path.join(tmp,'js'));
    fs.writeFileSync(path.join(tmp,'index.html'),'<script src="js"></script>');
    assert.deepEqual(auditStartup(tmp).missing,['js']);
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});
