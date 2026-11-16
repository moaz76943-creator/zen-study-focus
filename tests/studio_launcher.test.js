// Verifies the Zen Studio Launcher bridge: loads in a bare environment,
// exposes all 10 studio launchers, and never throws for unknown/known ids.
const assert = require('assert');
const StudioLauncher = require('../android/app/src/main/assets/web/modules/ui/studio_navigator_drawer.js').StudioLauncher;

console.log('🧪 Starting StudioLauncher (10-of-10 bridge) Unit Tests...');

// Test 1: module loads and exposes the public API
assert(StudioLauncher, 'StudioLauncher must load');
assert.strictEqual(typeof StudioLauncher.open, 'function', 'open must be a function');
assert.strictEqual(typeof StudioLauncher.close, 'function', 'close must be a function');
assert(StudioLauncher.LAUNCHERS, 'LAUNCHERS must be exported');
console.log('  ✓ StudioLauncher loads and exposes open/close/LAUNCHERS.');

// Test 2: exactly the 10 documented studios are wired
const expected = ['sanctuary', 'theme', 'wrapped', 'pods', 'rescue',
  'leaderboard', 'contracts', 'i18n', 'accessibility', 'performance'];
const ids = Object.keys(StudioLauncher.LAUNCHERS);
assert.deepStrictEqual(ids.sort(), expected.slice().sort(), 'All 10 studios must be wired');
console.log(`  ✓ Exactly ${ids.length} studios wired: ${ids.join(', ')}.`);

// Test 3: unknown studio id returns false and does not throw
assert.strictEqual(StudioLauncher.open('definitely-not-a-studio'), false, 'unknown studio must return false');
assert.strictEqual(StudioLauncher.open(''), false, 'empty studio id must return false');
assert.strictEqual(StudioLauncher.open(null), false, 'null studio id must return false');
console.log('  ✓ Unknown/empty studio ids are rejected without throwing.');

// Test 4: every wired studio opens (or degrades gracefully) without throwing in a bare environment
for (const id of expected) {
  let result;
  assert.doesNotThrow(() => { result = StudioLauncher.open(id); }, `open(${id}) must not throw`);
  assert.strictEqual(typeof result, 'boolean', `open(${id}) must return a boolean`);
}
console.log('  ✓ All 10 launchers run without throwing in a bare environment.');

// Test 5: close() is safe with no DOM present
assert.doesNotThrow(() => StudioLauncher.close(), 'close() must not throw without a DOM');
console.log('  ✓ close() is DOM-safe.');

console.log('--- All StudioLauncher Tests PASSED (GREEN) ---');
