const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/post_session_reflection_engine.js');

console.log("--- Running 🎯 Mission #041: Post-Session Reflection Tests ---");

// Test 1: Clean default reflection state & valid contract
{
  const def = Engine.createDefaultReflection();
  assert.strictEqual(def.skipped, false);
  assert.strictEqual(def.rating, 4);
  assert.strictEqual(def.energy, 'medium');
  assert.strictEqual(def.focusQuality, 'steady');
  assert.ok(def.timestamp > 0);
  console.log("✓ Test 1: Default reflection schema contract verified.");
}

// Test 2: Safe attachment of reflection to completed session
{
  const mockSession = {
    id: "sess_101",
    durationMinutes: 25,
    label: "قراءة فيزياء",
    date: "2026-10-22"
  };

  const reflectionInput = {
    rating: 5,
    energy: "high",
    focusQuality: "deep_flow",
    takeaway: "تم إنجاز الفصل الثالث بتركيز كامل"
  };

  const updatedSession = Engine.attachReflectionToSession(mockSession, reflectionInput);
  assert.strictEqual(updatedSession.id, "sess_101");
  assert.strictEqual(updatedSession.durationMinutes, 25);
  assert.ok(updatedSession.reflection);
  assert.strictEqual(updatedSession.reflection.rating, 5);
  assert.strictEqual(updatedSession.reflection.energy, "high");
  assert.strictEqual(updatedSession.reflection.focusQuality, "deep_flow");
  assert.strictEqual(updatedSession.reflection.takeaway, "تم إنجاز الفصل الثالث بتركيز كامل");
  console.log("✓ Test 2: Safe session contract binding and field retention verified.");
}

// Test 3: Rating clamping & takeaway sanitization (XSS defense)
{
  assert.strictEqual(Engine.clampRating(10), 5, "Rating > 5 must clamp to 5");
  assert.strictEqual(Engine.clampRating(-2), 1, "Rating < 1 must clamp to 1");
  assert.strictEqual(Engine.clampRating(NaN), 3, "NaN must fallback to default 3");

  const dirtyText = "ملاحظة <script>alert(1)</script> هامة";
  const cleanText = Engine.sanitizeTakeaway(dirtyText);
  assert.strictEqual(cleanText, "ملاحظة scriptalert(1)/script هامة");
  console.log("✓ Test 3: Rating boundary clamping & XSS sanitization verified.");
}

// Test 4: 1-Tap Skip/Dismiss leaving session intact
{
  const mockSession = { id: "sess_102", durationMinutes: 15 };
  const skippedSession = Engine.attachReflectionToSession(mockSession, { skipped: true });
  
  assert.strictEqual(skippedSession.id, "sess_102");
  assert.strictEqual(skippedSession.reflection.skipped, true);
  assert.strictEqual(skippedSession.reflection.rating, null);
  assert.strictEqual(skippedSession.reflection.energy, null);
  console.log("✓ Test 4: 1-Tap Skip & graceful dismissal contract verified.");
}

console.log("--- All Mission #041 Reflection Tests PASSED (GREEN) ---");
