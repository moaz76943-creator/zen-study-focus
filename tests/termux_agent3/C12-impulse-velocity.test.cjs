'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Engine = require('../../android/app/src/main/assets/web/js/impulse_regulation_velocity_engine.js');

test('C12: untrusted timestamps never fabricate impulses or shift the heatmap state', () => {
  const map = Engine.mapImpulseTimelineHeatmap(20, [
    -3, 20, 100, 'not-a-time', null, undefined, Infinity, NaN
  ]);

  assert.strictEqual(map.totalImpulses, 0);
  assert.strictEqual(
    map.buckets.reduce(function (sum, bucket) { return sum + bucket.impulseCount; }, 0),
    0
  );
  assert.strictEqual(map.overallStateKey, 'impulse_stable');
  assert.strictEqual(map.peakVulnerabilityWindow, 'None');

  const valid = Engine.mapImpulseTimelineHeatmap(20, [0, 4.9, 5, 19.9, 20]);
  assert.strictEqual(valid.buckets[0].impulseCount, 2);
  assert.strictEqual(valid.buckets[1].impulseCount, 1);
  assert.strictEqual(valid.buckets[3].impulseCount, 1);
  assert.strictEqual(valid.totalImpulses, 4);
});
