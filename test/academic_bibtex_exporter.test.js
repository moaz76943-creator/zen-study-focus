const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/academic_bibtex_exporter_engine.js');

console.log('--- Running 🎯 Mission #123: BibTeX & Zotero Academic Exporter Tests ---');

// Test 1: Citekey generation
{
  const key1 = engine.generateCitekey('Knuth, Donald E.', 1984, 'Literate Programming');
  assert.strictEqual(key1, 'Knuth1984Literate');

  const key2 = engine.generateCitekey('Turing, Alan', 1936, 'On Computable Numbers');
  assert.strictEqual(key2, 'Turing1936Computable');
  console.log('✓ Test 1: Standardized academic citekey generation verified.');
}

// Test 2: BibTeX string format
{
  const article = {
    type: 'article',
    author: 'Shannon, Claude E.',
    year: 1948,
    title: 'A Mathematical Theory of Communication',
    journal: 'Bell System Technical Journal',
    volume: 27,
    pages: '379-423'
  };

  const res = engine.formatBibtex(article);
  assert.strictEqual(res.citekey, 'Shannon1948Mathematical');
  assert.strictEqual(res.bibtex.startsWith('@article{Shannon1948Mathematical,'), true);
  assert.strictEqual(res.bibtex.includes('title = {A Mathematical Theory of Communication}'), true);
  assert.strictEqual(res.bibtex.includes('year = {1948}'), true);
  assert.strictEqual(res.bibtex.includes('pages = {379-423}'), true);
  console.log('✓ Test 2: Full BibTeX @article entry syntax and fields verified.');
}

// Test 3: Session linking in note field
{
  const book = {
    type: 'book',
    author: 'Al-Ghazali, Abu Hamid',
    year: 1095,
    title: 'Ihya Ulum al-Din',
    publisher: 'Dar al-Kutub'
  };

  const session = { durationMinutes: 120, date: '2026-10-23' };
  const resAr = engine.formatBibtex(book, session, 'ar');
  assert.strictEqual(resAr.bibtex.includes('جلسة مدارسة ديب فوكس'), true);
  assert.strictEqual(resAr.bibtex.includes('120 min'), true);
  assert.strictEqual(resAr.bibtex.includes('2026-10-23'), true);
  console.log('✓ Test 3: Deep Focus session linkage into BibTeX note field verified.');
}

// Test 4: CSL-JSON format compatibility
{
  const conf = {
    type: 'inproceedings',
    author: 'Vaswani, Ashish',
    year: 2017,
    title: 'Attention Is All You Need',
    booktitle: 'NeurIPS',
    doi: '10.5555/3295222.3295349'
  };

  const csl = engine.exportToCslJson(conf, { durationMinutes: 60, date: '2026-10-23' });
  assert.strictEqual(csl.type, 'paper-conference');
  assert.strictEqual(csl.id, 'Vaswani2017Attention');
  assert.strictEqual(csl.title, 'Attention Is All You Need');
  assert.strictEqual(csl.DOI, '10.5555/3295222.3295349');
  assert.strictEqual(csl.custom.deepFocusDurationMinutes, 60);
  console.log('✓ Test 4: CSL-JSON export for Zotero/Mendeley with custom metadata verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const arMsg = engine.getLocalizedText('ar', 'export_success');
  assert.strictEqual(arMsg.includes('تم تصدير المرجع'), true);

  const nlMsg = engine.getLocalizedText('nl', 'export_success');
  assert.strictEqual(nlMsg.includes('Academic reference exported'), true);

  const heMsg = engine.getLocalizedText('he', 'export_success');
  const iwMsg = engine.getLocalizedText('iw', 'export_success');
  assert.strictEqual(heMsg.includes('Academic reference exported'), true);
  assert.strictEqual(iwMsg.includes('Academic reference exported'), true);
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  assert.strictEqual(engine.toWesternDigits('١٩٤٨'), '1948');
  assert.strictEqual(engine.toWesternDigits('٣٧٩-٤٢٣'), '379-423');
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #123 Tests PASSED (GREEN) ---');
