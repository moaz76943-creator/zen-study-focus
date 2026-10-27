'use strict';

const test = require('node:test');
const assert = require('node:assert');

const exporter = require('../../android/app/src/main/assets/web/js/weekly_report_exporter.js');

test('unparseable session timestamp falls back to Unknown instead of crashing the weekly report', () => {
  const sessions = [{ durationMinutes: 25, timestamp: 'not-a-date' }];

  const metrics = exporter.aggregateWeeklyMetrics(sessions, []);
  assert.strictEqual(metrics.totalMinutes, 25);
  assert.deepStrictEqual(metrics.dayDistribution, { Unknown: 25 });

  const markdown = exporter.exportToMarkdown(sessions, [], { locale: 'en' });
  assert.ok(markdown.includes('| Unknown |'));
});
