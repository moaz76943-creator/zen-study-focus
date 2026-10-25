const assert = require('assert');
const {
    sanitizeToWesternDigits,
    formatTimerDisplay,
    formatPercentage,
    formatDateStamp,
    containsOnlyWesternDigits
} = require('../android/app/src/main/assets/web/js/numeral_invariant_guard.js');

console.log("--- Running 🎯 Mission #007: Western Digits & RTL Tests ---");

// Test 1: Sanitize Eastern & Persian Digits to Western 0123456789
const easternInput = "جلسة رقم ١٠٥ مدتها ٢٥ دقيقة";
const sanitized = sanitizeToWesternDigits(easternInput);
assert.strictEqual(sanitized, "جلسة رقم 105 مدتها 25 دقيقة");
assert.ok(containsOnlyWesternDigits(sanitized));
console.log("✔ Test 1: Eastern Arabic digits accurately converted to Western digits.");

// Test 2: Persian digits conversion
const persianInput = "تمرین شماره ۱۲۳۴ با درصد ۱۰۰٪";
const sanitizedFa = sanitizeToWesternDigits(persianInput);
assert.strictEqual(sanitizedFa, "تمرین شماره 1234 با درصد 100٪");
console.log("✔ Test 2: Persian digits accurately converted to Western digits.");

// Test 3: Timer Display Formatting (Must be Western with LTR marks)
const timerStr = formatTimerDisplay(1500); // 25 mins
assert.ok(timerStr.includes("25:00"));
assert.ok(timerStr.startsWith("\u200E") && timerStr.endsWith("\u200E"));
assert.ok(containsOnlyWesternDigits(timerStr));
console.log("✔ Test 3: Timer displays strictly '25:00' with LTR isolation for RTL contexts.");

// Test 4: Percentage Formatting
const pctStr = formatPercentage(100);
assert.ok(pctStr.includes("100%"));
assert.ok(containsOnlyWesternDigits(pctStr));
console.log("✔ Test 4: Percentage displays strictly '100%' with LTR isolation.");

// Test 5: Date Formatting
const dateStr = formatDateStamp(new Date(2026, 9, 22)); // 2026-10-22
assert.strictEqual(dateStr, "2026-10-22");
assert.ok(containsOnlyWesternDigits(dateStr));
console.log("✔ Test 5: Date stamp displays strictly '2026-10-22'.");

// Test 6: Invariant Verification on Section 20 Benchmark Tokens
const benchmarks = ["0", "9", "10", "100", "1234", "00:05", "100%", "2026-10-22"];
benchmarks.forEach(tok => {
    assert.ok(containsOnlyWesternDigits(tok), `Benchmark token ${tok} must be Western only.`);
});
console.log("✔ Test 6: All Section 20 benchmark tokens verified.");

console.log("--- All Mission #007 Numeral Tests PASSED (GREEN) ---");
