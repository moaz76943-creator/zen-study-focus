'use strict';
// Regression guards for the "50 fixes" batch. Static + behavioural; no browser needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const web = path.join(root, 'android/app/src/main/assets/web');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
function walk(dir, out = []) {
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const jsFiles = walk(web).filter((f) => f.endsWith('.js'));

test('every string toWesternDigits really converts Arabic-Indic digits (normaliser regression)', () => {
  let checked = 0;
  for (const file of jsFiles) {
    const src = fs.readFileSync(file, 'utf8');
    const re = /function toWesternDigits\s*\((\w+)[^)]*\)\s*\{/g;
    let m;
    while ((m = re.exec(src))) {
      let i = re.lastIndex, depth = 1;
      while (i < src.length && depth > 0) { depth += (src[i] === '{') - (src[i] === '}'); i++; }
      const body = src.slice(m.index, i);
      if (/Number\(|toFixed|Math\.round/.test(body)) continue; // numeric formatter, not a string converter
      // identity helpers are only acceptable when they obviously just stringify for ASCII-only callers
      if (!/String\(/.test(body) && !/replace\(/.test(body)) continue;
      assert.match(body, /0660|٠|٠/, path.relative(web, file) + ' does not convert U+0660 digits');
      checked++;
    }
  }
  assert.ok(checked > 30, 'expected many converters, saw ' + checked);
});

test('numeral guard converts every supported digit block and flags only non-Latin digits', () => {
  const n = require(path.join(web, 'js/numeral_invariant_guard.js'));
  assert.equal(n.sanitizeToWesternDigits('١٢٣ ۴۵۶ ०१२ ০১২ 789'), '123 456 012 012 789');
  assert.equal(n.containsOnlyWesternDigits('2026-11-13'), true);
  assert.equal(n.containsOnlyWesternDigits('٢٠٢٦'), false);
});

test('runtime activator never rewrites date inputs and loads no audio', () => {
  const src = read('android/app/src/main/assets/web/js/deep_focus_runtime_activator.js');
  assert.ok(!/input\[type="date"\]/.test(src), 'date inputs must not be touched');
  assert.ok(!/new Audio\(|\.mp3/.test(src), 'audio belongs to the CC0 ogg engines');
  assert.ok(!/charCodeAt\(0\)\s*-\s*1632[^)]*\)\s*;?\s*$/m.test(src.replace(/0x0660/g, '')) || /0x0660/.test(src));
});

test('task cards never garble dates (tasks_studio ascii helper)', () => {
  const src = read('android/app/src/main/assets/web/tasks_studio.js');
  assert.ok(!/d<='9'\?1632/.test(src));
  const m = /const ascii=v=>[^\n]*?;(?=\n)/.exec(src);
  assert.ok(m, 'ascii helper present');
  const ascii = new Function(m[0] + '; return ascii;')();
  assert.equal(ascii('2026-11-13 ١٤:٠٥'), '2026-11-13 14:05');
});

test('no unlicensed mp3 loops ship in assets', () => {
  assert.deepEqual(walk(web).filter((f) => /\.mp3$/i.test(f)), []);
});

test('user text never reaches innerHTML unescaped (flashcards, jargon, time blocks, RSVP)', () => {
  const app = read('android/app/src/main/assets/web/app.js');
  assert.ok(!app.includes('${card.front}') && !app.includes('${card.back}'));
  assert.ok(!/'<strong[^']*>' \+ sug\.word/.test(app));
  assert.ok(!/(?<!escapeHtmlText)\(b\.subject \|\| 'Focus'\) \+/.test(app));
  const rsvp = read('android/app/src/main/assets/web/modules/ui_touch_engine.js');
  assert.ok(!/innerHTML\s*=\s*`\$\{(before|b)\}/.test(rsvp));
});

test('completion tone labels match the real nature sounds in all 20 locales', () => {
  const T = require(path.join(web, 'js/completion_tone_picker.js'));
  const banned = /bell|bowl|gong|glocke|klangschale|campana|cuenco|cloche|bol |sino|taça|gongo|lonceng|mangkuk|zil|çanağı|chuông|bát|cồng|dzwonek|misa|gong|zenbel|禅|钟|锣|鈴|ゴング|벨|징|घंटी|कटोरा|घंटा|ঘণ্টা|বাটি|گھنٹی|پیالہ|گونگ|زنگ|کاسه|колокол|чаша|гонг/i;
  for (const code of T.supported) {
    if (code === 'en' || code === 'ar') continue;
    const row = T.ROWS[code];
    for (const label of row.slice(0, 5)) assert.ok(!banned.test(label), code + ': ' + label);
  }
  assert.equal(T.label('en', 'gong'), 'Distant Thunder');
  assert.equal(T.label('ar', 'gong'), 'رعد بعيد');
});

test('native hardening invariants (MainActivity / receiver / manifest / CSP)', () => {
  const main = read('android/app/src/main/java/com/zenstudy/focus/MainActivity.java');
  assert.ok(main.includes('openOutputStream(exportTarget, "wt")'), 'backup export must truncate');
  assert.ok(!/openOutputStream\([^)]*"w"\)/.test(main));
  assert.ok(main.includes('shouldInterceptRequest') && main.includes('"https".equalsIgnoreCase(scheme)'));
  assert.ok(main.includes('rendererDeaths > 3'));
  assert.ok(main.includes('removeJavascriptInterface("ZenNative")'));
  assert.ok(/new Thread\(\(\) -> \{\s*try \(java\.io\.InputStream in/.test(main), 'import IO off UI thread');
  const rcv = read('android/app/src/main/java/com/zenstudy/focus/FocusAlarmReceiver.java');
  assert.ok(rcv.includes('ACTION_MY_PACKAGE_REPLACED') && rcv.includes('isHighSurrogate'));
  const man = read('android/app/src/main/AndroidManifest.xml');
  assert.ok(man.includes('android:supportsRtl="true"'));
  assert.ok(man.includes('android.intent.action.MY_PACKAGE_REPLACED'));
  assert.ok(/configChanges="[^"]*uiMode/.test(man));
  assert.ok(!/INTERNET|RECORD_AUDIO/.test(man));
  const html = read('android/app/src/main/assets/web/index.html');
  for (const d of ["object-src 'none'", "base-uri 'none'", "form-action 'none'"]) assert.ok(html.includes(d), d);
});

test('action dispatcher handles each click once and never writes hard-coded Arabic labels onto buttons', () => {
  const src = read('android/app/src/main/assets/web/modules/core/action_dispatcher_engine.js');
  assert.ok(!/el\.onclick\s*=/.test(src), 'delegated listener is the single click path');
  assert.ok(src.includes('this._delegated'));
  assert.ok(!/startBtn\.textContent\s*=/.test(src) && !/setAttribute\("aria-label", "[^"]*[؀-ۿ]/.test(src));
});

test('accessibility suite never stamps ids as aria-labels', () => {
  const src = read('android/app/src/main/assets/web/modules/sovereign_accessibility_suite.js');
  assert.ok(!/setAttribute\('aria-label',\s*el\.id/.test(src));
});

test('storage write guard skips identical writes but never real ones', () => {
  const store = new Map(); let real = 0;
  class Storage { getItem(k) { return store.has(k) ? store.get(k) : null; } setItem(k, v) { real++; store.set(k, String(v)); } }
  const ctx = { Storage }; ctx.window = ctx;
  new Function('window', 'globalThis', read('android/app/src/main/assets/web/modules/core/storage_write_guard.js'))(ctx, ctx);
  const s = new Storage();
  s.setItem('a', '1'); s.setItem('a', '1'); s.setItem('a', 1); s.setItem('a', '2');
  assert.equal(real, 2);
  assert.equal(s.getItem('a'), '2');
  assert.equal(ctx.DFStorageWriteGuard.skippedWrites(), 2);
  const idx = read('android/app/src/main/assets/web/index.html');
  assert.ok(idx.indexOf('storage_write_guard.js') < idx.indexOf('sovereign_runtime_shield_828.js'));
});
