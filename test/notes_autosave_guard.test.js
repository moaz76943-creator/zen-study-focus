const assert = require('assert');
const { saveNoteSafely, getEmergencyDraft } = require('../android/app/src/main/assets/web/js/notes_autosave_guard.js');

console.log("--- Running 🎯 Mission #009: Notes AutoSave Guard Tests ---");

// Test 1: Successful Note Creation and Field Preservation
const memoryStorage = {};
const mockStorage = {
    setItem: (k, v) => { memoryStorage[k] = v; },
    getItem: (k) => memoryStorage[k] || null
};

let notes = [];
const note1 = {
    id: "note_101",
    title: "Arabic Study Plan",
    body: "ملاحظة دراسية باللغة العربية مع نصوص هامة",
    version: 1,
    legacy_custom_tag: "PRESERVE_THIS"
};

const res1 = saveNoteSafely(note1, notes, mockStorage);
assert.strictEqual(res1.success, true);
assert.strictEqual(res1.status, "PERSISTED");
assert.strictEqual(res1.note.version, 2);
assert.strictEqual(res1.note.legacy_custom_tag, "PRESERVE_THIS");
notes = JSON.parse(memoryStorage["zen_fortress_notes_v21"]);
console.log("✔ Test 1: Note saved and legacy fields preserved successfully.");

// Test 2: Reject Stale Revision (Conflict Prevention)
const staleNote = {
    id: "note_101",
    title: "Arabic Study Plan - Stale",
    body: "Old debounced callback text",
    version: 1 // Lower than current version (2)
};

const resStale = saveNoteSafely(staleNote, notes, mockStorage);
assert.strictEqual(resStale.success, false);
assert.strictEqual(resStale.reason, "STALE_VERSION_CONFLICT");
assert.strictEqual(resStale.preservedText, true);
console.log("✔ Test 2: Stale older draft prevented from overwriting newer note.");

// Test 3: Emergency Fallback on Storage Failure (Simulating out-of-disk/quota error)
const failingStorage = {
    setItem: () => { throw new Error("Disk quota exceeded / WebView storage full"); }
};

const note2 = {
    id: "note_102",
    title: "Critical Thesis Draft",
    body: "أفكار بحثية لا يجوز ضياعها إطلاقاً",
    version: 1
};

const resFail = saveNoteSafely(note2, notes, failingStorage);
assert.strictEqual(resFail.success, false);
assert.strictEqual(resFail.status, "SAVE_REJECTED_DRAFT_RETAINED");
assert.strictEqual(resFail.preservedText, true);

// Verify draft is stored in emergency buffer
const emergency = getEmergencyDraft();
assert.ok(emergency !== null);
assert.strictEqual(emergency.note.id, "note_102");
assert.strictEqual(emergency.note.body, "أفكار بحثية لا يجوز ضياعها إطلاقاً");
console.log("✔ Test 3: Save rejection caught cleanly, emergency draft retained safely.");

console.log("--- All Mission #009 Notes Tests PASSED (GREEN) ---");
