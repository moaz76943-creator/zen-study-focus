'use strict';
// Permanent guard rails: secrets, size budgets, ratchets on risky patterns, locale completeness.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const web = path.join(root, 'android/app/src/main/assets/web');
const ratchets = JSON.parse(fs.readFileSync(path.join(__dirname, 'ratchets.json'), 'utf8'));

function tracked() {
  try { return execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 1 << 26 }).toString().split('\0').filter(Boolean); }
  catch (_) { return null; }
}
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const jsFiles = walk(web).filter((f) => f.endsWith('.js'));
const count = (re, files) => files.reduce((n, f) => n + (fs.readFileSync(f, 'utf8').match(re) || []).length, 0);

test('no keystores, private keys, tokens or password literals are tracked', () => {
  const files = tracked();
  if (!files) return; // not a git checkout
  const badExt = files.filter((f) => /\.(jks|keystore|p12|pfx|pem|key)$/i.test(f) || /(^|\/)(keystore\.properties|\.git-credentials|\.env)$/.test(f));
  assert.deepEqual(badExt, [], 'secret-bearing files are tracked');
  const patterns = [/-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, /\bghp_[A-Za-z0-9]{30,}/, /\bgithub_pat_[A-Za-z0-9_]{30,}/, /\bAKIA[0-9A-Z]{16}\b/, /\bAIza[0-9A-Za-z_-]{35}\b/, /\bsk-[A-Za-z0-9]{32,}/, /-storepass\s+(?!["$])\S+/];
  const hits = [];
  for (const f of files) {
    if (/\.(png|jpg|jpeg|webp|ogg|wav|mp3|jar|zip|pdf|ttf|woff2?)$/i.test(f)) continue;
    const p = path.join(root, f);
    let s; try { s = fs.readFileSync(p, 'utf8'); } catch (_) { continue; }
    if (s.length > 6e6) continue;
    for (const re of patterns) if (re.test(s)) hits.push(f + ' ~ ' + re);
  }
  assert.deepEqual(hits, []);
});

test('size budgets hold (APK size / load time protection)', () => {
  const app = fs.statSync(path.join(web, 'app.js')).size;
  assert.ok(app <= ratchets.appJsMaxBytes, 'app.js is ' + app + ' bytes');
  const all = walk(web);
  const total = all.reduce((n, f) => n + fs.statSync(f).size, 0);
  assert.ok(total <= ratchets.webAssetsMaxBytes, 'web assets are ' + total + ' bytes');
  const big = all.filter((f) => fs.statSync(f).size > ratchets.singleFileMaxBytes).map((f) => path.relative(web, f));
  assert.deepEqual(big, [], 'single file over budget');
});

test('risky patterns only ever decrease (ratchet)', () => {
  const html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
  const noEmpty = (src) => src;
  const measured = {
    innerHTMLAssignments: count(/\.innerHTML\s*\+?=\s*(?!\s*(?:''|""|``)\s*[;,)])/g, jsFiles),
    insertAdjacentHTML: count(/insertAdjacentHTML/g, jsFiles),
    inlineOnclickInIndexHtml: (noEmpty(html).match(/\sonclick=/g) || []).length,
    documentWrite: count(/document\.write\(/g, jsFiles),
    evalOrNewFunction: count(/(?<![.\w])eval\(|new Function\(/g, jsFiles),
    consoleLog: count(/console\.log\(/g, jsFiles)
  };
  const over = Object.keys(measured).filter((k) => measured[k] > ratchets[k]).map((k) => `${k}: ${measured[k]} > ${ratchets[k]}`);
  assert.deepEqual(over, [], 'a risky pattern increased; use safe DOM APIs / listeners instead');
  const under = Object.keys(measured).filter((k) => measured[k] < ratchets[k]).map((k) => `${k}: ${measured[k]} < ${ratchets[k]}`);
  if (under.length) console.log('# ratchet can be tightened in tests/ratchets.json:', under.join('; '));
});

test('locale JSON: exactly 20 languages, every key present, no blanks, placeholders and Western digits intact', () => {
  const dir = path.join(web, 'locales');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  assert.equal(files.length, 20, 'language set must be exactly 20: ' + files.join(','));
  const flat = (o, p = '', r = {}) => { for (const k of Object.keys(o)) { const v = o[k]; if (v && typeof v === 'object') flat(v, p + k + '.', r); else r[p + k] = v; } return r; };
  const en = flat(JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8')));
  const ph = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join();
  const eastern = /[٠-٩۰-۹०-९০-৯]/;
  const problems = [];
  for (const f of files) {
    const L = flat(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
    for (const k of Object.keys(en)) {
      if (!(k in L)) problems.push(`${f}: missing ${k}`);
      else if (!String(L[k]).trim()) problems.push(`${f}: empty ${k}`);
      else {
        if (ph(L[k]) !== ph(en[k])) problems.push(`${f}: placeholder mismatch ${k}`);
        if (eastern.test(String(L[k]))) problems.push(`${f}: non-Western digits in ${k}`);
      }
    }
    for (const k of Object.keys(L)) if (!(k in en)) problems.push(`${f}: extra key ${k}`);
  }
  assert.deepEqual(problems, []);
});

test('manifest merged-risk: no component is exported without an intent filter reason', () => {
  const m = fs.readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
  const exported = [...m.matchAll(/<(activity|service|receiver|provider)[^>]*android:exported="true"/g)].map((x) => x[1]);
  assert.deepEqual(exported, ['activity'], 'only the launcher activity may be exported');
  assert.ok(!/<service|<provider/.test(m), 'no service/provider expected in this offline app');
});
