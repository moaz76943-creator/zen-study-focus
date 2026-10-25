const assert = require('assert');
const Importer = require('../android/app/src/main/assets/web/js/plain_text_task_importer.js');
const TodayEngine = require('../android/app/src/main/assets/web/js/today_focus_task_engine.js');

console.log("--- Running 🎯 Golden Flow 08: Tasks Import -> Today Filter -> Timer Link ---");

// Step 1: Batch import raw text checklist
const rawInput = `
  - [ ] حل تدريبات فيزياء الكم #دراسة !high
  - [ ] قراءة 20 صفحة من الرواية #قراءة
  - [x] مهمة سابقة منجزة
`;
const importedTasks = Importer.parseBatchText(rawInput);
assert.strictEqual(importedTasks.length, 3);
assert.strictEqual(importedTasks[0].title, "حل تدريبات فيزياء الكم");
assert.strictEqual(importedTasks[0].priority, "high");
assert.deepStrictEqual(importedTasks[0].tags, ["دراسة"]);

// Step 2: Merge into existing fortress tasks and set due date for today
const todayStr = TodayEngine.getLocalCivilDateString(new Date());
importedTasks[0].dueDate = todayStr;

const mergeRes = Importer.mergeImportedTasks([], importedTasks);
assert.strictEqual(mergeRes.addedCount, 3);

// Step 3: Filter for today's active tasks
const todayFocusList = TodayEngine.filterTodayTasks(mergeRes.mergedList, { referenceDate: todayStr });
assert.ok(todayFocusList.length >= 1);
assert.strictEqual(todayFocusList[0].id, importedTasks[0].id);

// Step 4: Dispatch timer link payload
const timerPayload = TodayEngine.createTimerLinkPayload(todayFocusList[0], 45);
assert.strictEqual(timerPayload.action, "LINK_TASK_TIMER");
assert.strictEqual(timerPayload.taskTitle, "حل تدريبات فيزياء الكم");
assert.strictEqual(timerPayload.targetSeconds, 2700);

console.log("✓ Golden Flow 08: Full Import -> Today Scheduling -> Timer Link PASSED (GREEN)");
