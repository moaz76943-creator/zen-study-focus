'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../../docs/control-center/studio-core.js');
const defaults=require('../../docs/control-center/design-config.json');
test('validates default appearance contract and six real screen IDs',()=>{
 const c=core.validateConfig(defaults);
 assert.deepEqual(Object.keys(c.screens).sort(),['analytics','calendar','notes','sounds','tasks','timer']);
 assert.equal(c.schema_version,1);
});
test('rejects CSS injection, unknown keys and out-of-range numbers',()=>{
 assert.throws(()=>core.validateConfig({...defaults,theme:{...defaults.theme,primary:'#123456;display:none'}}));
 assert.throws(()=>core.validateConfig({...defaults,unknown:'secret'}));
 assert.throws(()=>core.validateConfig({...defaults,theme:{...defaults.theme,fontScale:501}}));
 assert.throws(()=>core.validateConfig({...defaults,screens:{...defaults.screens,evil:{}}}));
});
test('renders controlled CSS and never changes application data keys',()=>{
 const css=core.renderCSS(defaults);
 assert.match(css,/:root\{/);
 assert.match(css,/#sec-analytics/);
 assert.match(css,/--primary:/);
 assert.doesNotMatch(css,/zen_fortress|ZEN21::|url\(/);
});
test('generates a one-screen change and keeps all other screen settings',()=>{
 const change=core.updateSetting(defaults,'notes','cardRadius',36);
 assert.equal(change.screens.notes.cardRadius,36);
 assert.equal(change.screens.timer.cardRadius,defaults.screens.timer.cardRadius);
 assert.notEqual(change,defaults);
 assert.notEqual(change.screens.notes,defaults.screens.notes);
});
test('enforces recognized screen slug and reversible preset',()=>{
 assert.throws(()=>core.updateSetting(defaults,'private','cardRadius',40));
 assert.deepEqual(core.validateConfig(defaults),defaults);
});
test('creates bounded agent tasks with known source paths and acceptance gates',()=>{
 const item=core.makeAgentRequest('audio','sounds','Check nature recordings','a'.repeat(40));
 assert.match(item.title,/sounds/i);
 assert.match(item.body,/NOT_TESTED/);
 assert.match(item.body,/nature_audio_recovery/);
 assert.match(item.body,/ZEN21::/);
 assert.throws(()=>core.makeAgentRequest('evil','sounds','anything','a'.repeat(40)));
 assert.throws(()=>core.makeAgentRequest('audio','evil','anything','a'.repeat(40)));
 assert.throws(()=>core.makeAgentRequest('audio','sounds','x','not-a-sha'));
});
test('refuses untrusted HTML/JS URLs and missing title',()=>{
 assert.throws(()=>core.makeAgentRequest('ui','timer','   ','a'.repeat(40)));
 assert.throws(()=>core.updateSetting(defaults,'theme','primary','javascript:alert(1)'));
});

test('parses an owner design issue with exact 40-character base SHA and validated config',()=>{
 const issue=core.makeDesignRequest(defaults,'b'.repeat(40));
 const parsed=core.parseDesignIssue(issue.body);
 assert.equal(parsed.sha,'b'.repeat(40));
 assert.deepEqual(parsed.config,defaults);
});
test('rejects duplicated JSON sections and stale/noncanonical issue payload',()=>{
 const valid=core.makeDesignRequest(defaults,'b'.repeat(40)).body;
 assert.throws(()=>core.parseDesignIssue(valid+'\n--- START CONFIG JSON ---\n{}\n--- END CONFIG JSON ---'));
 assert.throws(()=>core.parseDesignIssue(valid.replace('Reference SHA: ','Reference SHA: invalid-')));
});
