'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {report}=require('./audit.cjs');
test('static inventory locates at least 100 declared HTML event targets',()=>{
  assert.ok(report.inlineEventCount>=100,'Only '+report.inlineEventCount+' targets discovered');
  assert.equal(report.handlers.length,report.inlineEventCount);
  assert.equal(new Set(report.handlers.map(h=>h.line+':'+h.event+':'+h.handler)).size,report.handlers.length);
});
test('DF4-033: informational analytics KPIs cannot masquerade as quick-session actions',()=>{
  assert.equal(report.issues.filter(x=>x.type==='fake-kpi-click').length,0);
  assert.equal(report.handlers.filter(h=>h.classification==='MISLEADING_DISPLAY').length,0);
});
test('global namespace collisions are recorded, not silently assumed safe',()=>{
  for(const fn of ['filterNotesByTag','renderNotesStack','openNoteModal','fillNoteTpl','saveNewNote'])
    assert.ok(report.issues.some(x=>x.type==='global-collision'&&x.symbol===fn),fn);
});
test('script order and file existence are audited with explicit blocking status',()=>{
  assert.equal(report.issues.filter(x=>x.type==='missing-script'||x.type==='script-order').length,0);
});
test('inventory does not confuse static onclick with verified WebView dispatch',()=>{
  assert.equal(report.coverage.eventDispatchedInActualWebView,0);
  assert.equal(report.coverage.claim,'NOT_VERIFIED');
});
