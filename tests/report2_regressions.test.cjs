'use strict';
// Regressions for the second external audit: import allowlist/rollback, fail-closed integrity guard,
// honest collaboration stubs, local-day helpers.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const web = path.resolve(__dirname, '../android/app/src/main/assets/web');
function makeStorage(failKey) {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), removeItem: (k) => m.delete(k),
    setItem(k, v) { if (k === failKey) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    get length() { return m.size; }, key: (i) => [...m.keys()][i] };
}
function loadVault(storage) {
  global.window = { localStorage: storage }; global.localStorage = storage;
  delete require.cache[require.resolve(path.join(web, 'modules/core/offline_data_vault.js'))];
  return require(path.join(web, 'modules/core/offline_data_vault.js'));
}
test('backup import rejects keys outside the vault allowlist and writes nothing', () => {
  const st = makeStorage(); st.setItem('zen_fortress_tasks_v21', 'KEEP');
  const v = loadVault(st);
  const bad = JSON.stringify({ app: 'DEEP_FOCUS', data: { zen_daily_goals_v2: [1], zen_fortress_tasks_v21: 'EVIL' } });
  assert.equal(v.importBackupJSON(bad), false);
  assert.equal(st.getItem('zen_fortress_tasks_v21'), 'KEEP');
  assert.equal(st.getItem('zen_daily_goals_v2'), null);
});
test('backup import rolls back earlier keys when a later write fails', () => {
  const st = makeStorage('zen_personal_bests_v1'); st.setItem('zen_daily_goals_v2', '"old"');
  const v = loadVault(st);
  const data = { app: 'DEEP_FOCUS', data: { zen_daily_goals_v2: { a: 1 }, zen_personal_bests_v1: { b: 2 } } };
  assert.equal(v.importBackupJSON(JSON.stringify(data)), false);
  assert.equal(st.getItem('zen_daily_goals_v2'), '"old"');
});
test('backup import accepts a valid export and ignores prototype keys', () => {
  const st = makeStorage(); const v = loadVault(st);
  const txt = '{"app":"DEEP_FOCUS","data":{"zen_daily_goals_v2":{"x":1,"__proto__":{"p":1}}}}';
  assert.equal(v.importBackupJSON(txt), true);
  assert.equal(JSON.parse(st.getItem('zen_daily_goals_v2')).x, 1);
  assert.equal(({}).p, undefined);
});
test('integrity guard fails closed and is honest about its scope', async () => {
  const src = fs.readFileSync(path.join(web, 'modules/security/tamper_proof_integrity_guard.js'), 'utf8');
  assert.match(src, /accidental\s+\*?\s*corruption only/i);
  assert.ok(!/Tamper-Proof Integrity & Cryptographic/.test(src));
  const st = makeStorage(); global.window = { localStorage: st }; global.localStorage = st;
  delete require.cache[require.resolve(path.join(web, 'modules/security/tamper_proof_integrity_guard.js'))];
  const g = require(path.join(web, 'modules/security/tamper_proof_integrity_guard.js'));
  st.setItem('k', 'v1'); await g.signRecord('k', 'v1');
  assert.equal(await g.verifyRecord('k'), true);
  st.setItem('k', 'v2');
  assert.equal(await g.verifyRecord('k'), false);
  st.setItem('zen_crypto_signatures_v1', '{broken');
  assert.equal(await g.verifyRecord('k'), false, 'unverifiable must not be reported healthy');
});
test('collaboration stubs no longer claim network success', () => {
  const app = fs.readFileSync(path.join(web, 'app.js'), 'utf8');
  for (const fn of ['dfGenerateMultiPartQrCarousel', 'dfScanAnimatedQrCarouselStream', 'dfImportPeerDeckWithFreshFsrs', 'dfCollaborativeDeckMergeDiff']) {
    const i = app.indexOf('window.' + fn + ' = function');
    assert.ok(i > 0, fn);
    assert.match(app.slice(i, i + 260), /supported: false/);
  }
  assert.ok(!/Local LAN Offline Ready/.test(app) && !/FULL_PAYLOAD_DECODED/.test(app) && !/<50ms Drift/.test(app));
});

test('CodeQL-driven fixes: spelling card has no inline JS and escapes card text; fake AES retired; sanitizers loop', () => {
  const app = fs.readFileSync(path.join(web, 'app.js'), 'utf8');
  const i = app.indexOf('function dfRenderSpellingQuizCardHtml(card)');
  const fn = app.slice(i, i + 3200);
  assert.ok(!/onclick=/.test(fn), 'no inline handlers in spelling card');
  assert.match(fn, /data-df-spelling/);
  assert.match(fn, /var meaning = esc\(/);
  assert.match(app, /dfGenerateEncryptedVaultBackup was removed/);
  assert.ok(!/AES-GCM-256-CLIENT/.test(app), 'XOR must not be labelled AES-GCM');
  assert.match(app, /DOM-based allowlist sanitizer/);
  const latex = fs.readFileSync(path.join(web, 'modules/sovereign_academic_exporter.js'), 'utf8');
  const ex = require(path.join(web, 'modules/sovereign_academic_exporter.js'));
  assert.equal(ex._latexEscape('a\\b{c}'), 'a\\textbackslash{}b\\{c\\}');
  assert.ok(latex.length > 0);
});

test('STEM formula SVG escapes user input (no element/attribute injection)', () => {
  const S = require(path.join(web, 'modules/stem/stem_typesetter_studio.js'));
  const svg = new S().renderFormulaSvg('x<image href=x onerror=alert(1)>"\' E=mc^2');
  assert.ok(!/<image/.test(svg) && !/onerror=alert\(1\)>/.test(svg));
  assert.match(svg, /&lt;image/);
  assert.match(svg, /tspan/);
});
