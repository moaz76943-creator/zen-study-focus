'use strict';
/* RED until lane 00 merges features. This is intentionally a release-blocking gate.
 * Tests verify source wiring, not Android/WebView interaction or actual user gestures. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const web = path.resolve(__dirname, '../../android/app/src/main/assets/web');
const exists = f => fs.existsSync(path.join(web, f));
const read = f => fs.readFileSync(path.join(web, f), 'utf8');
const html = read('index.html');
const activeScripts = [...html.matchAll(/<script[^>]*src=["']([^"']+\.js)["']/g)].map(x => x[1]);
const scriptPos = f => html.indexOf('src="' + f + '"');
const cssPos = f => html.indexOf('href="' + f + '"');
const liveSource = () => html + '\n' + activeScripts.filter(exists).map(read).join('\n');
const referencedByLiveConsumer = (symbol, definitionFile) =>
  html.includes(symbol) || activeScripts.some(f => f !== definitionFile && exists(f) && read(f).includes(symbol));

function loaded(f) {
  assert.ok(exists(f), 'BLOCKED: unmerged module ' + f);
  assert.ok(scriptPos(f) >= 0, 'BLOCKED: ' + f + ' exists but index.html never loads it');
}
function ordered(a,b) {
  loaded(a); loaded(b);
  assert.ok(scriptPos(a) < scriptPos(b), 'BLOCKED: dependency must load first: ' + a + ' -> ' + b);
}

test('lane 01 compatibility module must initialize before v21 application code', () => {
  ordered('data_compat_v21.js','app.js');
  assert.ok(referencedByLiveConsumer('DeepFocusDataCompatV21','data_compat_v21.js'), 'BLOCKED: missing live compatibility consumer / recovery guard');
});

test('notes engine is explicitly wired to the final Notes UX (lane 03 dependency)', () => {
  ordered('notes_core_v21.js','notes_studio.js');
  assert.ok(referencedByLiveConsumer('DeepFocusNotesCoreV21','notes_core_v21.js'), 'BLOCKED: no live Notes Core consumer');
});

test('advanced task UI invokes the real task engine', () => {
  ordered('tasks_core_v21.js','tasks_studio.js');
  assert.ok(referencedByLiveConsumer('DeepFocusTasksCoreV21','tasks_core_v21.js'), 'BLOCKED: no live tasks consumer');
});

test('analytics studio invokes real history-backed calculations', () => {
  ordered('analytics_core_v21.js','analytics_studio.js');
  assert.ok(referencedByLiveConsumer('DeepFocusAnalyticsV21','analytics_core_v21.js'), 'BLOCKED: no live analytics consumer');
});

test('optional sound mixer script is present and explicitly integrated', () => {
  loaded('sound_mix_controls.js');
  assert.ok(referencedByLiveConsumer('DeepFocusSoundMixer','sound_mix_controls.js') || referencedByLiveConsumer('createSoundMixer','sound_mix_controls.js'), 'BLOCKED: mixer has no live consumer');
});

test('premium tokens and components are actually referenced by the live page', () => {
  for (const css of ['design_tokens_v22.css','ui_components_v22.css']) {
    assert.ok(exists(css), 'BLOCKED: CSS missing ' + css);
    assert.ok(cssPos(css) >= 0, 'BLOCKED: CSS not included in HTML ' + css);
  }
  loaded('locale_premium_v22.js');
  assert.ok(/df-v22/.test(liveSource()), 'BLOCKED: no live design root opt-in');
});

test('live interface contains 20 complete premium locale label tables', () => {
  loaded('locale_premium_v22.js');
  const source = read('locale_premium_v22.js');
  const sandbox = {window:{}};
  require('node:vm').runInNewContext(source,sandbox,{timeout:3000,filename:'locale_premium_v22.js'});
  const api = sandbox.window.DF22Locale;
  assert.ok(api && api.translations);
  const keys = Object.keys(api.translations.en).sort();
  assert.equal(Object.keys(api.translations).length,20);
  for (const lang of Object.keys(api.translations)) {
    assert.deepEqual(Object.keys(api.translations[lang]).sort(),keys);
    assert.ok(keys.every(k=>api.translations[lang][k].trim().length>0),lang+' has empty values');
  }
  for (const lang of ['ar','ur','fa']) assert.equal(api.dir(lang),'rtl');
});
