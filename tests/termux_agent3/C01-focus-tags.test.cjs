'use strict';

const test = require('node:test');
const assert = require('node:assert');

const Taxonomy = require('../../android/app/src/main/assets/web/js/focus_tags_taxonomy_engine.js');

test('aggregateTimeByTag keeps prototype-like tag names as plain tags', () => {
  const sessions = [
    { durationMinutes: 20, tags: ['دراسة'] },
    { durationMinutes: 60, tags: ['constructor'] },
    { durationMinutes: 30, tags: ['__proto__'] }
  ];
  const before = JSON.stringify(sessions);

  const agg = Taxonomy.aggregateTimeByTag(sessions);
  const totals = new Map(agg.map(function (entry) {
    return [entry.tag, entry.totalMinutes];
  }));

  assert.strictEqual(agg.length, 3);
  assert.strictEqual(totals.get('دراسة'), 20);
  assert.strictEqual(totals.get('constructor'), 60);
  assert.strictEqual(totals.get('__proto__'), 30);
  assert.ok(agg.every(function (entry) {
    return typeof entry.totalMinutes === 'number';
  }));
  assert.strictEqual(JSON.stringify(sessions), before);
});
