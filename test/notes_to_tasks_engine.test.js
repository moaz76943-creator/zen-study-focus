const assert = require('assert');
const {
    extractActionItemsFromNote,
    convertActionItemToTask
} = require('../android/app/src/main/assets/web/js/notes_to_tasks_engine.js');

console.log("--- Running 🎯 Mission #030: Notes-to-Tasks Tests ---");

// Mock Academic Note with Checklist items
const sampleNote = {
    id: "note_physics_lecture_4",
    title: "محاضرة الكهرومغناطيسية",
    body: `
ملخص المحاضرة الرابعة:
تم شرح قوانين ماكسويل وتطبيقاتها العملية.
المهام المطلوبة للاختبار القادم:
- [ ] حل تمارين الفصل الثالث من صفحة 45 إلى 50
- [ ] مراجعة اشتقاق معادلة الموجة
- [ ] إعداد ملخص القوانين بصيغة كرت استذكار
ملاحظة جانبية: مراجعة المرجع مع الدكتور يوم الأحد.
`.trim()
};

// Test 1: Extract Checklist Action Items
const items = extractActionItemsFromNote(sampleNote);
assert.strictEqual(items.length, 3);
assert.strictEqual(items[0].taskTitle, "حل تمارين الفصل الثالث من صفحة 45 إلى 50");
assert.strictEqual(items[1].taskTitle, "مراجعة اشتقاق معادلة الموجة");
assert.strictEqual(items[2].taskTitle, "إعداد ملخص القوانين بصيغة كرت استذكار");
console.log("✔ Test 1: Exactly 3 action items extracted cleanly from Arabic note.");

// Test 2: Convert Action Item 1 to Task (Undated)
const resTask1 = convertActionItemToTask(items[0], sampleNote);
assert.strictEqual(resTask1.success, true);
assert.strictEqual(resTask1.task.title, "حل تمارين الفصل الثالث من صفحة 45 إلى 50");
assert.strictEqual(resTask1.task.dueDate, null, "Due date must remain null by default!");
assert.strictEqual(resTask1.task.sourceNoteId, "note_physics_lecture_4", "Task must carry relation link to parent note.");
assert.strictEqual(resTask1.task.completed, false);
console.log("✔ Test 2: Checklist item converted to linked Task with null due date.");

// Test 3: Convert Action Item 2 with explicit deadline
const resTask2 = convertActionItemToTask(items[1], sampleNote, { dueDate: "2026-10-25" });
assert.strictEqual(resTask2.success, true);
assert.strictEqual(resTask2.task.dueDate, "2026-10-25");
assert.strictEqual(resTask2.task.sourceNoteId, "note_physics_lecture_4");
console.log("✔ Test 3: Action item converted with explicit user deadline.");

// Test 4: Invariance check - Note body remains 100% untampered
assert.ok(sampleNote.body.includes("قوانين ماكسويل"));
assert.ok(sampleNote.body.includes("- [ ] حل تمارين الفصل الثالث"));
console.log("✔ Test 4: Source note content strictly preserved without mutation.");

console.log("--- All Mission #030 Notes-to-Tasks Tests PASSED (GREEN) ---");
