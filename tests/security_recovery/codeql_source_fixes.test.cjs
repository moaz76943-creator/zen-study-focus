'use strict';
// Regression guards for CodeQL findings fixed at source (no suppressions).
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = (p) => fs.readFileSync(path.join(__dirname, '../..', p), 'utf8');
test('commitment contract id uses CSPRNG, not Math.random (js/insecure-randomness)', () => {
  const s = R('android/app/src/main/assets/web/app.js');
  const i = s.indexOf("const contractId = 'contract_'");
  assert.ok(i > 0);
  assert.ok(!/Math\.random/.test(s.slice(i, i + 700)));
  assert.match(s.slice(i, i + 700), /getRandomValues/);
});
test('static test servers reject path traversal outside the web root (js/path-injection)', () => {
  for (const p of ['tools/i18n/runtime_inventory.cjs', 'tools/perf/flashcards_perf.cjs']) {
    const s = R(p);
    assert.match(s, /startsWith\(root \+ path\.sep\)/, p);
    assert.ok(!/path\.join\(root, q\.url/.test(s), p);
  }
});
test('scripts avoid stat-then-read races (js/file-system-race)', () => {
  assert.ok(!/statSync\(p\)\.isDirectory\(\)/.test(R('tools/run_tests.mjs')));
  assert.ok(!/fs\.existsSync\(pf\) \?/.test(R('tools/i18n/tsv_to_pack.cjs')));
  assert.ok(!/statSync\(full\)\.isDirectory/.test(R('tests/sovereign_e2e_test.js')));
  assert.ok(!/fs\.statSync\(full\)/.test(R('deepseek_qa_auditor.mjs')));
});
