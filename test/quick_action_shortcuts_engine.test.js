const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/quick_action_shortcuts_engine.js');

console.log("--- Running 🎯 Mission #038: Quick Action Shortcuts Tests ---");

// Test 1: Default shortcuts retrieval & valid dispatch payload
{
  const defaults = Engine.getDefaultShortcuts();
  assert.strictEqual(defaults.length, 3, "Must provide 3 standard presets");
  assert.strictEqual(defaults[0].durationMinutes, 15);
  assert.strictEqual(defaults[1].durationMinutes, 25);
  assert.strictEqual(defaults[2].durationMinutes, 50);

  const payload = Engine.createLaunchPayload(defaults[1]);
  assert.strictEqual(payload.action, "START_FOCUS_SESSION");
  assert.strictEqual(payload.durationMinutes, 25);
  assert.strictEqual(payload.targetSeconds, 1500);
  assert.strictEqual(payload.autoStart, true);
  console.log("✓ Test 1: Default presets and launch payload contract verified.");
}

// Test 2: Duration clamping (1 to 180 minutes)
{
  assert.strictEqual(Engine.clampDuration(0), 1, "0 must clamp to 1m");
  assert.strictEqual(Engine.clampDuration(-10), 1, "Negative must clamp to 1m");
  assert.strictEqual(Engine.clampDuration(300), 180, "Above 180m must clamp to 180m");
  assert.strictEqual(Engine.clampDuration(NaN), 25, "NaN must fallback to default 25m");
  console.log("✓ Test 2: Strict duration boundary clamping verified.");
}

// Test 3: Maximum 4 pinned shortcuts invariant (Mobile 320px safety)
{
  let list = Engine.getDefaultShortcuts(); // 3 pinned
  list = Engine.registerShortcut(list, { id: "p4", title: "مهمة 4", durationMinutes: 30, pinned: true });
  list = Engine.registerShortcut(list, { id: "p5", title: "مهمة 5", durationMinutes: 40, pinned: true });

  const pinnedList = list.filter(item => item.pinned);
  assert.strictEqual(pinnedList.length, Engine.MAX_PINNED_SHORTCUTS, "Pinned count cannot exceed 4");
  assert.strictEqual(list.find(i => i.id === "p5").pinned, false, "5th pinned item must automatically be unpinned");
  console.log("✓ Test 3: Pinned shortcut ceiling (Max 4) enforced strictly.");
}

// Test 4: Custom shortcut registration & defensive sanitization
{
  let list = Engine.getDefaultShortcuts();
  list = Engine.registerShortcut(list, {
    id: "custom_reading",
    titleAr: "قراءة وثائق",
    durationMinutes: 45,
    soundscape: "rainy_library"
  });

  const custom = list.find(i => i.id === "custom_reading");
  assert.ok(custom, "Custom shortcut must be saved");
  assert.strictEqual(custom.durationMinutes, 45);
  assert.strictEqual(custom.soundscape, "rainy_library");

  const launch = Engine.createLaunchPayload(custom, { autoStart: false });
  assert.strictEqual(launch.autoStart, false);
  assert.strictEqual(launch.targetSeconds, 2700);
  console.log("✓ Test 4: Custom shortcut registration & manual launch option verified.");
}

console.log("--- All Mission #038 Quick Action Shortcuts Tests PASSED (GREEN) ---");
