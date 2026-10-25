const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/today_focus_task_engine.js');

console.log("--- Running 🎯 Mission #044: Today Focus Task Engine Tests ---");
{
  const refDate = "2026-10-22";
  const mockTasks = [
    { id: "t1", title: "مراجعة كيمياء", dueDate: "2026-10-22", completed: false },
    { id: "t2", title: "حل تمرين متأخر", dueDate: "2026-10-20", completed: false },
    { id: "t3", title: "شراء قرطاسية", tags: ["#today"], completed: false },
    { id: "t4", title: "مشروع قادم", dueDate: "2026-10-28", completed: false },
    { id: "t5", title: "مهمة منجزة", dueDate: "2026-10-22", completed: true }
  ];
  const todayList = Engine.filterTodayTasks(mockTasks, { referenceDate: refDate });
  assert.strictEqual(todayList.length, 3);
  console.log("✓ Test 1: Multi-criteria Today task filtering verified.");
}
{
  const refDate = "2026-10-22";
  const mockTasks = [
    { id: "normal_today", dueDate: "2026-10-22", priority: "normal" },
    { id: "overdue_task", dueDate: "2026-10-19", priority: "high" },
    { id: "high_today", dueDate: "2026-10-22", priority: "high" }
  ];
  const sorted = Engine.filterTodayTasks(mockTasks, { referenceDate: refDate });
  assert.strictEqual(sorted[0].id, "overdue_task");
  assert.strictEqual(sorted[1].id, "high_today");
  assert.strictEqual(sorted[2].id, "normal_today");
  console.log("✓ Test 2: Priority ordering hierarchy strictly verified.");
}
{
  const str = Engine.getLocalCivilDateString(new Date("2026-10-22T10:00:00Z"));
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(str));
  console.log("✓ Test 3: Civil date string format verified.");
}
{
  const payload = Engine.createTimerLinkPayload({ id: "task_44", title: "ملخص", estimatedMinutes: 30 });
  assert.strictEqual(payload.action, "LINK_TASK_TIMER");
  assert.strictEqual(payload.targetSeconds, 1800);
  console.log("✓ Test 4: Focus Timer link payload contract verified.");
}
console.log("--- All Mission #044 Tests PASSED (GREEN) ---");
