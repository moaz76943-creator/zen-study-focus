const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/today_focus_task_engine.js');

console.log("--- Running 🎯 Mission #044: Today Focus Task Engine Tests ---");

// Test 1: Today filtering (due today, overdue rollover, and #today tag)
{
  const refDate = "2026-10-22";
  const mockTasks = [
    { id: "t1", title: "مراجعة كيمياء", dueDate: "2026-10-22", completed: false }, // Today
    { id: "t2", title: "حل تمرين رياضيات متأخر", dueDate: "2026-10-20", completed: false }, // Overdue
    { id: "t3", title: "شراء قرطاسية", tags: ["#today"], completed: false }, // Tagged #today
    { id: "t4", title: "مشروع الأسبوع القادم", dueDate: "2026-10-28", completed: false }, // Future (exclude)
    { id: "t5", title: "مهمة منجزة اليوم", dueDate: "2026-10-22", completed: true } // Completed (exclude by default)
  ];

  const todayList = Engine.filterTodayTasks(mockTasks, { referenceDate: refDate });
  assert.strictEqual(todayList.length, 3, "Must include only due today, overdue, and tagged tasks");

  const ids = todayList.map(t => t.id);
  assert.ok(ids.includes("t1"));
  assert.ok(ids.includes("t2"));
  assert.ok(ids.includes("t3"));
  assert.ok(!ids.includes("t4"), "Future task must be excluded");
  assert.ok(!ids.includes("t5"), "Completed task must be excluded by default");
  console.log("✓ Test 1: Multi-criteria Today task filtering verified.");
}

// Test 2: Priority ordering hierarchy (Overdue > High Priority > Normal)
{
  const refDate = "2026-10-22";
  const mockTasks = [
    { id: "normal_today", title: "مهمة عادية اليوم", dueDate: "2026-10-22", priority: "normal" },
    { id: "overdue_task", title: "مهمة متأخرة هامة", dueDate: "2026-10-19", priority: "high" },
    { id: "high_today", title: "مهمة عاجلة اليوم", dueDate: "2026-10-22", priority: "high" }
  ];

  const sorted = Engine.filterTodayTasks(mockTasks, { referenceDate: refDate });
  assert.strictEqual(sorted[0].id, "overdue_task", "Overdue task must take top precedence");
  assert.strictEqual(sorted[1].id, "high_today", "High priority today task must be second");
  assert.strictEqual(sorted[2].id, "normal_today", "Normal task must be third");
  console.log("✓ Test 2: Priority ordering hierarchy strictly verified.");
}

// Test 3: Local civil date string consistency
{
  const dateObj = new Date("2026-10-22T10:00:00Z");
  const str = Engine.getLocalCivilDateString(dateObj);
  assert.strictEqual(typeof str, "string");
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(str), "Must match YYYY-MM-DD format");
  console.log("✓ Test 3: Civil date string format verified.");
}

// Test 4: Timer link payload contract generation
{
  const task = { id: "task_44", title: "كتابة ملخص المقال", estimatedMinutes: 30, category: "كتابة" };
  const payload = Engine.createTimerLinkPayload(task);
  assert.strictEqual(payload.action, "LINK_TASK_TIMER");
  assert.strictEqual(payload.taskId, "task_44");
  assert.strictEqual(payload.taskTitle, "كتابة ملخص المقال");
  assert.strictEqual(payload.durationMinutes, 30);
  assert.strictEqual(payload.targetSeconds, 1800);
  assert.ok(payload.timestamp > 0);
  console.log("✓ Test 4: Focus Timer link payload contract verified.");
}

console.log("--- All Mission #044 Today Focus Task Tests PASSED (GREEN) ---");
