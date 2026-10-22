'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {resolveHourlyIssue, ISSUE_NUMBER, ISSUE_TITLE} = require('../../tools/daily_maintenance/hourly_issue_target.cjs');

function fakeGithub(data, calls) {
  return {rest: {issues: {
    get: async args => {calls.push(args); return {data};},
    create: async () => {throw Error('Must never create duplicate Hourly QA issue');},
    listForRepo: async () => {throw Error('Do not rely on pagination to find the canonical issue');}
  }}};
}

test('uses the canonical Issue #69 even when a newer duplicate #195 exists', async () => {
  const calls=[];
  const canonical={number:69,title:ISSUE_TITLE,state:'open',body:'existing cumulative ledger'};
  const found=await resolveHourlyIssue(fakeGithub(canonical,calls),{owner:'moaz76943-creator',repo:'zen-study-focus'});
  assert.equal(ISSUE_NUMBER,69);
  assert.equal(found,canonical);
  assert.deepEqual(calls,[{owner:'moaz76943-creator',repo:'zen-study-focus',issue_number:69}]);
});

test('fails closed when the canonical issue is missing', async () => {
  const github={rest:{issues:{get:async()=>{throw Error('404 Not Found');}}}};
  await assert.rejects(resolveHourlyIssue(github,{owner:'o',repo:'r'}),/404 Not Found/);
});

test('fails closed for a mismatched issue or a pull request', async () => {
  for (const data of [
    {number:195,title:ISSUE_TITLE,state:'open'},
    {number:69,title:'Unexpected issue',state:'open'},
    {number:69,title:ISSUE_TITLE,state:'open',pull_request:{}},
    {number:69,title:ISSUE_TITLE,state:'closed'}
  ]) {
    await assert.rejects(resolveHourlyIssue(fakeGithub(data,[]),{owner:'o',repo:'r'}),/canonical Hourly QA issue/i);
  }
});

test('does not accept missing GitHub API capability', async () => {
  await assert.rejects(resolveHourlyIssue({}, {owner:'o',repo:'r'}),/GitHub issues.get unavailable/);
});
