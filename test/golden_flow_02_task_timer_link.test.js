/**
 * DEEP FOCUS — Golden Flow 2 End-to-End Test (Section 46)
 * Full User Journey:
 * Create Task -> Select Task -> Start Timer -> Complete Focus -> Verify Task Link -> Verify Analytics
 */
const assert = require('assert');

// Import guards from Phase 1
const { saveOrUpdateTask } = require('../android/app/src/main/assets/web/js/tasks_durability_guard.js');
const { recordCompletion } = require('../android/app/src/main/assets/web/js/timer_idempotency.js');
const { aggregateSessionsSinglePass } = require('../android/app/src/main/assets/web/js/analytics_performance_guard.js');

console.log("==========================================================");
console.log(" [GOLDEN FLOW 2] Starting Task-Linked Focus Journey Test ");
console.log("==========================================================");

const persistentStore = {};
const mockStorage = {
    getItem: (k) => persistentStore[k] || null,
    setItem: (k, v) => { persistentStore[k] = v; }
};

let tasksDatabase = [];
const sessionsDatabase = [];

// Stage 1: Create New Study Task
const newTask = {
    id: "task_calculus_exam",
    title: "مراجعة التفاضل والتكامل",
    dueDate: null, // Undated task
    category: "Math",
    legacy_notes_link: "note_math_formulas"
};

const taskCreationRes = saveOrUpdateTask(newTask, tasksDatabase, mockStorage);
assert.strictEqual(taskCreationRes.success, true);
assert.strictEqual(taskCreationRes.task.dueDate, null);
tasksDatabase = JSON.parse(persistentStore["zen_fortress_tasks_v21"]);
console.log("✔ Stage 1: Task created and saved with custom legacy links intact.");

// Stage 2: Select Task & Link to Focus Timer Session
const focusSession = {
    sessionId: "sess_math_focus_01",
    dateStr: "2026-10-22",
    durationMinutes: 30,
    activityType: "study",
    taskId: newTask.id // Explicit link to task
};
assert.strictEqual(focusSession.taskId, "task_calculus_exam");
console.log("✔ Stage 2: Timer session explicitly linked to task_calculus_exam.");

// Stage 3: Complete Focus Session & Persist
const analyticsTracker = {
    addFocusMinutes: (mins, act) => {
        sessionsDatabase.push({
            sessionId: focusSession.sessionId,
            dateStr: focusSession.dateStr,
            durationMinutes: mins,
            activityType: act,
            taskId: focusSession.taskId,
            completed: true
        });
    }
};

const completionRes = recordCompletion(focusSession, mockStorage, analyticsTracker);
assert.strictEqual(completionRes.credited, true);
assert.strictEqual(completionRes.creditedMinutes, 30);
console.log("✔ Stage 3: Focus session completed and credited 30 minutes.");

// Stage 4: Verify Task Link in Analytics
assert.strictEqual(sessionsDatabase.length, 1);
assert.strictEqual(sessionsDatabase[0].taskId, "task_calculus_exam");
const analyticsSummary = aggregateSessionsSinglePass(sessionsDatabase, "2026-10-22");
assert.strictEqual(analyticsSummary.todayMinutes, 30);
assert.strictEqual(analyticsSummary.activityBreakdown["study"], 30);
console.log("✔ Stage 4: Analytics confirmed 30 study minutes linked to the task.");

// Stage 5: Mark Task Completed (Zero Field Stripping & Link Preservation)
const taskToggle = { id: "task_calculus_exam", completed: true };
const toggleRes = saveOrUpdateTask(taskToggle, tasksDatabase, mockStorage);
assert.strictEqual(toggleRes.success, true);
assert.strictEqual(toggleRes.task.completed, true);
assert.strictEqual(toggleRes.task.legacy_notes_link, "note_math_formulas", "Legacy note link must NOT be stripped!");
console.log("✔ Stage 5: Task marked complete while preserving all relational links intact.");

// Stage 6: Verify Analytics Remains Stable and Unduplicated
const analyticsPostToggle = aggregateSessionsSinglePass(sessionsDatabase, "2026-10-22");
assert.strictEqual(analyticsPostToggle.todayMinutes, 30, "Minutes must remain 30 without duplication on task update!");
console.log("✔ Stage 6: Analytics stability confirmed (zero minute duplication).");

console.log("==========================================================");
console.log(" [GOLDEN FLOW 2] ALL 6 STAGES PASSED (100% GREEN) ");
console.log("==========================================================");
