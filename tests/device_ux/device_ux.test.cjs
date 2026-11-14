'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const W = path.resolve(__dirname, '../../android/app/src/main/assets/web');
const read = f => fs.readFileSync(path.join(W, f), 'utf8');

function loadCueModule(file) {
  const created = [];
  function FakeAudio(src) { this.src = src; this.paused = true; this.volume = 1; created.push(this); this.play = () => { this.paused = false; return Promise.resolve(); }; this.pause = () => { this.paused = true; }; }
  const win = { Audio: FakeAudio, document: { addEventListener() {}, querySelectorAll() { return []; } }, setInterval() { return 1; }, clearInterval() {} };
  win.window = win; win.globalThis = win;
  vm.runInNewContext(read(file), win, { filename: file });
  return { api: win.SovereignAudioCues || win.SovereignAudioSuite, win, created };
}

for (const file of ['modules/sovereign_audio_cues.js', 'modules/sovereign_ambient_dsp.js', 'modules/sovereign_audio_suite.js']) {
  test(file + ' never redirects an unknown sound to another recording', () => {
    const { win, created } = loadCueModule(file);
    const cues = win.SovereignAudioCues;
    for (const key of ['night', 'brown', 'pink', 'ocean', 'fire', 'unknown-sound']) {
      const before = created.length;
      assert.equal(cues.playAmbient(key), false, key + ' must not play a substitute recording');
      assert.equal(created.length, before, key + ' must not create an Audio element');
    }
    cues.playAmbient('forest');
    assert.match(created[created.length - 1].src, /forest_birds\.ogg$/);
    cues.stopAmbient();
  });
  test(file + ' mixAmbient does not start the bird recording', () => {
    const { win, created } = loadCueModule(file);
    win.SovereignAudioCues.mixAmbient();
    assert.ok(created.length >= 1 && !created.some(a => /forest_birds/.test(a.src)));
  });
}

test('index.html does not wire audio by button label text', () => {
  const html = read('index.html');
  const start = html.indexOf('sovereignTask806LiveWiring');
  const block = html.slice(start, html.indexOf('</script>', start));
  for (const bad of ['playAmbient', 'mixAmbient', 'stopAmbient', 'playBell', "'preview'", "'water & rain'", "'forest & wind'"])
    assert.ok(!block.includes(bad), 'label-text audio wiring must stay removed: ' + bad);
});

test('every Nature tile points at a shipped, licensed recording and bird audio is only the Forest Birds tile', () => {
  const app = read('app.js');
  const data = app.slice(app.indexOf('const SOUNDS_DATA = ['), app.indexOf('];', app.indexOf('const SOUNDS_DATA = [')));
  const licenses = JSON.parse(read('audio/LICENSES.json')).files.map(f => f.file);
  const rows = [...data.matchAll(/id: '(\w+)'[^}]*src: "audio\/([\w.]+)"/g)];
  assert.equal(rows.length, 5);
  for (const [, id, file] of rows) {
    assert.ok(fs.existsSync(path.join(W, 'audio', file)), file + ' must exist');
    assert.ok(licenses.includes(file), file + ' must be in LICENSES.json');
  }
  assert.deepEqual(rows.filter(r => /bird/.test(r[2])).map(r => r[1]), ['forest']);
  assert.match(app, /SOUND_NAME_EN = \{ rain: 'Rain on Window', forest: 'Forest Birds' \}/);
  const preset = app.slice(app.indexOf('function playPresetRelaxMix'), app.indexOf('function playPresetRelaxMix') + 260);
  assert.ok(!/forest/.test(preset), 'the Mix preset must not start the bird recording');
});

test('3D studio and Multi-Track mixer list only recordings that ship', () => {
  const app = read('app.js');
  for (const stale of ["name: '🌊 Ocean Surf'", "name: '🔥 Warm Fireplace'", "name: '🌊 Waterfall Mist'", "name: '🦗 Night Ambiance'", "name: '🔥 Hearth Fireplace'"])
    assert.ok(!app.includes(stale), stale + ' has no bundled recording');
});

test('device UX stylesheet fixes the root causes (nav clearance, light root, slider hit area, readable pill)', () => {
  const css = read('styles/device_ux_fixes.css');
  assert.match(css, /html body \{ padding-bottom: calc\(var\(--df-nav-clear\)/);
  assert.match(css, /--df-nav-clear: 164px/);
  assert.match(css, /\.stile-vol \{[^}]*height: 32px/);
  assert.match(css, /background-color: #fafdff !important/);
  assert.ok(read('index.html').includes('styles/device_ux_fixes.css'));
  const pill = read('modules/ui/studio_navigator_drawer.js');
  assert.ok(pill.includes('rgba(255, 255, 255, 0.94)') && pill.includes('"#17284f", "important"'));
});

test('new catalog keys exist in the source and in every language pack', () => {
  const root = path.resolve(__dirname, '../..');
  const src = JSON.parse(fs.readFileSync(path.join(root, 'i18n/source_en.json'), 'utf8'));
  const keys = Object.keys(src).filter(k => /device-ux#/.test(src[k].ctx));
  assert.ok(keys.length >= 40);
  const langs = JSON.parse(fs.readFileSync(path.join(root, 'i18n/languages.json'), 'utf8'));
  const codes = (Array.isArray(langs) ? langs : langs.languages || Object.keys(langs)).map(x => x.code || x).filter(c => c !== 'en');
  assert.equal(codes.length, 99);
  const ph = s => (s.match(/\{\d+\}/g) || []).sort().join();
  for (const c of codes) {
    const pack = JSON.parse(fs.readFileSync(path.join(root, 'i18n/packs', c + '.json'), 'utf8'));
    for (const k of keys) {
      assert.ok(typeof pack.t[k] === 'string' && pack.t[k].length, c + ' missing ' + k);
      assert.equal(ph(pack.t[k]), ph(k), c + ' placeholders ' + k);
      assert.ok(!/[֐-׿]/.test(pack.t[k]) && !/[٠-٩۰-۹०-९০-৯]/.test(pack.t[k]), c + ' script/digits ' + k);
    }
  }
});
