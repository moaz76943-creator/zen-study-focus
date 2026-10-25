const assert = require('assert');
const Scheduler = require('../android/app/src/main/assets/web/js/gentle_notification_scheduler.js');

console.log("--- Running 🎯 Mission #045: Gentle Notification Scheduler Tests ---");
{
  assert.strictEqual(Scheduler.isWithinQuietHours(23, 22, 7), true, "23:00 is inside 22-07 quiet hours");
  assert.strictEqual(Scheduler.isWithinQuietHours(3, 22, 7), true, "03:00 is inside 22-07 quiet hours");
  assert.strictEqual(Scheduler.isWithinQuietHours(14, 22, 7), false, "14:00 is outside 22-07 quiet hours");
  console.log("✓ Test 1: Overnight quiet hours window detection verified.");
}
{
  const res = Scheduler.evaluateReminderDispatch(
    { enabled: true, titleAr: "تذكير القراءة" },
    { isSessionActive: true, currentHour24: 15 }
  );
  assert.strictEqual(res.shouldTrigger, false);
  assert.strictEqual(res.status, "DEFERRED_ACTIVE_SESSION");
  console.log("✓ Test 2: Active session reminder deferral verified.");
}
{
  const res = Scheduler.evaluateReminderDispatch(
    { enabled: true, titleAr: "جلسة المساء", hour24: 18, minute: 30 },
    { isSessionActive: false, currentHour24: 18, quietStartHour: 22, quietEndHour: 7 }
  );
  assert.strictEqual(res.shouldTrigger, true);
  assert.strictEqual(res.status, "READY_TO_TRIGGER");
  assert.strictEqual(res.formattedTime, "\u200E18:30");
  console.log("✓ Test 3: Normal reminder dispatch & Western time formatting verified.");
}
{
  const nightRes = Scheduler.evaluateReminderDispatch(
    { enabled: true, hour24: 2 },
    { isSessionActive: false, currentHour24: 2, quietStartHour: 22, quietEndHour: 7 }
  );
  assert.strictEqual(nightRes.shouldTrigger, false);
  assert.strictEqual(nightRes.status, "SUPPRESSED_QUIET_HOURS");
  console.log("✓ Test 4: Night sleep hours suppression verified.");
}
console.log("--- All Mission #045 Tests PASSED (GREEN) ---");
