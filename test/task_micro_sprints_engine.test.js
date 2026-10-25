const assert = require('assert');
const Sprints = require('../android/app/src/main/assets/web/js/task_micro_sprints_engine.js');

console.log("--- Running 🎯 Mission #084: Task Micro-Sprints Engine Tests ---");

// Test 1: Slices large task evenly (60 mins into three 20-min sprints)
{
  const list = Sprints.calculateSprints(60, 20);
  assert.deepStrictEqual(list, [20, 20, 20], "60 mins must slice into 20, 20, 20");
  console.log("✓ Test 1: Even slicing of large tasks verified.");
}

// Test 2: Handles non-divisible durations with balanced distribution (50 mins -> 25, 25)
{
  const list = Sprints.calculateSprints(50, 20);
  assert.strictEqual(list.length, 2, "50 mins must balance into 2 equal 25-min sprints");
  assert.deepStrictEqual(list, [25, 25]);
  assert.strictEqual(list[0] + list[1], 50, "Sum of sprints must equal 50 mins");
  console.log("✓ Test 2: Balanced remainder slicing (25, 25) verified.");
}

// Test 3: Small tasks (< sprint duration) remain a single sprint
{
  const single = Sprints.calculateSprints(15, 25);
  assert.deepStrictEqual(single, [15], "Task smaller than sprint duration must not be split");
  console.log("✓ Test 3: Single sprint preservation for small tasks verified.");
}

// Test 4: Queue creation and sequential progression
{
  const parent = { id: "p_101", title: "كتابة المقال", estimatedMinutes: 40 };
  let q = Sprints.createSprintQueue(parent, 20, 5);
  assert.strictEqual(q.totalSprints, 2);
  assert.strictEqual(q.currentSprintIndex, 0);
  assert.strictEqual(q.isComplete, false);

  // Advance to sprint 2
  q = Sprints.advanceSprintQueue(q);
  assert.strictEqual(q.currentSprintIndex, 1);
  assert.strictEqual(q.sprints[0].completed, true);
  assert.strictEqual(q.isComplete, false);

  // Complete queue
  q = Sprints.advanceSprintQueue(q);
  assert.strictEqual(q.isComplete, true);
  assert.strictEqual(q.sprints[1].completed, true);
  console.log("✓ Test 4: Queue creation & sequential advancement verified.");
}

// Test 5: Timer payload contract generation with Western digits
{
  const parent = { id: "p_102", title: "فيزياء", estimatedMinutes: 40 };
  const q = Sprints.createSprintQueue(parent, 20, 5);
  const payload = Sprints.getActiveSprintTimerPayload(q);

  assert.strictEqual(payload.action, "START_SPRINT_TIMER");
  assert.strictEqual(payload.parentTaskId, "p_102");
  assert.strictEqual(payload.sprintNumber, 1);
  assert.strictEqual(payload.totalSprints, 2);
  assert.ok(payload.label.includes("\u200E1 من \u200E2"));
  assert.strictEqual(payload.targetSeconds, 1200);
  assert.strictEqual(payload.breakMinutesAfter, 5);
  console.log("✓ Test 5: Active sprint timer payload contract & Western digits verified.");
}

console.log("--- All Mission #084 Tests PASSED (GREEN) ---");
