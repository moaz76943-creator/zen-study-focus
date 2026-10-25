const assert = require('assert');
const {
    isLeapYear,
    addDaysSafe,
    addMonthsSafe,
    getTasksForDate
} = require('../android/app/src/main/assets/web/js/calendar_timezone_guard.js');

console.log("--- Running 🎯 Mission #011: Calendar Timezone & DST Tests ---");

// Test 1: Leap Year calculations
assert.strictEqual(isLeapYear(2024), true);
assert.strictEqual(isLeapYear(2026), false);
assert.strictEqual(isLeapYear(2028), true);
assert.strictEqual(isLeapYear(2000), true);
assert.strictEqual(isLeapYear(1900), false);
console.log("✔ Test 1: Leap year formula verified.");

// Test 2: Month transition across year boundary
const dec31 = "2026-12-31";
const jan01 = addDaysSafe(dec31, 1);
assert.strictEqual(jan01, "2027-01-01");

const jan01Back = addDaysSafe(jan01, -1);
assert.strictEqual(jan01Back, "2026-12-31");
console.log("✔ Test 2: Safe day navigation across year boundaries verified.");

// Test 3: Month Overflow Guard (Jan 31 + 1 month in non-leap year 2026 -> Feb 28)
const jan31_2026 = "2026-01-31";
const febTarget_2026 = addMonthsSafe(jan31_2026, 1);
assert.strictEqual(febTarget_2026, "2026-02-28", "Must clamp to Feb 28, NEVER overflow to March 3!");
console.log("✔ Test 3: Month overflow clamp verified on non-leap year (Jan 31 -> Feb 28).");

// Test 4: Month Overflow Guard in leap year 2028 (Jan 31 -> Feb 29)
const jan31_2028 = "2028-01-31";
const febTarget_2028 = addMonthsSafe(jan31_2028, 1);
assert.strictEqual(febTarget_2028, "2028-02-29", "Must clamp to Feb 29 on leap year!");
console.log("✔ Test 4: Month overflow clamp verified on leap year (Jan 31 -> Feb 29).");

// Test 5: Exact task matching to calendar day (Zero Timezone Shift)
const tasks = [
    { id: "t1", title: "Study Physics", dueDate: "2026-10-22" },
    { id: "t2", title: "Workout", dueDate: "2026-10-23" },
    { id: "t3", title: "Someday Task", dueDate: null } // Undated
];

const matched = getTasksForDate(tasks, "2026-10-22");
assert.strictEqual(matched.length, 1);
assert.strictEqual(matched[0].id, "t1");
console.log("✔ Test 5: Tasks matched accurately to calendar date without timezone drift.");

console.log("--- All Mission #011 Calendar Tests PASSED (GREEN) ---");
