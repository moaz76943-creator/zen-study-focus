'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {parseLedger,analyze,toMarkdown,checkoutSha}=require('../../tools/control_center/audit.cjs');
const ledger=Array.from({length:161},(_,i)=>
  '| DF-'+String(i+1).padStart(3,'0')+' | '+(i===1?'BLOCKED':'TESTED')+' | QA | item | evidence |'
).join('\n');
const sample=changes=>analyze({ledger,media:[],licenseText:'',headSha:'a'.repeat(40),
  generatedAt:'2026-10-19T00:00:00Z',...changes});
test('161 tasks and zero fabricated device passes',()=>{
  const r=sample({});
  assert.equal(r.totals.tasks,161);assert.equal(r.totals.BLOCKED,1);
  assert.equal(r.device_qa,'NOT_TESTED');assert.equal(r.ready_for_release,false);
});
test('reports missing task, duplicate id and invalid status',()=>{
  const r=sample({ledger:ledger.replace(/^\| DF-161.*$/m,'')+
    '\n| DF-001 | TESTED | QA | duplicate | evidence |\n| DF-002 | UNKNOWN | QA | invalid | evidence |'});
  assert.ok(r.findings.some(f=>f.id==='LEDGER_INTEGRITY'));
});
test('detects undocumented media and identical content',()=>{
  const r=sample({media:[
    {path:'sounds/earth.ogg',sha256:'b'.repeat(64)},
    {path:'sounds/noise.ogg',sha256:'b'.repeat(64)}
  ]});
  assert.ok(r.findings.some(f=>f.id==='MEDIA_UNDOCUMENTED'));
  assert.ok(r.findings.some(f=>f.id==='MEDIA_IDENTICAL'));
});
test('does not flag assets named in the media ledger as undocumented',()=>{
  const r=sample({media:[{path:'sounds/forest.ogg',sha256:'c'.repeat(64)}],
    licenseText:'forest.ogg'});
  assert.ok(!r.findings.some(f=>f.id==='MEDIA_UNDOCUMENTED'));
});
test('invalid source ref is not represented as a SHA',()=>{
  assert.equal(sample({headSha:'some-branch'}).inspected_ref,null);
});
test('markdown includes device NOT_TESTED warning',()=>{
  assert.match(toMarkdown(sample({})),/Android device QA NOT_TESTED/);
});
test('parseLedger ignores other table rows',()=>{
  assert.equal(parseLedger('| a | b |\n| DF-003 | BLOCKED | QA | task | evidence |').tasks.length,1);
});

test('source audit uses actual checked-out Git commit instead of PR merge event SHA',()=>{
  const checkout='b'.repeat(40),merge='a'.repeat(40);
  const actual=checkoutSha('/fixture',{GITHUB_EVENT_NAME:'pull_request',GITHUB_SHA:merge},
    (cmd,args)=>{assert.equal(cmd,'git');assert.deepEqual(args,['rev-parse','HEAD']);return checkout+'\\n';});
  assert.equal(actual,checkout);
});
test('unreadable checkout never pretends PR event merge SHA is the audited source',()=>{
  assert.equal(checkoutSha('/fixture',{GITHUB_EVENT_NAME:'pull_request',GITHUB_SHA:'a'.repeat(40)},
    ()=>{throw new Error('git unavailable');}),null);
});
