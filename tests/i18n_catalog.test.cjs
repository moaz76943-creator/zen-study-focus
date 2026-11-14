'use strict';
// 100-language registry and UI catalog: structure, Hebrew exclusion, pack validity, Western digits, picker list.
const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const path = require('node:path');
const repo = path.resolve(__dirname, '..'); const web = path.join(repo, 'android/app/src/main/assets/web');
const reg = JSON.parse(fs.readFileSync(path.join(repo, 'i18n/languages.json'), 'utf8'));
const src = JSON.parse(fs.readFileSync(path.join(repo, 'i18n/source_en.json'), 'utf8'));
const { validate } = require(path.join(repo, 'tools/i18n/build_packs.cjs'));
const codes = reg.languages.map((l) => l.code);

test('exactly 100 distinct official languages, valid BCP-47 base codes, no Hebrew or variants counted twice', () => {
  assert.equal(codes.length, 100); assert.equal(new Set(codes).size, 100);
  for (const c of codes) assert.match(c, /^[a-z]{2,3}$/, c);
  for (const bad of ['he', 'iw', 'yi', 'heb', 'jw', 'prs']) assert.ok(!codes.includes(bad), bad);
  for (const l of reg.languages) { assert.ok(['ltr', 'rtl'].includes(l.dir)); assert.ok(l.script && l.nativeName && l.enName && Array.isArray(l.plural) && l.plural.includes('other')); }
  assert.deepEqual(reg.languages.filter((l) => l.dir === 'rtl').map((l) => l.code).sort(), ['ar', 'fa', 'ps', 'ur']);
});

test('runtime official list and app LANG_CATALOG match the registry', () => {
  const rt = fs.readFileSync(path.join(web, 'i18n_ui_catalog.js'), 'utf8');
  const list = JSON.parse(rt.match(/DF_OFFICIAL_LANGS = (\[[^\]]*\])/)[1]);
  assert.deepEqual(list, reg.languages.map((l) => l.catalogCode || l.code));
  const app = fs.readFileSync(path.join(web, 'app.js'), 'utf8');
  const a = app.indexOf('const LANG_CATALOG = ['); const cat = JSON.parse(app.slice(a + 'const LANG_CATALOG = '.length, app.indexOf('];', a) + 1));
  const have = new Set(cat.map((c) => c.code));
  for (const l of reg.languages) assert.ok(have.has(l.catalogCode || l.code), 'LANG_CATALOG missing ' + l.code);
  assert.ok(!cat.some((c) => /^(he|iw)$/.test(c.code)));
  assert.ok(/rawInput === 'jv'\) rawInput = 'jw'/.test(app), 'jv resolves to the legacy jw catalog entry');
});

test('no Hebrew resources anywhere in the localization sources', () => {
  const files = ['i18n/languages.json', 'i18n/source_en.json', 'android/app/src/main/assets/web/i18n_ui_catalog.js'];
  for (const d of ['i18n/packs', 'android/app/src/main/assets/web/locales/ui']) if (fs.existsSync(path.join(repo, d))) for (const f of fs.readdirSync(path.join(repo, d))) files.push(d + '/' + f);
  for (const f of files) { assert.ok(!/[֐-׿]/.test(fs.readFileSync(path.join(repo, f), 'utf8')), f); assert.ok(!/^(he|iw|yi)\./.test(path.basename(f)), f); }
});

test('source catalog is English only and has no empty keys', () => {
  for (const k of Object.keys(src)) { assert.ok(k.trim()); assert.ok(!/[֐-ࣿ]/.test(k), k); }
});

test('every pack passes structural validation and its runtime file is up to date', () => {
  const dir = path.join(repo, 'i18n/packs'); if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const code = f.slice(0, -5); const pack = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.deepEqual(validate(code, pack), [], code);
    assert.ok(pack.status !== 'human-reviewed' && pack.status !== 'native-speaker-reviewed' || pack.reviewEvidence, code + ': reviewed status needs reviewEvidence');
    const rt = fs.readFileSync(path.join(web, 'locales/ui', code + '.js'), 'utf8');
    assert.ok(rt.includes(JSON.stringify(pack.t).slice(0, 200)), code + ': run node tools/i18n/build_packs.cjs');
  }
});
