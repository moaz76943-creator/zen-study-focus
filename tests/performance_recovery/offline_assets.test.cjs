'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {scanAssets}=require('./asset_audit.cjs');
const web=path.resolve(__dirname,'../../android/app/src/main/assets/web');

test('offline launch: critical local script and stylesheet paths exist',()=>{
  const report=scanAssets(web);
  assert.ok(report.criticalLocal.length>=20,'expected app script modules');
  assert.deepEqual(report.missingCritical,[]);
  assert.deepEqual(report.remoteCritical,[]);
});
test('integrated offline typography requires no optional network fonts',()=>{
  const report=scanAssets(web);
  assert.deepEqual(report.remoteOptional,[]);
});
test('absence of unreferenced optional media does not make critical startup graph incomplete',()=>{
  const report=scanAssets(web);
  assert.ok(report.criticalLocal.every(x=>!x.startsWith('sounds/')));
  assert.ok(report.criticalLocal.every(x=>!x.startsWith('completion_alerts/')));
});