'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const web = path.resolve(__dirname, '../android/app/src/main/assets/web');
const ui = fs.readFileSync(path.join(web, 'modules/flashcards/flashcards_ui.js'), 'utf8');
const index = fs.readFileSync(path.join(web, 'index.html'), 'utf8');

function dict(lang) {
  const m = ui.match(new RegExp('\\n    ' + lang + ': \\{([\\s\\S]*?)\\n    \\}[,\\n]'));
  assert.ok(m, 'dictionary ' + lang);
  const keys = {}; for (const k of m[1].matchAll(/(\w+): '((?:[^'\\]|\\.)*)'/g)) keys[k[1]] = k[2];
  return keys;
}
test('every string key used by the UI exists in English; Arabic covers all English keys', () => {
  const en = dict('en'), ar = dict('ar');
  const used = new Set([...ui.matchAll(/\bT\('(\w+)'\)/g)].map((m) => m[1]));
  for (const k of [...ui.matchAll(/T\(([^)]*)\)/g)].map((m) => m[1]).filter((x) => /\[|\?/.test(x))) void k;
  const missing = [...used].filter((k) => !(k in en));
  assert.deepEqual(missing, [], 'keys used but not defined');
  assert.deepEqual(Object.keys(en).filter((k) => !(k in ar)), [], 'Arabic is missing keys');
  assert.deepEqual(Object.keys(ar).filter((k) => !(k in en)), [], 'Arabic has extra keys');
});
test('no Eastern-Arabic digits and no Hebrew in Flashcards strings or code', () => {
  assert.ok(!/[٠-٩۰-۹]/.test(ui), 'Eastern digits');
  assert.ok(!/[֐-׿]/.test(ui), 'Hebrew');
});
test('UI never uses innerHTML/insertAdjacentHTML/eval and adds no inline handlers or network calls', () => {
  for (const f of ['flashcards_ui.js', 'flashcards_core.js', 'flashcards_tts.js']) {
    const src = fs.readFileSync(path.join(web, 'modules/flashcards', f), 'utf8');
    assert.ok(!/innerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function|fetch\(|XMLHttpRequest|WebSocket/.test(src), f);
  }
  const section = index.match(/<main class="screen-section" id="sec-flashcards"[^>]*>/)[0];
  assert.ok(!/onclick|onerror/i.test(section));
});
test('assets are wired in index.html in dependency order and Android adds no new permission', () => {
  const order = ['fsrs.js', 'flashcards_core.js', 'flashcards_tts.js', 'flashcards_ui.js'].map((f) => index.indexOf('modules/flashcards/' + f));
  assert.ok(order.every((i) => i > 0) && order.every((v, i) => i === 0 || v > order[i - 1]), String(order));
  const manifest = fs.readFileSync(path.resolve(__dirname, '../android/app/src/main/AndroidManifest.xml'), 'utf8');
  const perms = [...manifest.matchAll(/uses-permission[^>]*android:name="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(perms, ['android.permission.POST_NOTIFICATIONS', 'android.permission.RECEIVE_BOOT_COMPLETED', 'android.permission.VIBRATE']);
  assert.ok(!/RECORD_AUDIO|INTERNET/.test(manifest));
});
test('Java TTS bridge is narrow, honest and lifecycle-safe (source contract)', () => {
  const j = fs.readFileSync(path.resolve(__dirname, '../android/app/src/main/java/com/zenstudy/focus/NativeTts.java'), 'utf8');
  const m = fs.readFileSync(path.resolve(__dirname, '../android/app/src/main/java/com/zenstudy/focus/MainActivity.java'), 'utf8');
  assert.ok(/"pause", false/.test(j) && /"genderApi", false/.test(j));
  assert.ok(/isNetworkConnectionRequired/.test(j) && /VOICE_REQUIRES_NETWORK/.test(j) && /LANGUAGE_UNAVAILABLE/.test(j));
  assert.ok(/nativeTts\.stop\(\)/.test(m) && /nativeTts\.shutdown\(\)/.test(m), 'stop on pause, shutdown on destroy');
  assert.ok(!/INTERNET|RECORD_AUDIO/.test(j));
});
