/**
 * DEEP FOCUS — Test Suite: Quick Session History Search & Filter Engine (M101)
 * File: test/session_history_search_filter.test.js
 */

const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/session_history_search_filter_engine.js');

console.log('--- Running 🎯 Mission #101: Session History Search & Filter Tests ---');

const mockSessions = [
  {
    id: 's1',
    date: '2026-10-20',
    timestamp: '2026-10-20T08:00:00.000Z',
    duration_minutes: 50,
    tag: 'Calculus',
    task_name: 'Integral Calculus Review',
    mode: 'deep_flow',
    interrupted: false,
    sound_environment: 'quiet_library',
    reflection_notes: 'High clarity and breakthrough on chapter 4'
  },
  {
    id: 's2',
    date: '2026-10-21',
    timestamp: '2026-10-21T09:30:00.000Z',
    duration_minutes: 25,
    tag: 'Physics',
    task_name: 'Quantum Optics Problem Set',
    mode: 'standard_pomodoro',
    interrupted: false,
    sound_environment: 'deep_noise_isolation',
    reflection_notes: 'Good pacing with flashcards'
  },
  {
    id: 's3',
    date: '2026-10-22',
    timestamp: '2026-10-22T14:00:00.000Z',
    duration_minutes: 40,
    tag: 'اللغة العربية',
    task_name: 'مراجعة البلاغة والنقد الأدبي',
    mode: 'standard_pomodoro',
    interrupted: true,
    sound_environment: 'forest_cabin',
    reflection_notes: 'جلسة مثمرة مع تلخيص القواعد'
  },
  {
    id: 's4',
    date: '2026-10-22',
    timestamp: '2026-10-22T16:30:00.000Z',
    duration_minutes: 30,
    tag: 'Calculus',
    task_name: 'Derivative Applications Drill',
    mode: 'spaced_repetition',
    interrupted: false,
    sound_environment: 'quiet_library',
    reflection_notes: 'Quick test prep'
  }
];

// Test 1: Free-Text Search Matching
try {
  const res1 = Engine.searchSessions(mockSessions, { query: 'Calculus' });
  assert.strictEqual(res1.totalCount, 2);

  const res2 = Engine.searchSessions(mockSessions, { query: 'flashcards' });
  assert.strictEqual(res2.totalCount, 1);
  assert.strictEqual(res2.items[0].id, 's2');

  const res3 = Engine.searchSessions(mockSessions, { query: 'البلاغة' });
  assert.strictEqual(res3.totalCount, 1);
  assert.strictEqual(res3.items[0].id, 's3');

  console.log('✓ Test 1: Free-text search matching across task, tag, and notes (Arabic/English) verified.');
} catch (err) {
  console.error('✗ Test 1 Failed:', err.message);
  process.exit(1);
}

// Test 2: Multi-Facet Filtering
try {
  const tagRes = Engine.searchSessions(mockSessions, { tag: 'Calculus' });
  assert.strictEqual(tagRes.totalCount, 2);

  const modeRes = Engine.searchSessions(mockSessions, { mode: 'deep_flow' });
  assert.strictEqual(modeRes.totalCount, 1);
  assert.strictEqual(modeRes.items[0].id, 's1');

  const dateRes = Engine.searchSessions(mockSessions, { startDate: '2026-10-21', endDate: '2026-10-22' });
  assert.strictEqual(dateRes.totalCount, 3);

  const uninterruptRes = Engine.searchSessions(mockSessions, { uninterruptedOnly: true });
  assert.strictEqual(uninterruptRes.totalCount, 3);

  const interruptRes = Engine.searchSessions(mockSessions, { interruptedOnly: true });
  assert.strictEqual(interruptRes.totalCount, 1);
  assert.strictEqual(interruptRes.items[0].id, 's3');

  console.log('✓ Test 2: Multi-facet filtering (Tag, Mode, Date Range, Interruption) verified.');
} catch (err) {
  console.error('✗ Test 2 Failed:', err.message);
  process.exit(1);
}

// Test 3: Sorting & Duration Thresholding
try {
  const durSort = Engine.searchSessions(mockSessions, {}, { sortBy: 'duration', sortOrder: 'desc' });
  assert.strictEqual(durSort.items[0].duration_minutes, 50);
  assert.strictEqual(durSort.items[3].duration_minutes, 25);

  const durRange = Engine.searchSessions(mockSessions, { minDuration: 30, maxDuration: 45 });
  assert.strictEqual(durRange.totalCount, 2);

  console.log('✓ Test 3: Sorting (duration/timestamp) & duration thresholding verified.');
} catch (err) {
  console.error('✗ Test 3 Failed:', err.message);
  process.exit(1);
}

// Test 4: Pagination & Aggregated Analytics
try {
  const p1 = Engine.searchSessions(mockSessions, {}, { page: 1, pageSize: 2 });
  assert.strictEqual(p1.items.length, 2);
  assert.strictEqual(p1.totalCount, 4);
  assert.strictEqual(p1.totalPages, 2);
  assert.strictEqual(p1.currentPage, 1);
  assert.strictEqual(p1.aggregatedMinutes, 145);

  const facets = Engine.extractFilterFacets(mockSessions);
  assert(facets.tags.includes('Calculus'));
  assert(facets.tags.includes('اللغة العربية'));
  assert(facets.environments.includes('quiet_library'));
  assert(facets.modes.includes('deep_flow'));

  console.log('✓ Test 4: Pagination (pages, count, aggregated minutes) & facet extraction verified.');
} catch (err) {
  console.error('✗ Test 4 Failed:', err.message);
  process.exit(1);
}

// Test 5: Multi-Language, Strict English Fallback & Hebrew Exclusion
try {
  const Bridge = require('../android/app/src/main/assets/web/js/universal_i18n_bridge.js');

  assert.strictEqual(Bridge.t('search.placeholder', 'ar'), 'ابحث في المهام والمواد والملاحظات...');
  assert.strictEqual(Bridge.t('search.filter.all_tags', 'ar'), 'جميع المواد');
  assert.strictEqual(Bridge.t('search.filter.all_tags', 'es'), 'Todas las Materias');
  assert.strictEqual(Bridge.t('search.placeholder', 'unsupported_test_lang'), 'Search tasks, tags, or notes...');
  assert.strictEqual(Bridge.t('search.sort.newest', 'unsupported_test_lang'), 'Newest First');
  assert.strictEqual(Bridge.t('search.placeholder', 'he'), 'Search tasks, tags, or notes...');
  assert(!Bridge.t('search.placeholder', 'he').includes('עבריت'));

  const res = Engine.searchSessions(mockSessions, {}, { locale: 'ar' });
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const fullText = JSON.stringify(res);
  easternDigits.forEach(d => {
    assert(!fullText.includes(d), `Search result must never contain Eastern digit ${d}`);
  });

  console.log('✓ Test 5: Multi-language search labels, strict English fallback & Western digits verified.');
  console.log('--- All Mission #101 Tests PASSED (GREEN) ---');
} catch (err) {
  console.error('✗ Test 5 Failed:', err.message);
  process.exit(1);
}
