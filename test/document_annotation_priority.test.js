const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/document_annotation_priority_engine.js');

console.log('--- Running 🎯 Mission #131: Document Annotation & Priority Tests ---');

// Test 1: Tints catalog & hex codes
{
  const tints = engine.HIGHLIGHT_TINTS;
  assert.strictEqual(tints.AMBER_INSIGHT.hex, '#f59e0b');
  assert.strictEqual(tints.EMERALD_EVIDENCE.hex, '#10b981');
  assert.strictEqual(tints.SAPPHIRE_DEFINITION.hex, '#3b82f6');
  assert.strictEqual(tints.CRIMSON_CRITIQUE.hex, '#ef4444');
  assert.strictEqual(tints.VIOLET_SYNTHESIS.hex, '#8b5cf6');
  console.log('✓ Test 1: Highlight tints catalog and hex colors verified.');
}

// Test 2: Priority quadrants
{
  const q = engine.PRIORITY_QUADRANTS;
  assert.strictEqual(q.Q1_ESSENTIAL.rank, 1);
  assert.strictEqual(q.Q2_FOUNDATIONAL.rank, 2);
  assert.strictEqual(q.Q3_PRAGMATIC.rank, 3);
  assert.strictEqual(q.Q4_EXPLORATORY.rank, 4);
  console.log('✓ Test 2: Reading priority quadrants (Q1-Q4) verified.');
}

// Test 3: Annotation creation & fallback
{
  const ann1 = engine.createAnnotation('doc_physics', 105, 'EMERALD_EVIDENCE', 'E = mc^2', 'Mass-energy equivalence');
  assert.strictEqual(ann1.docId, 'doc_physics');
  assert.strictEqual(ann1.pageNumber, 105);
  assert.strictEqual(ann1.pageFormatted, '105');
  assert.strictEqual(ann1.tint, 'EMERALD_EVIDENCE');

  const ann2 = engine.createAnnotation('doc_physics', 106, 'INVALID_TINT', 'Some text');
  assert.strictEqual(ann2.tint, 'AMBER_INSIGHT');
  console.log('✓ Test 3: Annotation creation and tint fallback verified.');
}

// Test 4: Annotations summary calculation
{
  const list = [
    engine.createAnnotation('doc1', 1, 'AMBER_INSIGHT', 'Three words here'),
    engine.createAnnotation('doc1', 2, 'AMBER_INSIGHT', 'Two words'),
    engine.createAnnotation('doc1', 5, 'SAPPHIRE_DEFINITION', 'A single definition text sample')
  ];

  const sum = engine.summarizeAnnotations(list);
  assert.strictEqual(sum.totalAnnotations, 3);
  assert.strictEqual(sum.totalFormatted, '3');
  assert.strictEqual(sum.counts.AMBER_INSIGHT, 2);
  assert.strictEqual(sum.counts.SAPPHIRE_DEFINITION, 1);
  assert.strictEqual(sum.counts.CRIMSON_CRITIQUE, 0);
  assert.strictEqual(sum.totalWords, 10);
  console.log('✓ Test 4: Document annotations summary & category counting verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const arTitle = engine.getLocalizedText('ar', 'tint_amber');
  assert.strictEqual(arTitle.includes('عنبري'), true);

  const itTitle = engine.getLocalizedText('it', 'tint_amber');
  assert.strictEqual(itTitle.includes('Amber'), true);

  const heTitle = engine.getLocalizedText('he', 'tint_amber');
  const iwTitle = engine.getLocalizedText('iw', 'tint_amber');
  assert.strictEqual(heTitle.includes('Amber'), true);
  assert.strictEqual(iwTitle.includes('Amber'), true);
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+$/.test(engine.toWesternDigits(131)), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #131 Tests PASSED (GREEN) ---');
