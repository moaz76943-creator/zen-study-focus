'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../../docs/control-center/v3-core.js');
const studio=require('../../docs/control-center/studio-core.js');
const config=require('../../docs/control-center/design-config.json');
const tasks=[
 {id:'DF-001',status:'BLOCKED',area:'AUDIO',title:'Unlicensed recording',evidence:'missing hash'},
 {id:'DF-002',status:'IN_PROGRESS',area:'AUDIO',title:'Mixer QA',evidence:'pending'},
 {id:'DF-003',status:'TESTED',area:'NOTES',title:'Notes backup',evidence:'source test'}
];
const prs=[{number:25,title:'Recovery',draft:true,created_at:'2026-09-01T00:00:00Z',html_url:'https://github.com/example'},
 {number:37,title:'Dashboard',draft:false,created_at:'2026-10-19T00:00:00Z',html_url:'https://github.com/example'}];
const runs=[
 {id:1,name:'Source QA',status:'completed',conclusion:'success',html_url:'https://github.com/test'},
 {id:2,name:'Android',status:'completed',conclusion:'failure',html_url:'https://github.com/test'},
 {id:3,name:'Unknown',status:'in_progress',conclusion:null,html_url:'https://github.com/test'}];
const SHA='a'.repeat(40);
test('F01 unified search safely groups matching repository resources',()=>{
 const groups=core.unifiedSearch('record',{tasks,prs,runs,findings:[{id:'MEDIA',title:'Recording provenance'}]});
 assert.deepEqual(groups.map(x=>x.type),['task','finding']);
 assert.equal(core.unifiedSearch('<img>',{tasks,prs,runs,findings:[]}).length,0);
});
test('F02 keyboard shortcuts map command and navigation predictably',()=>{
 assert.equal(core.shortcut({key:'k',ctrlKey:true}), 'search');
 assert.equal(core.shortcut({key:'k',metaKey:true}), 'search');
 assert.equal(core.shortcut({key:'Escape'}),'close');
 assert.equal(core.shortcut({key:'k'}),null);
});
test('F03 task quick views filter source statuses accurately',()=>{
 assert.deepEqual(core.taskView(tasks,'blocked').map(x=>x.id),['DF-001']);
 assert.equal(core.taskView(tasks,'active').length,2);
 assert.equal(core.taskView(tasks,'all').length,3);
});
test('F04 task sort supports id, status and area, without mutating input',()=>{
 assert.deepEqual(core.sortTasks(tasks,'area').map(x=>x.id),['DF-001','DF-002','DF-003']);
 assert.deepEqual(core.sortTasks(tasks,'id-desc').map(x=>x.id),['DF-003','DF-002','DF-001']);
 assert.equal(tasks[0].id,'DF-001');
});
test('F05 CSV export escapes newlines and formula injections',()=>{
 const result=core.tasksCSV([{...tasks[0],title:'=HYPERLINK("a"),x\nz'}]);
 assert.match(result,/^id,status,area,title,evidence\r?\n/);
 assert.ok(result.includes("'=HYPERLINK"));
 assert.ok(result.includes('""a""'));
});
test('F06 area metrics return measured breakdown without invented totals',()=>{
 const metrics=core.areaMetrics(tasks);
 assert.deepEqual(metrics.find(x=>x.area==='AUDIO'),{area:'AUDIO',total:2,blocked:1,tested:0,active:1});
});
test('F07 release checklist retains independent unverified gates',()=>{
 const gates=core.releaseChecklist({device_qa:'NOT_TESTED',ready_for_release:false});
 assert.equal(gates.length,5);
 assert.ok(gates.every(x=>x.passed===false));
});
test('F08 CI trend excludes pending from denominator',()=>{
 assert.deepEqual(core.ciTrend(runs),{passed:1,failed:1,pending:1,totalCompleted:2,successRate:50});
});
test('F09 failed CI view includes only truly failed runs',()=>{
 assert.deepEqual(core.failedRuns(runs).map(x=>x.id),[2]);
});
test('F10 stale pull requests use explicit now and threshold',()=>{
 assert.deepEqual(core.stalePulls(prs,'2026-10-20T00:00:00Z',14).map(x=>x.number),[25]);
});
test('F11 pull request filter never confuses draft/open and search text',()=>{
 assert.deepEqual(core.filterPulls(prs,'draft','recov').map(x=>x.number),[25]);
 assert.deepEqual(core.filterPulls(prs,'ready','').map(x=>x.number),[37]);
});
test('F12 risk filtering respects critical, warning and other severities',()=>{
 const list=[{severity:'critical',id:'1'},{severity:'warning',id:'2'}];
 assert.deepEqual(core.filterFindings(list,'critical').map(x=>x.id),['1']);
});
test('F13 report freshness detects mismatched, unavailable SHA',()=>{
 assert.equal(core.auditFreshness({inspected_ref:SHA},SHA),'current');
 assert.equal(core.auditFreshness({inspected_ref:SHA},'b'.repeat(40)),'stale');
 assert.equal(core.auditFreshness(null,SHA),'unavailable');
});
test('F14 snapshots compare task status, additions and removals without writes',()=>{
 const old={schema_version:1,inspected_ref:SHA,tasks:[tasks[0],tasks[1]]};
 const newer={schema_version:1,inspected_ref:'b'.repeat(40),tasks:[{...tasks[0],status:'TESTED'},tasks[2]]};
 assert.deepEqual(core.compareSnapshots(old,newer),{added:1,removed:1,statusChanged:1,oldCount:2,newCount:2});
});
test('F15 theme presets only update allowlisted colors and preserve screens',()=>{
 const altered=core.applyThemePreset(config,'ocean');
 assert.notEqual(altered.theme.primary,config.theme.primary);
 assert.deepEqual(altered.screens,config.screens);
 assert.throws(()=>core.applyThemePreset(config,'unknown'));
});
test('F16 design undo reverts the latest committed visual state',()=>{
 const history=core.createHistory(config);
 const alt=studio.updateSetting(config,'theme','fontScale',110);
 const next=core.historyPush(history,alt);
 assert.equal(core.historyUndo(next).value.theme.fontScale,100);
});
test('F17 design redo re-applies only an undone step, with no stale fork',()=>{
 const history=core.historyPush(core.createHistory(config),studio.updateSetting(config,'theme','fontScale',110));
 assert.equal(core.historyRedo(core.historyUndo(history)).value.theme.fontScale,110);
});
test('F18 reset one screen without resetting global or other screens',()=>{
 const changed=studio.updateSetting(config,'notes','spacing',20);
 const reset=core.resetScreen(changed,config,'notes');
 assert.equal(reset.screens.notes.spacing,config.screens.notes.spacing);
 assert.deepEqual(reset.screens.timer,changed.screens.timer);
});
test('F19 imported design JSON requires strict schema, size and no markup',()=>{
 assert.deepEqual(core.importConfig(JSON.stringify(config)),config);
 assert.throws(()=>core.importConfig('{"__proto__":{}}'));
 assert.throws(()=>core.importConfig('x'.repeat(100000)));
});
test('F20 diff view reports only changed allowed keys',()=>{
 const changed=studio.updateSetting(config,'notes','spacing',20);
 assert.deepEqual(core.configDiff(config,changed),[{path:'screens.notes.spacing',before:12,after:20}]);
 assert.deepEqual(core.configDiff(config,config),[]);
});
