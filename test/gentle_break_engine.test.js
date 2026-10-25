const assert = require('assert');
const {
    getBreakSuggestion,
    BREAK_SUGGESTIONS
} = require('../android/app/src/main/assets/web/js/gentle_break_engine.js');
const { containsOnlyWesternDigits } = require('../android/app/src/main/assets/web/js/numeral_invariant_guard.js');

console.log("--- Running 🎯 Mission #031: Gentle Breaks Tests ---");

// Test 1: Short Break (5 mins) yields SHORT cue in Arabic
const shortCueAr = getBreakSuggestion(5, "ar", 0);
assert.ok(shortCueAr !== null);
assert.strictEqual(shortCueAr.type, "SHORT");
assert.ok(shortCueAr.text.includes("20 ثانية"));
assert.ok(containsOnlyWesternDigits(shortCueAr.text), "Must preserve Western digits 20 in Arabic text!");
assert.strictEqual(shortCueAr.nonIntrusive, true);
console.log(`✔ Test 1: Short break cue generated in Arabic: "${shortCueAr.text}"`);

// Test 2: Long Break (15 mins) yields LONG cue in Arabic
const longCueAr = getBreakSuggestion(15, "ar", 0);
assert.ok(longCueAr !== null);
assert.strictEqual(longCueAr.type, "LONG");
assert.ok(longCueAr.text.includes("ابتعد عن الشاشات"));
console.log(`✔ Test 2: Long break cue generated in Arabic: "${longCueAr.text}"`);

// Test 3: Short Break in English
const shortCueEn = getBreakSuggestion(5, "en", 1);
assert.strictEqual(shortCueEn.type, "SHORT");
assert.ok(shortCueEn.text.includes("water"));
console.log(`✔ Test 3: Short break cue generated in English: "${shortCueEn.text}"`);

// Test 4: Verification against pseudoscientific medical terms (Section 38 Invariant)
const forbiddenTerms = ["علاج", "شفاء", "مرض", "طبي", "psychiatric", "cure", "clinical"];
BREAK_SUGGESTIONS.forEach(cue => {
    forbiddenTerms.forEach(term => {
        assert.ok(!cue.text_ar.includes(term), `Cue ${cue.id} must NOT make medical claims (${term})`);
        assert.ok(!cue.text_en.toLowerCase().includes(term), `Cue ${cue.id} must NOT make medical claims (${term})`);
    });
});
console.log("✔ Test 4: All cues strictly verified to be free of medical/clinical claims.");

console.log("--- All Mission #031 Gentle Breaks Tests PASSED (GREEN) ---");
