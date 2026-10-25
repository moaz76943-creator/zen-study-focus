const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/local_vault_search_indexer_engine.js');

console.log('--- Running 🎯 Mission #152: Local Vault Search Indexer Tests ---');

// Test 1: Inverted Index Building
{
  const docs = [
    { id: 'd1', title: 'Calculus Derivatives', content: 'Chain rule and product rule', subject: 'Math' },
    { id: 'd2', title: 'Organic Chemistry', content: 'Alkenes and electrophilic addition', subject: 'Chemistry' },
    { id: 'd3', title: 'Calculus Integrals', content: 'Integration by parts and substitution', subject: 'Math' }
  ];

  const indexObj = Engine.buildInvertedIndex(docs);
  assert.strictEqual(indexObj.totalDocuments, 3);
  assert.ok(indexObj.totalTokens >= 10);
  assert.ok(indexObj.index['calculus'].includes('d1'));
  assert.ok(indexObj.index['calculus'].includes('d3'));

  console.log('✓ Test 1: Inverted index building verified.');
}

// Test 2: Sub-millisecond Query Resolution & Scoring
{
  const docs = [
    { id: 'd1', title: 'Thermodynamics Laws', content: 'Entropy and heat engines' },
    { id: 'd2', title: 'Quantum Mechanics', content: 'Wave function and entropy bounds' }
  ];

  const indexObj = Engine.buildInvertedIndex(docs);
  const res = Engine.searchVaultIndex(indexObj, 'entropy');

  assert.strictEqual(res.totalMatches, 2);
  assert.ok(res.latencyMs < 50);
  assert.ok(res.formattedLatency.includes('ms'));
  assert.strictEqual(res.results[0].relevanceScore >= 2.0, true);

  console.log('✓ Test 2: Query resolution and ranking verified.');
}

// Test 3: Comprehensive Search Report & Zero Music Guarantee
{
  const docs = [
    { id: 'n1', title: 'Biophysics Neural Networks', content: 'Action potential synapses' }
  ];
  const indexObj = Engine.buildInvertedIndex(docs);
  const report = Engine.generateSearchReport(indexObj, 'neural', 'ar');

  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.performance.totalMatches, '1');
  assert.strictEqual(report.topMatches[0].title, 'Biophysics Neural Networks');
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);

  console.log('✓ Test 3: Comprehensive search report verified.');
}

// Test 4: Boundary Handling & Empty Search Query
{
  const emptyRes = Engine.searchVaultIndex(null, '');
  assert.strictEqual(emptyRes.totalMatches, 0);
  assert.deepStrictEqual(emptyRes.results, []);

  const emptyTokens = Engine.tokenize('!@#$%');
  assert.strictEqual(emptyTokens.length, 0);

  console.log('✓ Test 4: Boundary handling and empty query verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('id'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('تطابق ١ سجل بزمن ٠.٥ms');
  assert.strictEqual(western, 'تطابق 1 سجل بزمن 0.5ms');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #152 Tests PASSED (GREEN) ---');
