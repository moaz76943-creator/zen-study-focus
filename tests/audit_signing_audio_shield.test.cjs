'use strict';
// Regression guards from the external engineering audit (signing pipeline, honest audio set,
// MutationObserver shield lifecycle, dogfood suite never auto-runs).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const web = path.join(root, 'android/app/src/main/assets/web');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const app = read('android/app/src/main/assets/web/app.js');

test('release workflow has no fixed keystore password, no swallowed APK failure, verifies signatures', () => {
  const wf = read('.github/workflows/build_aab.yml');
  assert.ok(!/zenfocus2026/.test(wf), 'fixed key name/password must not be in the workflow');
  assert.ok(!/assembleRelease[^\n]*\|\|\s*true/.test(wf), 'assembleRelease failure must fail the job');
  assert.ok(!/--install[^\n]*\|\|\s*true/.test(wf), 'SDK install failure must fail the job');
  assert.match(wf, /DEEPFOCUS_KEYSTORE_B64/);
  assert.match(wf, /APKSIGNER" verify/);
  assert.match(wf, /jarsigner -verify/);
  assert.match(wf, /DEEPFOCUS_REQUIRE_SIGNING/);
  assert.match(wf, /permissions:\s*\n\s*contents: read/);
  const gradle = read('android/app/build.gradle');
  assert.match(gradle, /DEEPFOCUS_REQUIRE_SIGNING/);
  assert.ok(!/storePassword\s+["']/.test(gradle), 'no literal store password in gradle');
});

test('no other workflow generates a keystore with a hard-coded password', () => {
  const dir = path.join(root, '.github/workflows');
  for (const f of fs.readdirSync(dir)) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.ok(!/-storepass\s+zenfocus2026/.test(src), f + ' embeds a fixed keystore password');
  }
});

test('every offered sound maps to its own licensed recording', () => {
  const m = /const SOUNDS_DATA = \[([\s\S]*?)\n\];/.exec(app);
  assert.ok(m, 'SOUNDS_DATA present');
  const rows = [...m[1].matchAll(/id: '(\w+)'[^}]*?src: "([^"]+)"/g)].map((x) => ({ id: x[1], src: x[2] }));
  assert.ok(rows.length >= 5);
  const lic = JSON.parse(fs.readFileSync(path.join(web, 'audio/LICENSES.json'), 'utf8')).files.map((f) => f.file);
  const seen = new Set();
  for (const r of rows) {
    assert.ok(fs.existsSync(path.join(web, r.src)), r.id + ' file missing: ' + r.src);
    assert.ok(lic.includes(path.basename(r.src)), r.src + ' has no license record');
    assert.ok(!seen.has(r.src), r.src + ' is reused by two sound names');
    seen.add(r.src);
  }
});

test('unlicensed duplicate sounds/ directory is gone and nothing loaded points to it', () => {
  assert.ok(!fs.existsSync(path.join(web, 'sounds')), 'web/sounds must not ship (no license records)');
  const html = read('android/app/src/main/assets/web/index.html');
  assert.ok(!/sounds\//.test(html));
  assert.ok(!/toggleSoundTile\('fire'\)/.test(app));
});

test('MutationObserver shield: batches, delivers once, and drops pending batch on disconnect', async () => {
  const a = app.indexOf('/* === Deep Focus F3 MutationObserver');
  const b = app.indexOf('/* === Deep Focus F2 Zero-Oscillator Shield', a);
  assert.ok(a >= 0 && b > a);
  const block = app.slice(a, b);
  const live = [];
  class FakeMO {
    constructor(cb) { this.cb = cb; this.recs = []; live.push(this); }
    observe() {} disconnect() { this.recs = []; } takeRecords() { const r = this.recs; this.recs = []; return r; }
  }
  const win = { MutationObserver: FakeMO, requestAnimationFrame: (f) => setTimeout(f, 1) };
  new Function('window', 'requestAnimationFrame', 'setTimeout', block)(win, win.requestAnimationFrame, setTimeout);
  assert.notEqual(win.MutationObserver, FakeMO);
  let calls = 0, got = 0;
  const mo = new win.MutationObserver((recs) => { calls++; got += recs.length; });
  mo.observe({}, { childList: true });
  const native = live[live.length - 1];
  native.cb([{ a: 1 }, { a: 2 }], native);
  native.cb([{ a: 3 }], native);
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(calls, 1, 'three records in one window = one delivery');
  assert.equal(got, 3);
  // disconnect before the delayed flush: no stale callback
  native.cb([{ a: 4 }], native);
  mo.disconnect();
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(calls, 1, 'no callback after disconnect');
  // takeRecords returns the queued batch and cancels the delivery
  native.cb([{ a: 5 }], native);
  const taken = mo.takeRecords();
  assert.equal(taken.length, 1);
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(calls, 1);
  // attributeFilter (integrity) observers are delivered synchronously
  let sync = 0;
  const sec = new win.MutationObserver(() => { sync++; });
  sec.observe({}, { attributes: true, attributeFilter: ['class'] });
  const n2 = live[live.length - 1];
  n2.cb([{ x: 1 }], n2);
  assert.equal(sync, 1);
});

test('dogfood QA suite never runs automatically', () => {
  assert.ok(!/^\s*dfRunMultiStudioDogfoodSuite\(\);/m.test(app.replace(/retestBtn\.onclick[\s\S]*?\};/, '')));
  assert.ok(!/DOMContentLoaded[^\n]*dfRunMultiStudioDogfoodSuite/.test(app));
});

test('v21 envelope never invents raw defaults inside protected keys', () => {
  const i = app.indexOf('function dfBuildFortressEnvelope()');
  const body = app.slice(i, i + 1500);
  assert.ok(!/val = ['"]\[\]['"]/.test(body));
  assert.match(body, /val = null/);
});
