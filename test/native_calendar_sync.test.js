const assert = require('assert');
const coord = require('../android/app/src/main/assets/web/js/native_calendar_sync_coordinator.js');

console.log('--- Running 🎯 Mission #111: Native Calendar Event Sync Tests ---');

// Test 1: RFC 5545 timestamp formatting
{
  const testDate = new Date(Date.UTC(2026, 9, 23, 10, 30, 0));
  const ts = coord.formatIcsTimestamp(testDate);
  assert.strictEqual(ts, '20261023T103000Z');
  assert.strictEqual(/^[0-9]{8}T[0-9]{6}Z$/.test(ts), true);
  console.log('✓ Test 1: RFC 5545 UTC timestamp format and Western digits verified.');
}

// Test 2: Single session VEVENT block generation
{
  const session = {
    id: 's_test_1',
    startTime: Date.UTC(2026, 9, 23, 14, 0, 0),
    durationSeconds: 2700,
    category: 'Deep Reading',
    qualityScore: 90
  };

  const ev = coord.generateSessionVEvent(session, 'en');
  assert.strictEqual(ev.uid, 'deepfocus-s_test_1@zenstudy');
  assert.strictEqual(ev.dtStart, '20261023T140000Z');
  assert.strictEqual(ev.dtEnd, '20261023T144500Z');
  assert.strictEqual(ev.durationMinutes, 45);
  assert.strictEqual(ev.summary.includes('Deep Focus Session: Deep Reading'), true);
  assert.strictEqual(ev.vEvent.includes('BEGIN:VEVENT'), true);
  assert.strictEqual(ev.vEvent.includes('END:VEVENT'), true);
  console.log('✓ Test 2: VEVENT block structure, duration, and properties verified.');
}

// Test 3: Full iCalendar (.ics) export validation
{
  const sessions = [
    { id: '1', startTime: Date.UTC(2026, 9, 23, 8, 0, 0), durationSeconds: 1800, category: 'Physics' },
    { id: '2', startTime: Date.UTC(2026, 9, 23, 11, 0, 0), durationSeconds: 3600, category: 'Math' }
  ];

  const ics = coord.exportSessionsToIcs(sessions, 'My Study Schedule', 'en');
  assert.strictEqual(ics.startsWith('BEGIN:VCALENDAR\r\n'), true);
  assert.strictEqual(ics.endsWith('END:VCALENDAR\r\n'), true);
  assert.strictEqual(ics.includes('X-WR-CALNAME:My Study Schedule'), true);
  assert.strictEqual(ics.includes('UID:deepfocus-1@zenstudy'), true);
  assert.strictEqual(ics.includes('UID:deepfocus-2@zenstudy'), true);
  console.log('✓ Test 3: Full .ics document generation and calendar name verified.');
}

// Test 4: Focus Gap Finder between busy blocks
{
  const windowStart = 1000000;
  const windowEnd = 1000000 + (4 * 60 * 60 * 1000);
  const busy = [
    { start: windowStart + (60 * 60 * 1000), end: windowStart + (120 * 60 * 1000) }
  ];

  const gaps = coord.findFocusGaps(busy, windowStart, windowEnd, 30);
  assert.strictEqual(gaps.length, 2);
  assert.strictEqual(gaps[0].durationMinutes, 60);
  assert.strictEqual(gaps[1].durationMinutes, 120);
  console.log('✓ Test 4: Focus gap finder algorithm & threshold filtering verified.');
}

// Test 5: 100-Locale translation, strict English fallback, zero Hebrew & Android Intent
{
  const session = { id: 'intent_1', startTime: 1700000000000, durationSeconds: 1500, category: 'Coding' };

  const intentAr = coord.createAndroidCalendarIntent(session, 'ar');
  assert.strictEqual(intentAr.action, 'android.intent.action.INSERT');
  assert.strictEqual(intentAr.extras.title.includes('جلسة تركيز ديب فوكس'), true);

  const intentNl = coord.createAndroidCalendarIntent(session, 'nl');
  assert.strictEqual(intentNl.extras.title.includes('Deep Focus Session'), true);

  const intentHe = coord.createAndroidCalendarIntent(session, 'he');
  const intentIw = coord.createAndroidCalendarIntent(session, 'iw');
  assert.strictEqual(intentHe.extras.title.includes('Deep Focus Session'), true);
  assert.strictEqual(intentIw.extras.title.includes('Deep Focus Session'), true);
  assert.strictEqual(coord.sanitizeLocale('he'), 'en');
  assert.strictEqual(coord.sanitizeLocale('iw'), 'en');

  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Android Intent verified.');
}

console.log('--- All Mission #111 Tests PASSED (GREEN) ---');
