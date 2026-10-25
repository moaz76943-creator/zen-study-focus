const assert = require('assert');
const { saveOrUpdateTask, categorizeTask } = require('../android/app/src/main/assets/web/js/tasks_durability_guard.js');

console.log("--- Running 🎯 Mission #010: Tasks Durability Guard Tests ---");

const memoryStorage = {};
const mockStorage = {
    setItem: (k, v) => { memoryStorage[k] = v; },
    getItem: (k) => memoryStorage[k] || null
};

let tasks = [];

// Test 1: Create Task Without Due Date (Must remain null, never fabricated)
const taskNoDate = {
    id: "task_001",
    title: "Read Chapter 4",
    dueDate: "", // Empty input from user
    legacy_custom_project_tag: "RESEARCH_PROJECT"
};

const res1 = saveOrUpdateTask(taskNoDate, tasks, mockStorage);
assert.strictEqual(res1.success, true);
assert.strictEqual(res1.task.dueDate, null, "Due date must remain null, never auto-filled.");
assert.strictEqual(res1.task.legacy_custom_project_tag, "RESEARCH_PROJECT");
tasks = JSON.parse(memoryStorage["zen_fortress_tasks_v21"]);
console.log("✔ Test 1: Task created without due date preserved strictly as null.");

// Test 2: Categorization of Undated Task (Must be 'no_date', NEVER 'overdue')
const category = categorizeTask(res1.task, "2026-10-22");
assert.strictEqual(category, "no_date");
assert.notStrictEqual(category, "overdue", "Undated task must NEVER leak into overdue!");
console.log("✔ Test 2: Undated task accurately categorized as 'no_date' without leaking into overdue.");

// Test 3: Toggle Task Completion Preserving All Fields (Zero Field Stripping)
const taskWithSubtasks = {
    id: "task_002",
    title: "Project Alpha",
    dueDate: "2026-10-25",
    subtasks: [{ id: "sub_1", title: "Step 1", done: false }],
    repeatRule: "WEEKLY",
    unknown_future_field: "KEEP_ME_SAFE"
};

saveOrUpdateTask(taskWithSubtasks, tasks, mockStorage);
tasks = JSON.parse(memoryStorage["zen_fortress_tasks_v21"]);

// Now toggle completed
const toggleUpdate = { id: "task_002", completed: true };
const resToggle = saveOrUpdateTask(toggleUpdate, tasks, mockStorage);

assert.strictEqual(resToggle.success, true);
assert.strictEqual(resToggle.task.completed, true);
assert.strictEqual(resToggle.task.subtasks.length, 1);
assert.strictEqual(resToggle.task.repeatRule, "WEEKLY");
assert.strictEqual(resToggle.task.unknown_future_field, "KEEP_ME_SAFE");
console.log("✔ Test 3: Legacy subtasks and repeat rules preserved 100% on completion toggle.");

console.log("--- All Mission #010 Tasks Tests PASSED (GREEN) ---");
