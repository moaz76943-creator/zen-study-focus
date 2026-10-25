const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/customizable_dock_layout_engine.js');

console.log('--- Running 🎯 Mission #160: Customizable Dock Layout Tests ---');

// Test 1: Canonical Default Layout Directory
{
  const def = Engine.getCanonicalDefaultLayout();
  assert.strictEqual(def.length, 8);
  assert.strictEqual(def[0].id, 'timer');
  assert.strictEqual(def[0].pinned, true);
  assert.strictEqual(def[1].id, 'notes');

  console.log('✓ Test 1: Canonical default layout directory verified.');
}

// Test 2: Reordering Dock Items
{
  const def = Engine.getCanonicalDefaultLayout();
  const reordered = Engine.reorderDockItems(def, 1, 0);
  assert.strictEqual(reordered[0].id, 'notes');
  assert.strictEqual(reordered[1].id, 'timer');
  assert.strictEqual(reordered.length, 8);

  const clamped = Engine.reorderDockItems(def, 0, 99);
  assert.strictEqual(clamped[clamped.length - 1].id, 'timer');

  console.log('✓ Test 2: Reordering dock items verified.');
}

// Test 3: Pinning Toggle and Partitioning (Pinned vs Overflow)
{
  const def = Engine.getCanonicalDefaultLayout();
  const modified = Engine.toggleItemPinnedStatus(def, 'analytics', true);
  const partitioned = Engine.sanitizeAndPartitionLayout(modified, 4);

  assert.strictEqual(partitioned.pinnedCount, 4);
  assert.strictEqual(partitioned.overflowCount, 4);
  assert.strictEqual(partitioned.zeroMusicCertified, true);

  console.log('✓ Test 3: Pinning toggle and dock partitioning verified.');
}

// Test 4: Fault-Tolerant Self-Healing on Corrupted Configuration
{
  const corrupted = [{ id: 'notes', pinned: true }];
  const healed = Engine.sanitizeAndPartitionLayout(corrupted, 4);

  assert.strictEqual(healed.totalModules, 8);
  assert.ok(healed.pinnedDock.some(m => m.id === 'notes'));

  console.log('✓ Test 4: Fault-tolerant self-healing on corrupted inputs verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('pt'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('عناصر مثبتة ٤ ومجموع العناصر ٨');
  assert.strictEqual(western, 'عناصر مثبتة 4 ومجموع العناصر 8');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #160 Tests PASSED (GREEN) ---');
