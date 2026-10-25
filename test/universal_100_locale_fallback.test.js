/**
 * DEEP FOCUS — Test Suite: Universal 100-Locale & English-Only Fallback Integration
 * File: test/universal_100_locale_fallback.test.js
 */

const assert = require('assert');
const Bridge = require('../android/app/src/main/assets/web/js/universal_i18n_bridge.js');
const PresetsEngine = require('../android/app/src/main/assets/web/js/study_environment_mix_presets_engine.js');
const PacerEngine = require('../android/app/src/main/assets/web/js/tactile_breath_pacer_engine.js');
const CSVEngine = require('../android/app/src/main/assets/web/js/study_session_csv_engine.js');

console.log('--- Running 🎯 Mission #092: Universal 100-Locale & English-Only Fallback Tests ---');

// Test 1: UniversalI18nBridge Lookup & Strict English Fallback
try {
  assert.strictEqual(Bridge.t('preset.quiet_library.name', 'en'), 'Quiet Library');
  assert.strictEqual(Bridge.t('preset.quiet_library.name', 'ar'), 'المكتبة الهادئة');
  assert.strictEqual(Bridge.t('preset.quiet_library.name', 'es'), 'Biblioteca Silenciosa');
  assert.strictEqual(Bridge.t('preset.quiet_library.name', 'fr'), 'Bibliothèque Calme');
  assert.strictEqual(Bridge.t('preset.quiet_library.name', 'de'), 'Ruhige Bibliothek');
  assert.strictEqual(Bridge.t('preset.quiet_library.name', 'tr'), 'Sessiz Kütüphane');
  assert.strictEqual(Bridge.t('preset.quiet_library.name', 'ja'), '静かな図書館');

  const fallbackUnknownLocale = Bridge.t('preset.quiet_library.name', 'xx-ZZ');
  assert.strictEqual(fallbackUnknownLocale, 'Quiet Library', 'Unknown locale must strictly fallback to English');

  const fallbackMissingKey = Bridge.t('preset.coastal_deep_flow.name', 'es');
  assert.strictEqual(fallbackMissingKey, 'Coastal Deep Flow', 'Missing key in existing locale must strictly fallback to English');

  const hebrewBlocked = Bridge.t('preset.quiet_library.name', 'he');
  assert.strictEqual(hebrewBlocked, 'Quiet Library', 'Hebrew locale must be blocked and fallback to English');
  const iwBlocked = Bridge.t('preset.quiet_library.name', 'iw');
  assert.strictEqual(iwBlocked, 'Quiet Library', 'iw locale must be blocked and fallback to English');

  console.log('✓ Test 1: Universal 100-locale lookup, strict English-only fallback & Hebrew exclusion verified.');
} catch (err) {
  console.error('✗ Test 1 Failed:', err.message);
  process.exit(1);
}

// Test 2: Study Environment Presets Multi-Language & Fallback
try {
  const svgEs = PresetsEngine.renderPresetCardSVG('quiet_library', { locale: 'es' });
  assert(svgEs.includes('Biblioteca Silenciosa'), 'Must render Spanish title');
  assert(svgEs.includes('CANALES'), 'Must render Spanish channels label');

  const svgAr = PresetsEngine.renderPresetCardSVG('quiet_library', { locale: 'ar' });
  assert(svgAr.includes('المكتبة الهادئة'), 'Must render Arabic title');

  const svgFallback = PresetsEngine.renderPresetCardSVG('quiet_library', { locale: 'unknown_lang' });
  assert(svgFallback.includes('Quiet Library'), 'Unknown locale must fallback to English title in SVG');
  assert(svgFallback.includes('CHANNELS'), 'Unknown locale must fallback to English channels label');

  console.log('✓ Test 2: Presets SVG multi-language rendering and strict English fallback verified.');
} catch (err) {
  console.error('✗ Test 2 Failed:', err.message);
  process.exit(1);
}

// Test 3: Tactile Breath Pacer Multi-Language & Fallback
try {
  const session = PacerEngine.createPacerSession('box_breathing', 4, { locale: 'es' });
  session.status = 'running';

  const svgEs = PacerEngine.renderBreathPacerSVG(session, { locale: 'es' });
  assert(svgEs.includes('Inhalación Profunda'), 'Must display Spanish phase label');
  assert(svgEs.includes('Ciclo 1 de 4'), 'Must display Spanish cycle counter');

  const svgAr = PacerEngine.renderBreathPacerSVG(session, { locale: 'ar' });
  assert(svgAr.includes('شهيق عميق'), 'Must display Arabic phase label');
  assert(svgAr.includes('دورة 1 من 4'), 'Must display Arabic cycle counter');

  const svgFallback = PacerEngine.renderBreathPacerSVG(session, { locale: 'unsupported_locale' });
  assert(svgFallback.includes('Deep Inhale'), 'Must fallback to English phase label');
  assert(svgFallback.includes('Cycle 1 of 4'), 'Must fallback to English cycle counter');

  console.log('✓ Test 3: Breath Pacer SVG multi-language labels and strict English fallback verified.');
} catch (err) {
  console.error('✗ Test 3 Failed:', err.message);
  process.exit(1);
}

// Test 4: CSV Multi-Language Export and Cross-Language Import
try {
  const samples = CSVEngine.generateSampleSessions();

  const csvEs = CSVEngine.exportSessionsToCSV(samples, { locale: 'es', includeBOM: false });
  assert(csvEs.includes('identificador,fecha,timestamp,duracion_minutos'), 'Must export Spanish headers');

  const csvAr = CSVEngine.exportSessionsToCSV(samples, { locale: 'ar', includeBOM: true });
  assert(csvAr.includes('المعرف,التاريخ,التوقيت,المدة (بالدقائق)'), 'Must export Arabic headers');

  const csvFallback = CSVEngine.exportSessionsToCSV(samples, { locale: 'klingon', includeBOM: false });
  assert(csvFallback.includes('id,date,timestamp,duration_minutes'), 'Must fallback to English headers');

  const importedFromEs = CSVEngine.importSessionsFromCSV(csvEs);
  assert(importedFromEs.success, 'Import from Spanish CSV must succeed');
  assert.strictEqual(importedFromEs.totalParsed, samples.length);
  assert.strictEqual(importedFromEs.sessions[0].duration_minutes, 45);

  const importedFromAr = CSVEngine.importSessionsFromCSV(csvAr);
  assert(importedFromAr.success, 'Import from Arabic CSV must succeed');
  assert.strictEqual(importedFromAr.totalParsed, samples.length);

  console.log('✓ Test 4: CSV multi-language export and cross-language import fidelity verified.');
} catch (err) {
  console.error('✗ Test 4 Failed:', err.message);
  process.exit(1);
}

// Test 5: Strict Western Arabic Digits & Hebrew Exclusion
try {
  const samples = CSVEngine.generateSampleSessions();
  const csv = CSVEngine.exportSessionsToCSV(samples, { locale: 'es' });

  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  easternDigits.forEach(d => {
    assert(!csv.includes(d), `Export must never contain Eastern digit ${d}`);
  });

  assert(!csv.includes('עברית') && !csv.includes('hebrew'), 'Must strictly exclude Hebrew');

  console.log('✓ Test 5: Strict Western digits (0123456789) & Hebrew exclusion verified.');
  console.log('--- All Mission #092 Tests PASSED (GREEN) ---');
} catch (err) {
  console.error('✗ Test 5 Failed:', err.message);
  process.exit(1);
}
