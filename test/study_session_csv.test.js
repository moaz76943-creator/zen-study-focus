/**
 * DEEP FOCUS — Test Suite: Study Session CSV Exporter Engine (M092)
 * File: test/study_session_csv.test.js
 */

const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/study_session_csv_engine.js');

console.log('--- Running 🎯 Mission #092: Study Session CSV Exporter Tests ---');

// Test 1: Verify RFC 4180 Escaping & UTF-8 BOM
try {
  assert.strictEqual(Engine.escapeCSVField('SimpleText'), 'SimpleText');
  assert.strictEqual(Engine.escapeCSVField('Text, with comma'), '"Text, with comma"');
  assert.strictEqual(Engine.escapeCSVField('Text with "quotes"'), '"Text with ""quotes"""');
  assert.strictEqual(Engine.escapeCSVField('Line 1\nLine 2'), '"Line 1\nLine 2"');

  const samples = Engine.generateSampleSessions();
  const csvWithBOM = Engine.exportSessionsToCSV(samples, { includeBOM: true });
  assert.strictEqual(csvWithBOM.charCodeAt(0), 0xFEFF, 'First character must be UTF-8 BOM (0xFEFF)');

  const csvNoBOM = Engine.exportSessionsToCSV(samples, { includeBOM: false });
  assert.notStrictEqual(csvNoBOM.charCodeAt(0), 0xFEFF, 'When includeBOM is false, must not prepend BOM');

  console.log('✓ Test 1: RFC 4180 escaping rules & UTF-8 BOM for Excel verified.');
} catch (err) {
  console.error('✗ Test 1 Failed:', err.message);
  process.exit(1);
}

// Test 2: Dual-Language Headers (Arabic & English)
try {
  const samples = Engine.generateSampleSessions();
  const csvAr = Engine.exportSessionsToCSV(samples, { lang: 'ar', includeBOM: false });
  assert(csvAr.includes('المعرف,التاريخ,التوقيت,المدة (بالدقائق),المادة/الوسم'), 'Arabic header must be formatted properly');

  const csvEn = Engine.exportSessionsToCSV(samples, { lang: 'en', includeBOM: false });
  assert(csvEn.includes('id,date,timestamp,duration_minutes,tag'), 'English header must be formatted properly');

  console.log('✓ Test 2: Dual-Language header export (Arabic & English) verified.');
} catch (err) {
  console.error('✗ Test 2 Failed:', err.message);
  process.exit(1);
}

// Test 3: Round-Trip Import & Export Fidelity
try {
  const original = Engine.generateSampleSessions();
  
  const exportedAr = Engine.exportSessionsToCSV(original, { lang: 'ar', includeBOM: true });
  const importedAr = Engine.importSessionsFromCSV(exportedAr);
  assert(importedAr.success, 'Import from Arabic CSV must succeed');
  assert.strictEqual(importedAr.totalParsed, original.length, 'Must parse exact session count');

  const sess3 = importedAr.sessions.find(s => s.id === 'sess_103');
  assert(sess3, 'Session 103 must be imported');
  assert.strictEqual(sess3.tag, 'اللغة العربية');
  assert.strictEqual(sess3.duration_minutes, 30);
  assert.strictEqual(sess3.interrupted, true);
  assert(sess3.task_name.includes('مراجعة البلاغة والنحو، مع تلخيص الأمثلة'));

  const exportedEn = Engine.exportSessionsToCSV(original, { lang: 'en', includeBOM: false });
  const importedEn = Engine.importSessionsFromCSV(exportedEn);
  assert(importedEn.success, 'Import from English CSV must succeed');
  assert.strictEqual(importedEn.totalParsed, original.length);

  console.log('✓ Test 3: Round-Trip Export/Import fidelity across both languages verified.');
} catch (err) {
  console.error('✗ Test 3 Failed:', err.message);
  process.exit(1);
}

// Test 4: Resilience to Malformed CSV and Fallbacks
try {
  const emptyRes = Engine.importSessionsFromCSV('');
  assert.strictEqual(emptyRes.success, false);

  const badHeaders = Engine.importSessionsFromCSV('foo,bar\n1,2');
  assert.strictEqual(badHeaders.success, true);
  assert.strictEqual(badHeaders.sessions.length, 1);
  assert.strictEqual(badHeaders.sessions[0].tag, 'General');

  const multilineCsv = 'id,date,duration_minutes,reflection_notes\ns1,2026-10-22,25,"Notes with\nnewline and ""quotes"""\n';
  const parsedMulti = Engine.importSessionsFromCSV(multilineCsv);
  assert.strictEqual(parsedMulti.sessions.length, 1);
  assert.strictEqual(parsedMulti.sessions[0].reflection_notes, 'Notes with\nnewline and "quotes"');

  console.log('✓ Test 4: Fault-tolerance, multiline parsing & safe fallbacks verified.');
} catch (err) {
  console.error('✗ Test 4 Failed:', err.message);
  process.exit(1);
}

// Test 5: Strict Western Arabic Digits & Hebrew Exclusion
try {
  const samples = Engine.generateSampleSessions();
  const exported = Engine.exportSessionsToCSV(samples);

  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  easternDigits.forEach(d => {
    assert(!exported.includes(d), `Exported CSV must not contain Eastern digit ${d}`);
  });

  assert(!exported.includes('עברית') && !exported.includes('hebrew'), 'Must exclude Hebrew');

  console.log('✓ Test 5: Strict Western Arabic digits (0123456789) & Hebrew exclusion verified.');
  console.log('--- All Mission #092 Tests PASSED (GREEN) ---');
} catch (err) {
  console.error('✗ Test 5 Failed:', err.message);
  process.exit(1);
}
