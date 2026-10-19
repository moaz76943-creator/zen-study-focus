'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseBacklog} = require('../../tools/quality_center/backlog.cjs');
const row = (i, status='BLOCKED', system='AUDIO') => `| DF-${String(i).padStart(3,'0')} | ${status} | ${system} | Test ${i} | Evidence ${i} |`;
test('161-item matrix validates every unique sequential identifier', () => {
  const source = Array.from({length:161}, (_, i) => row(i + 1, i ? 'IN_PROGRESS':'TESTED')).join('\n');
  const result = parseBacklog(source);
  assert.equal(result.ok, true);
  assert.equal(result.total, 161);
  assert.deepEqual(result.counts, {TESTED:1,IN_PROGRESS:160,BLOCKED:0,TODO:0,DEFERRED:0});
  assert.equal(result.systems[0].name, 'AUDIO');
});
test('duplicate IDs cannot inflate completeness', () => {
  const src = Array.from({length:161}, (_, i) => row(i===160?1:i+1)).join('\n');
  const result = parseBacklog(src);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some(x => x.includes('Duplicate DF-001')));
  assert.ok(result.problems.some(x => x.includes('Missing DF-161')));
});
test('invalid and missing rows are a failure, never silently omitted', () => {
  const src = row(1)+'\n| DF-002 | WONKY | AUDIO | task | evidence |\n'+row(3);
  const result = parseBacklog(src);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some(x => x.includes('Invalid status WONKY')));
  assert.ok(result.problems.some(x => x.includes('Expected exactly 161')));
});
test('HTML table injection cannot bypass the task record escaping', () => {
  const src = row(1).replace('Test 1', '<script>alert(1)</script>');
  const result = parseBacklog(src);
  assert.equal(result.tasks[0].title, '<script>alert(1)</script>');
});
