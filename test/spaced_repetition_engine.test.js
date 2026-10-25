const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/spaced_repetition_engine.js');

console.log("--- Running 🎯 Mission #082: Spaced Repetition Study Engine Tests ---");

// Test 1: Initial item registration creates Box 1 with +1 day review date
{
  const baseDate = new Date("2026-10-22T10:00:00Z");
  const topic = Engine.registerStudyTopic("معادلات ماكسويل", "فيزياء", baseDate);

  assert.strictEqual(topic.box, 1);
  assert.strictEqual(topic.isMastered, false);
  assert.strictEqual(topic.reviewCount, 0);
  assert.strictEqual(topic.nextReviewDate, "2026-10-23", "Next review must be +1 day (2026-10-23)");
  console.log("✓ Test 1: Study topic registration into Box 1 verified.");
}

// Test 2: 'easy' recall advances box from 1 to 2 (+3 days) and 2 to 3 (+7 days)
{
  let topic = { id: "t1", title: "كيمياء", box: 1, isMastered: false };
  const d1 = new Date("2026-10-23T10:00:00Z");

  topic = Engine.evaluateRecallFeedback(topic, "easy", d1);
  assert.strictEqual(topic.box, 2, "Must advance to Box 2");
  assert.strictEqual(topic.nextReviewDate, "2026-10-26", "Box 2 interval is +3 days (Oct 26)");

  const d2 = new Date("2026-10-26T10:00:00Z");
  topic = Engine.evaluateRecallFeedback(topic, "easy", d2);
  assert.strictEqual(topic.box, 3, "Must advance to Box 3");
  assert.strictEqual(topic.nextReviewDate, "2026-11-02", "Box 3 interval is +7 days (Nov 02)");
  console.log("✓ Test 2: 'easy' rating interval ladder progression (Box 1 -> 2 -> 3) verified.");
}

// Test 3: 'forgot' rating resets topic back to Box 1 (+1 day)
{
  let advancedTopic = { id: "t2", title: "أحياء", box: 3, isMastered: false };
  const d = new Date("2026-10-25T10:00:00Z");

  const resetTopic = Engine.evaluateRecallFeedback(advancedTopic, "forgot", d);
  assert.strictEqual(resetTopic.box, 1, "Forgotten topic must reset to Box 1");
  assert.strictEqual(resetTopic.nextReviewDate, "2026-10-26", "+1 day review schedule");
  console.log("✓ Test 3: 'forgot' rating reset to Box 1 verified.");
}

// Test 4: Due review filtering extracts items due today or earlier
{
  const topics = [
    { id: "due_today", nextReviewDate: "2026-10-22", isMastered: false },
    { id: "overdue", nextReviewDate: "2026-10-20", isMastered: false },
    { id: "future", nextReviewDate: "2026-10-25", isMastered: false },
    { id: "mastered_item", nextReviewDate: "2026-10-22", isMastered: true }
  ];

  const due = Engine.filterDueReviewTopics(topics, "2026-10-22");
  assert.strictEqual(due.length, 2);
  const dueIds = due.map(d => d.id);
  assert.ok(dueIds.includes("due_today"));
  assert.ok(dueIds.includes("overdue"));
  assert.ok(!dueIds.includes("future"));
  assert.ok(!dueIds.includes("mastered_item"));
  console.log("✓ Test 4: Due review topics filtering verified.");
}

// Test 5: Integration contract generates valid Today task payload
{
  const item = { id: "item_99", title: "قوانين نيوتن", category: "فيزياء", box: 1, nextReviewDate: "2026-10-22" };
  const task = Engine.generateReviewTaskPayload(item);

  assert.strictEqual(task.id, "task_sr_item_99");
  assert.ok(task.title.includes("قوانين نيوتن"));
  assert.ok(task.title.includes("صندوق \u200E1"));
  assert.strictEqual(task.priority, "high", "Box 1 reviews have high priority");
  assert.ok(task.tags.includes("#spaced_review"));
  console.log("✓ Test 5: Today Task integration contract payload verified.");
}

console.log("--- All Mission #082 Tests PASSED (GREEN) ---");
