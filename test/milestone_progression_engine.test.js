const assert = require('assert');
const Progression = require('../android/app/src/main/assets/web/js/milestone_progression_engine.js');

console.log("--- Running 🎯 Mission #047: Milestone Progression Engine Tests ---");
{
  const empty = Progression.evaluateProgression([]);
  assert.strictEqual(empty.totalSessions, 0);
  assert.strictEqual(empty.unlockedCount, 0);
  assert.strictEqual(empty.nextMilestone.id, "first_session");
  console.log("✓ Test 1: Zero sessions baseline state verified.");
}
{
  const sessions = [
    { durationMinutes: 300 },
    { durationMinutes: 350 }
  ];
  const res = Progression.evaluateProgression(sessions);
  assert.strictEqual(res.totalMinutes, 650);
  assert.strictEqual(res.unlockedCount, 2, "Must unlock first_session and ten_hours (600m)");
  console.log("✓ Test 2: Milestone unlocking (first_session & ten_hours) verified.");
}
{
  const sessions = [{ durationMinutes: 300 }]; // 50% of 600m
  const res = Progression.evaluateProgression(sessions);
  assert.strictEqual(res.nextMilestone.id, "ten_hours");
  assert.strictEqual(res.nextMilestone.progressPercent, 50);
  console.log("✓ Test 3: Next milestone percentage progress calculation verified.");
}
{
  const malformed = [null, undefined, { durationMinutes: -10 }, { durationMinutes: "invalid" }];
  const res = Progression.evaluateProgression(malformed);
  assert.strictEqual(res.totalSessions, 0);
  assert.strictEqual(res.totalMinutes, 0);
  console.log("✓ Test 4: Defensive resilience against malformed records verified.");
}
console.log("--- All Mission #047 Tests PASSED (GREEN) ---");
