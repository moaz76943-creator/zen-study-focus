'use strict';
// Product constitution as executable checks: identity, offline, versioning, audio licensing.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const web = path.join(root, 'android/app/src/main/assets/web');

test('package identity is immutable', () => {
  const g = read('android/app/build.gradle');
  assert.match(g, /applicationId "com\.deepfocus\.study"/);
  assert.match(g, /namespace 'com\.zenstudy\.focus'/);
  assert.match(g, /targetSdk 36/);
});

test('version comes only from version.properties and is consistent', () => {
  const v = read('android/version.properties');
  const code = Number(/VERSION_CODE=(\d+)/.exec(v)[1]);
  assert.ok(code > 41000);
  assert.match(v, /VERSION_NAME=\d+\.\d+\.\d+/);
  assert.ok(!/versionCode\s+\d+/.test(read('android/app/build.gradle')));
});

test('app is fully offline: no network or microphone permission, no cleartext', () => {
  const m = read('android/app/src/main/AndroidManifest.xml');
  assert.ok(!/android\.permission\.(INTERNET|RECORD_AUDIO|ACCESS_NETWORK_STATE)/.test(m));
  assert.ok(!/usesCleartextTraffic="true"/.test(m));
});

test('only licensed natural .ogg audio ships', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const alerts = path.join(web, 'completion_alerts');
  const man = JSON.parse(fs.readFileSync(path.join(alerts, 'manifest.json'), 'utf8'));
  assert.equal(man.license, 'CC0-1.0');
  const listed = man.assets.map((a) => path.join(alerts, a.path));
  const media = walk(web).filter((f) => /\.(mp3|wav|m4a|aac|mid)$/i.test(f) && !listed.includes(f));
  assert.deepEqual(media, [], 'audio that is neither ogg nor a manifest-listed completion alert');
  for (const a of man.assets) {
    const h = require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(alerts, a.path))).digest('hex');
    assert.equal(h, a.sha256, a.path + ' does not match its recorded digest');
  }
  const lic = JSON.parse(fs.readFileSync(path.join(web, 'audio/LICENSES.json'), 'utf8')).files.map((f) => f.file).sort();
  const ogg = fs.readdirSync(path.join(web, 'audio')).filter((f) => f.endsWith('.ogg')).sort();
  assert.deepEqual(ogg, lic, 'every shipped ogg needs a license record and vice versa');
  const sha = (f) => require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(web, 'audio', f))).digest('hex');
  assert.equal(new Set(ogg.map(sha)).size, ogg.length, 'duplicate recordings');
});

test('CSP forbids plugins, base-uri, forms and frames', () => {
  const h = read('android/app/src/main/assets/web/index.html');
  for (const d of ["object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-src 'none'"]) assert.ok(h.includes(d), d);
});

test('studio panels are responsive and carry no internal project labels', () => {
  const app = read('android/app/src/main/assets/web/app.js');
  const html = read('android/app/src/main/assets/web/index.html');
  assert.ok(!/(textContent|showToast\(|innerHTML)[^\n]*Master Pillar \d/.test(app), 'internal "Master Pillar" label visible to users');
  assert.ok(!/grid-template-columns:minmax\(180px, 1fr\) minmax\(260px, 2fr\)/.test(app), 'fixed-width Cornell grid overflows at 320px');
  assert.ok(!/repeat\(4,minmax\(70px,1fr\)\)/.test(app), 'fixed 4-column KPI grid overflows at 320px');
  assert.match(html, /\.df-white-premium div \{ flex-wrap: wrap !important; \}/);
});

test('"today" is never computed in UTC (wrong day for users east/west of Greenwich)', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const bad = [];
  for (const f of walk(web).filter((x) => x.endsWith('.js'))) {
    const src = fs.readFileSync(f, 'utf8');
    if (/new Date\(\)\.toISOString\(\)\.(slice\(0, ?10\)|split\('T'\)\[0\])/.test(src)) bad.push(path.relative(web, f));
  }
  assert.deepEqual(bad, [], 'use local date parts, not toISOString(), for the current day');
});

test('release_manifest_v21.json always matches version.properties (no stale metadata)', () => {
  const v = read('android/version.properties');
  const m = JSON.parse(read('release_manifest_v21.json'));
  assert.equal(m.versionCode, Number(/VERSION_CODE=(\d+)/.exec(v)[1]));
  assert.equal(m.version, /VERSION_NAME=([\d.]+)/.exec(v)[1]);
  assert.equal(m.package, 'com.deepfocus.study');
});

test('no built binaries (apk/aab) are tracked in Git', () => {
  let files; try { files = require('node:child_process').execFileSync('git', ['ls-files'], { cwd: root }).toString().split('\n'); } catch (_) { return; }
  assert.deepEqual(files.filter((f) => /\.(apk|aab)$/i.test(f)), []);
});

test('no global CSS breaks words mid-word (overflow-wrap: anywhere / word-break: break-word)', () => {
  const walkAll = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walkAll(path.join(d, e.name)) : [path.join(d, e.name)]);
  const bad = walkAll(web).filter((f) => /\.(css|html)$/.test(f))
    .filter((f) => /overflow-wrap:\s*anywhere|word-break:\s*break-word/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(web, f));
  assert.deepEqual(bad, [], 'use overflow-wrap: break-word; anywhere splits normal words in narrow buttons');
});

test('completion tones use bundled recordings, never synthesized sound', () => {
  const app = read('android/app/src/main/assets/web/app.js');
  assert.match(app, /COMPLETION_TONE_FILES/);
  assert.ok(!/createNatureSynthFallback/.test(app));
  const i = app.indexOf('function playCompletionTone');
  assert.ok(!/createOscillator|__dfNoopOsc/.test(app.slice(i, i + 2500)));
});

test('app.js derives calendar days from local date parts (no UTC day slicing)', () => {
  const app = fs.readFileSync(path.join(web, 'app.js'), 'utf8');
  const hits = app.split('\n').filter((l) => /toISOString\(\)\.(split\(["']T["']\)\[0\]|slice\(0, ?10\))/.test(l) && !/sessionUtcDate/.test(l));
  assert.deepEqual(hits.map((h) => h.trim().slice(0, 80)), [], 'use dfLocalDayKey() instead');
});
