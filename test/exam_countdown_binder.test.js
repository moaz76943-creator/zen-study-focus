const assert = require('assert');
const Binder = require('../android/app/src/main/assets/web/js/exam_countdown_binder.js');

console.log("--- Running 🎯 Mission #083: Exam Countdown Binder Tests ---");

// Test 1: Calculates exact days remaining across civil dates without timezone drift
{
  assert.strictEqual(Binder.calculateDaysRemaining("2026-11-01", "2026-10-22"), 10, "Oct 22 to Nov 1 = 10 days");
  assert.strictEqual(Binder.calculateDaysRemaining("2026-10-22", "2026-10-22"), 0, "Same day = 0 days");
  assert.strictEqual(Binder.calculateDaysRemaining("2026-10-20", "2026-10-22"), -2, "Past date = -2 days");
  console.log("✓ Test 1: Civil days remaining calculation verified.");
}

// Test 2: Progress percentage toward study hours goal
{
  const goal = {
    title: "امتحان الفيزياء النهائية",
    targetDateStr: "2026-11-15",
    targetHours: 50,
    loggedMinutes: 1500 // 25 hours
  };
  const metrics = Binder.evaluateExamCountdown(goal, "2026-10-22");
  assert.strictEqual(metrics.daysRemaining, 24);
  assert.strictEqual(metrics.loggedHours, 25);
  assert.strictEqual(metrics.goalHours, 50);
  assert.strictEqual(metrics.progressPercent, 50, "25 / 50 hrs = 50%");
  console.log("✓ Test 2: Study hours progress percentage calculation verified.");
}

// Test 3: Mindful readiness tier classification
{
  assert.strictEqual(Binder.getReadinessTier(45).id, "relaxed");
  assert.strictEqual(Binder.getReadinessTier(20).id, "steady");
  assert.strictEqual(Binder.getReadinessTier(7).id, "focused");
  assert.strictEqual(Binder.getReadinessTier(1).id, "zen_readiness");
  assert.strictEqual(Binder.getReadinessTier(0).id, "zen_readiness");
  console.log("✓ Test 3: Mindful readiness tier classification verified.");
}

// Test 4: Passed deadline handling & Today badge
{
  const todayExam = { title: "اختبار فصلي", targetDateStr: "2026-10-22" };
  const todayRes = Binder.evaluateExamCountdown(todayExam, "2026-10-22");
  assert.strictEqual(todayRes.isToday, true);
  assert.strictEqual(todayRes.badgeTextAr, "موعد الامتحان اليوم!");

  const pastExam = { title: "اختبار قديم", targetDateStr: "2026-10-10" };
  const pastRes = Binder.evaluateExamCountdown(pastExam, "2026-10-22");
  assert.strictEqual(pastRes.isPassed, true);
  assert.strictEqual(pastRes.badgeTextAr, "انتهى الموعد");
  console.log("✓ Test 4: Passed deadline and Today badge verified.");
}

// Test 5: Western digits and XML sanitization
{
  const exam = { title: "<b>رياضيات</b>", targetDateStr: "2026-10-30" };
  const res = Binder.evaluateExamCountdown(exam, "2026-10-22");
  assert.strictEqual(res.title, "bرياضيات/b");
  assert.ok(res.badgeTextAr.includes("\u200E8 يوماً"));
  console.log("✓ Test 5: Western digits and HTML sanitization verified.");
}

console.log("--- All Mission #083 Tests PASSED (GREEN) ---");
