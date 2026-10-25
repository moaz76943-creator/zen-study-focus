const assert = require('assert');
const { validateAndParseBackup, BACKUP_MARKER } = require('../android/app/src/main/assets/web/js/saf_validator.js');

console.log("--- Running SAF Import Guard Test Suite ---");

// Test 1: User cancels picker or returns null
const resCancel = validateAndParseBackup(null);
assert.strictEqual(resCancel.success, false);
assert.strictEqual(resCancel.reason, "PICKER_CANCELLED_OR_EMPTY");
assert.strictEqual(resCancel.preserved, true);
console.log("✔ Test 1: Picker Cancel handles safely without touching data.");

// Test 2: Missing or corrupted ZEN21:: marker
const resBadMarker = validateAndParseBackup("CORRUPT::{\"tasks\":[]}");
assert.strictEqual(resBadMarker.success, false);
assert.strictEqual(resBadMarker.reason, "INVALID_BACKUP_MARKER");
assert.strictEqual(resBadMarker.preserved, true);
console.log("✔ Test 2: Invalid marker rejected safely.");

// Test 3: Malformed JSON payload
const resBadJson = validateAndParseBackup(BACKUP_MARKER + "{malformed:json,");
assert.strictEqual(resBadJson.success, false);
assert.strictEqual(resBadJson.reason, "MALFORMED_JSON");
assert.strictEqual(resBadJson.preserved, true);
console.log("✔ Test 3: Malformed JSON caught prior to storage modification.");

// Test 4: Valid payload with unknown legacy fields (Data Durability Invariant)
const validPayload = BACKUP_MARKER + JSON.stringify({
    zen_fortress_tasks_v21: [{ id: "task_1", title: "Study" }],
    zen_fortress_notes_v21: [{ id: "note_1", body: "Important note" }],
    custom_user_future_field: "DO_NOT_STRIP_ME"
});

const resValid = validateAndParseBackup(validPayload);
assert.strictEqual(resValid.success, true);
assert.strictEqual(resValid.data.zen_fortress_tasks_v21.length, 1);
assert.strictEqual(resValid.data.legacy_passthrough.custom_user_future_field, "DO_NOT_STRIP_ME");
console.log("✔ Test 4: Valid payload accepted and legacy fields preserved completely.");

console.log("--- All SAF Guard Tests PASSED (GREEN) ---");
