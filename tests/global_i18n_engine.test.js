const assert = require('assert');
const fs = require('fs');
const path = require('path');
const GlobalI18nEngine = require('../android/app/src/main/assets/web/modules/i18n/global_i18n_engine.js');

console.log('🧪 Starting GlobalI18nEngine + official 100-language catalog tests...');

// Test 0: Official 100-language policy (availability remains pack-status gated)
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../i18n/languages.json'), 'utf8'));
const catalogCodes = catalog.languages.map(language => language.code);
assert.strictEqual(catalogCodes.length, 100);
assert.strictEqual(new Set(catalogCodes).size, 100);
assert.ok(!catalogCodes.includes('he'));
assert.ok(!catalogCodes.includes('iw'));
assert.match(catalog.note, /100-language/i);
console.log('  ✓ Official 100-language catalog and Hebrew exclusion verified.');

const i18n = new GlobalI18nEngine();

// Test 1: Registry Initialization
const reg = i18n.dfInitGlobalDictionaryRegistry();
assert.strictEqual(reg.supportedLanguagesCount, 16);
assert.strictEqual(reg.maxSupportedLanguages, 16);
for (const code of ['it', 'ru', 'pt', 'nl', 'pl', 'sv']) assert.ok(reg.supportedCodes.includes(code));
assert.strictEqual(reg.supportedCodes.length <= 16, true);
assert.ok(reg.supportedCodes.includes('ar'));
assert.ok(reg.supportedCodes.includes('zh'));
console.log('  ✓ dfInitGlobalDictionaryRegistry verified.');

// Test 2: Permanent Exclusion Policy
assert.strictEqual(i18n.dfEnforceLanguageExclusionPolicy('he'), false);
assert.strictEqual(i18n.dfEnforceLanguageExclusionPolicy('syc'), false);
assert.strictEqual(i18n.dfEnforceLanguageExclusionPolicy('ber'), false);
assert.strictEqual(i18n.dfEnforceLanguageExclusionPolicy('en'), true);
assert.throws(() => i18n.dfHotSwapUiLanguageZeroReload('he'), /prohibited/i);
console.log('  ✓ dfEnforceLanguageExclusionPolicy verified.');

// Test 3: Western Digits Invariant
const normalized = i18n.dfEnforceWesternDigitsGlobalRule('ساعة: ٠٢:٤٥');
assert.strictEqual(normalized, 'ساعة: 02:45');
console.log('  ✓ dfEnforceWesternDigitsGlobalRule verified.');

// Test 4: Hot Swap Language & RTL Direction
const swapFr = i18n.dfHotSwapUiLanguageZeroReload('fr');
assert.strictEqual(swapFr.activeLanguage, 'fr');
assert.strictEqual(swapFr.direction, 'ltr');

const swapAr = i18n.dfHotSwapUiLanguageZeroReload('ar');
assert.strictEqual(swapAr.activeLanguage, 'ar');
assert.strictEqual(swapAr.direction, 'rtl');
console.log('  ✓ dfHotSwapUiLanguageZeroReload & RTL Layout verified.');

// Test 5: Date and Time Western Format
const dt = i18n.dfFormatLocalizedDateAndTime('2026-11-10T22:30:00Z');
assert.match(dt.formattedDate, /^\d{4}-\d{2}-\d{2}$/);
assert.match(dt.formattedTime, /^\d{2}:\d{2}$/);
console.log('  ✓ dfFormatLocalizedDateAndTime verified.');

// Test 6: Bilingual Flashcard Decks
const card = i18n.dfSupportBilingualFlashcardDecks('Photosynthesis', 'التمثيل الضوئي', 'en', 'ar');
assert.strictEqual(card.front.dir, 'ltr');
assert.strictEqual(card.back.dir, 'rtl');
console.log('  ✓ dfSupportBilingualFlashcardDecks verified.');

// Test 7: Translation Completeness 100%
const audit = i18n.dfAuditTranslationCompleteness100();
assert.strictEqual(audit.auditedLanguagesCount, 16);
assert.strictEqual(audit.is100PercentComplete, false);
assert.ok(audit.missingKeysPerLanguage.it.length > 0);
console.log('  ✓ dfAuditTranslationCompleteness100 reports untranslated additions honestly.');

// Test 8: Milestone Seal M8567
const seal = i18n.dfGetMilestoneM8567GlobalI18nSeal();
assert.strictEqual(seal.milestone, 'M8567');
assert.strictEqual(seal.status, 'VERIFIED_SOVEREIGN');
console.log('  ✓ dfGetMilestoneM8567GlobalI18nSeal verified.');

console.log('🎉 All 8 GlobalI18nEngine tests passed with 100% assertions!');
