const assert = require('assert');
const Importer = require('../android/app/src/main/assets/web/js/plain_text_task_importer.js');

console.log("--- Running 🎯 Mission #055: Plain Text Task Importer Tests ---");

// Test 1: Markdown checklist parsing (- [ ] and - [x])
{
  const line1 = "- [ ] مراجعة القواعد النحوية";
  const task1 = Importer.parseTaskLine(line1);
  assert.strictEqual(task1.title, "مراجعة القواعد النحوية");
  assert.strictEqual(task1.completed, false);

  const line2 = "- [x] حل مسائل الرياضيات";
  const task2 = Importer.parseTaskLine(line2);
  assert.strictEqual(task2.title, "حل مسائل الرياضيات");
  assert.strictEqual(task2.completed, true);
  console.log("✓ Test 1: Markdown checklist states (- [ ] / - [x]) verified.");
}

// Test 2: Inline #tags and !priority extraction
{
  const line = "* كتابة التقرير النهائي #جامعة #مهم !high";
  const task = Importer.parseTaskLine(line);
  assert.strictEqual(task.title, "كتابة التقرير النهائي");
  assert.strictEqual(task.priority, "high");
  assert.deepStrictEqual(task.tags, ["جامعة", "مهم"]);
  console.log("✓ Test 2: Inline #tags and !priority flag extraction verified.");
}

// Test 3: Batch text multi-line parsing with Arabic priority (!عالية)
{
  const rawText = `
    - [ ] مهمة أولى #دراسة
    * مهمة ثانية !عالية
    3. مهمة ثالثة
    
    - [x] مهمة رابعة منجزة
  `;
  const tasks = Importer.parseBatchText(rawText);
  assert.strictEqual(tasks.length, 4, "Must parse 4 valid tasks, ignoring empty lines");
  assert.strictEqual(tasks[0].tags[0], "دراسة");
  assert.strictEqual(tasks[1].priority, "high", "Arabic !عالية must parse strictly to 'high'");
  assert.strictEqual(tasks[3].completed, true);
  console.log("✓ Test 3: Multi-line batch text parsing with Arabic priorities verified.");
}

// Test 4: Deduplication when merging with existing tasks
{
  const existing = [{ id: "t_old", title: "مهمة سابقة", completed: false }];
  const incoming = [
    { id: "t_new1", title: "مهمة سابقة" },
    { id: "t_new2", title: "مهمة جديدة فريدة" }
  ];

  const res = Importer.mergeImportedTasks(existing, incoming);
  assert.strictEqual(res.mergedList.length, 2);
  assert.strictEqual(res.addedCount, 1);
  assert.strictEqual(res.mergedList[1].title, "مهمة جديدة فريدة");
  console.log("✓ Test 4: Merge deduplication verified.");
}

// Test 5: Malformed input and HTML sanitization
{
  const dirty = "  <b>مهمة مع وسم</b> <script>alert(1)</script> ";
  const clean = Importer.parseTaskLine(dirty);
  assert.strictEqual(clean.title, "bمهمة مع وسم/b scriptalert(1)/script");

  const emptyRes = Importer.parseBatchText("");
  assert.deepStrictEqual(emptyRes, []);
  console.log("✓ Test 5: Sanitization and empty input resilience verified.");
}

console.log("--- All Mission #055 Tests PASSED (GREEN) ---");
