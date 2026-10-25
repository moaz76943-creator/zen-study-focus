const assert = require('assert');
const SearchEngine = require('../android/app/src/main/assets/web/js/unified_quick_search_engine.js');

console.log("--- Running 🎯 Mission #034: Unified Quick Search Tests ---");

// Test 1: Arabic diacritics & letter normalization
{
  const norm1 = SearchEngine.normalizeText("مُذَاكَرَةُ الرِّيَاضِيَّاتِ");
  const norm2 = SearchEngine.normalizeText("مذاكره الرياضيات");
  assert.strictEqual(norm1, norm2, "Arabic normalization must match diacritic and teh marbuta variations");
  console.log("✓ Test 1: Arabic normalization & diacritics stripping verified.");
}

// Test 2: Unified multi-source search across tasks, notes, sessions
{
  const mockDatasets = {
    tasks: [
      { id: "t1", title: "مراجعة خوارزميات البحث", completed: false, tags: ["دراسة"] },
      { id: "t2", title: "شراء حاسوب محمول", completed: true }
    ],
    notes: [
      { id: "n1", title: "ملخص خوارزميات الرسم البياني", content: "تطبيق البحث في العرض والعمق", tags: ["علم_حاسوب"] },
      { id: "n2", title: "أفكار مشاريع", content: "تطبيق تايمر هادئ" }
    ],
    sessions: [
      { id: "s1", label: "جلسة خوارزميات مكثفة", durationMinutes: 45, date: "2026-10-22" }
    ]
  };

  const res = SearchEngine.searchAll("خوارزميات", mockDatasets);
  assert.strictEqual(res.totalMatches, 3, "Expected 3 matches across tasks, notes, and sessions");
  
  const types = res.results.map(r => r.type);
  assert.ok(types.includes('task'), "Must include task hit");
  assert.ok(types.includes('note'), "Must include note hit");
  assert.ok(types.includes('session'), "Must include session hit");
  console.log("✓ Test 2: Multi-source search across tasks, notes, and sessions verified.");
}

// Test 3: Title match ranks higher than body match
{
  const mockNotes = {
    notes: [
      { id: "n_body", title: "ملاحظات عشوائية", content: "هنا نذكر كلمة فيزياء في السطر الأخير" },
      { id: "n_title", title: "مسائل فيزياء نووية", content: "حل التمارين رقم 5 و 6" }
    ]
  };

  const res = SearchEngine.searchAll("فيزياء", mockNotes);
  assert.strictEqual(res.results.length, 2);
  assert.strictEqual(res.results[0].id, "n_title", "Title match must score higher than body-only match");
  assert.ok(res.results[0].score > res.results[1].score);
  console.log("✓ Test 3: Relevance scoring hierarchy verified.");
}

// Test 4: Safe handling of empty queries & special characters (No ReDoS/Crash)
{
  const emptyRes = SearchEngine.searchAll("   ", { tasks: [{ title: "مهمة" }] });
  assert.strictEqual(emptyRes.totalMatches, 0);

  const specialRes = SearchEngine.searchAll("[.*+?^${}()|/\\#@!]", { tasks: [{ title: "مهمة عادية" }] });
  assert.strictEqual(specialRes.totalMatches, 0);
  console.log("✓ Test 4: Safe query sanitization & zero crash on special characters verified.");
}

console.log("--- All Mission #034 Quick Search Tests PASSED (GREEN) ---");
