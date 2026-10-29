/**
 * DEEP FOCUS — Golden Flow 3 End-to-End Test (Section 46)
 * Full User Journey:
 * Create Note -> Type Long Text -> Autosave -> Force Stop -> Reopen -> Verify Note
 */
const assert = require('assert');

// Import guards from Phase 1
const { saveNoteSafely } = require('../android/app/src/main/assets/web/js/notes_autosave_guard.js');
const { bootstrapApplication, safeReadStorageKey } = require('../android/app/src/main/assets/web/js/startup_reliability_guard.js');

console.log("==========================================================");
console.log(" [GOLDEN FLOW 3] Starting Long Note Crash Recovery Test   ");
console.log("==========================================================");

(async () => {
    // Persistent Storage Simulation
    const persistentStore = {};
    const mockStorage = {
        getItem: (k) => persistentStore[k] || null,
        setItem: (k, v) => { persistentStore[k] = v; }
    };

    let notesDatabase = [];

    // Stage 1: Create New Note Container
    const noteId = "note_academic_thesis_01";
    const initialNote = {
        id: noteId,
        title: "مخطط الأطروحة: فيزياء الكم والتركيز الذهني",
        body: "",
        tags: ["أبحاث", "فيزياء", "تركيز"],
        version: 1
    };

    const res1 = saveNoteSafely(initialNote, notesDatabase, mockStorage);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.status, "PERSISTED");
    notesDatabase = JSON.parse(persistentStore["zen_fortress_notes_v21"]);
    console.log(`✔ Stage 1: Initial note created with version ${res1.note.version}.`);

    // Stage 2: Type Long Multi-Paragraph Arabic & Mixed Text
    const longArabicContent = `
بسم الله الرحمن الرحيم.
الفصل الأول: الإطار النظري وتطبيقات التركيز العميق (Deep Work).
إن القدرة على توجيه الانتباه نحو معضلة فكرية واحدة دون تشتت تعد المهارة الأساسية في العصر الحديث.
الهدف من هذه الدراسة هو قياس أثر فترات التركيز البالغة 25 دقيقة (Pomodoro Technique) مع فترات راحة منتظمة مدتها 5 دقائق على صفاء الذهن واستيعاب المعادلات الرياضية المعقدة.
المعادلة الأساسية المقترحة: E = mc^2 + \\int_{0}^{T} \\psi(t) dt.
ملاحظات التجربة رقم 104 بتاريخ 2026-10-22:
- تم تحقيق استقرار ذهني ملحوظ عند تشغيل أصوات الطبيعة (أمواج البحر الهادئة).
- لم يتم تسجيل أي انقطاع في الأفكار.
- التوصية: الاستمرار على وتيرة 4 جولات يومياً مع الحفاظ على الأرقام الغربية 0123456789 في التوثيق.
نهاية الملخص المبدئي.
`.trim();

    assert.ok(longArabicContent.length > 500);
    console.log(`✔ Stage 2: Long Arabic text prepared (${longArabicContent.length} characters).`);

    // Stage 3: AutoSave with Current Revision (Honoring Conflict Guard)
    const updatedDraft = {
        ...res1.note, // Preserves latest version (version 2)
        body: longArabicContent
    };

    const saveRes = saveNoteSafely(updatedDraft, notesDatabase, mockStorage);
    assert.strictEqual(saveRes.success, true, "AutoSave must succeed when version matches current state.");
    assert.strictEqual(saveRes.status, "PERSISTED");
    console.log(`✔ Stage 3: AutoSave confirmed and persisted (Advanced to version ${saveRes.note.version}).`);

    // Stage 4: Simulate Force Stop (Complete process death / memory purge)
    console.log("[*] Simulating OS Process Kill / Force Stop...");
    notesDatabase = null; // Memory wiped completely!

    // Stage 5: Reopen Application via Safe Bootstrap
    let appReady = false;
    await bootstrapApplication(
        async () => { /* Core storage mounted */ },
        [],
        { onDismissSplash: () => { appReady = true; } }
    );
    assert.strictEqual(appReady, true);
    console.log("✔ Stage 5: Application reopened via safe bootstrap.");

    // Stage 6: Retrieve Note and Verify Text Integrity
    const reloadedNotes = safeReadStorageKey(mockStorage, "zen_fortress_notes_v21", []);
    assert.strictEqual(Array.isArray(reloadedNotes), true);
    assert.strictEqual(reloadedNotes.length, 1);

    const recoveredNote = reloadedNotes[0];
    assert.strictEqual(recoveredNote.id, noteId);
    assert.strictEqual(recoveredNote.title, "مخطط الأطروحة: فيزياء الكم والتركيز الذهني");
    assert.strictEqual(recoveredNote.body, longArabicContent, "Recovered text must match original 100%!");
    assert.deepStrictEqual(recoveredNote.tags, ["أبحاث", "فيزياء", "تركيز"]);
    console.log("✔ Stage 6: Full text and Arabic encoding recovered with 100% fidelity.");

    console.log("==========================================================");
    console.log(" [GOLDEN FLOW 3] ALL 6 STAGES PASSED (100% GREEN) ");
    console.log("==========================================================");
})();
