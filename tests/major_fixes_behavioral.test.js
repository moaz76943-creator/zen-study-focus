'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(repoRoot, 'android/app/src/main/assets/web/app.js'), 'utf8');
const buildGradle = fs.readFileSync(path.join(repoRoot, 'android/app/build.gradle'), 'utf8');
const mainJava = fs.readFileSync(path.join(repoRoot, 'android/app/src/main/java/com/zenstudy/focus/MainActivity.java'), 'utf8');

function extractWindowFn(source, name) {
  const idx = source.indexOf('window.' + name);
  assert.notStrictEqual(idx, -1, 'Missing function window.' + name);
  let depth = 0;
  let inBrace = false;
  let inStr = null;
  let esc = false;
  for (let i = idx; i < source.length; i++) {
    const ch = source[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (inStr) { if (ch === inStr) inStr = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
    if (ch === '{') { depth++; inBrace = true; }
    else if (ch === '}') {
      depth--;
      if (inBrace && depth === 0) return source.slice(idx, i + 1) + ';';
    }
  }
  throw new Error('Unclosed function window.' + name);
}

// 1. Test M04 regex & digit helpers
const sandbox = { window: {}, Date, String, Number, Array, Set };
sandbox.window = sandbox;
vm.runInNewContext(
  extractWindowFn(appJs, 'dfSanitizePreservingJoiners') + '\n' +
  extractWindowFn(appJs, 'dfValidateWesternNumeralsOnly'),
  sandbox
);

const joined = sandbox.dfSanitizePreservingJoiners('  می\u200Cخواهم\u0007  ');
assert(joined.includes('\u200C'), 'Must preserve ZWNJ');
assert(!joined.includes('\u0007'), 'Must strip control chars');
assert.strictEqual(sandbox.dfValidateWesternNumeralsOnly('0123456789').hasNonWesternDigits, false);
assert.strictEqual(sandbox.dfValidateWesternNumeralsOnly('١٢٣').hasNonWesternDigits, true);
assert.strictEqual(sandbox.dfValidateWesternNumeralsOnly('۱۲۳').hasNonWesternDigits, true);

// 2. Test M09 XSS sanitizer
const secEnd = appJs.indexOf('})();', appJs.indexOf('__DF_SECURITY_AND_SCHEMA_READY__'));
const secStart = appJs.lastIndexOf('(function()', secEnd);
vm.runInNewContext(appJs.slice(secStart, secEnd + 5), sandbox);
assert(!sandbox.dfEscapeHtml('<script>1</script>').includes('<script>'));
const cleanHtml = sandbox.dfSanitizeHtmlFragment('<p onclick="x()">Hi</p><script>bad()</script><a href="javascript:alert(1)">a</a>');
assert(!/script|onclick|javascript:/i.test(cleanHtml), 'XSS fragment leaked: ' + cleanHtml);

// 3. Test M23 forbidden-language runtime guard
const langEnd = appJs.indexOf('})();', appJs.indexOf('__DF_LANG_AND_VISIBILITY_GUARD_READY__'));
const langStart = appJs.lastIndexOf('(function()', langEnd);
vm.runInNewContext(appJs.slice(langStart, langEnd + 5), sandbox);
for (const bad of ['he', 'iw', 'syc', 'ber', 'zgh', 'he-IL']) {
  assert.strictEqual(sandbox.dfAssertAllowedLanguage(bad), 'en', 'Forbidden lang allowed: ' + bad);
}
assert.strictEqual(sandbox.dfAssertAllowedLanguage('ar'), 'ar');
assert.strictEqual(sandbox.dfAssertAllowedLanguage('de'), 'de');

// 4. Test M01/M03/M05/M06 structural guarantees
assert(!/const\s+audio\s*=\s*null\s*\/\*\s*procedural dsp enforced/.test(appJs), 'Null audio crash present');
assert(!/window\.dfGetMilestoneVersion\w*AuditSeal/.test(appJs), 'Fake AuditSeal present');
assert(!/console\.log\s*=\s*function/.test(appJs), 'console.log hijack present');

// 5. Test M41-M44 Android hardening guarantees
assert(buildGradle.includes('minifyEnabled true'), 'minifyEnabled must be true');
assert(buildGradle.includes('shrinkResources true'), 'shrinkResources must be true');
assert(!buildGradle.includes('"zenfocus2026"'), 'Hardcoded keystore password present');
assert(mainJava.includes('OnBackPressedCallback'), 'OnBackPressedCallback missing');
assert(!mainJava.includes('public void onBackPressed()'), 'Deprecated onBackPressed still present');
assert(mainJava.includes('protected void onPause()') && mainJava.includes('onTrimMemory'), 'Lifecycle hooks missing');


// 6. Test M33/M34/M47 audio & manifest guarantees
const soundsMatch = appJs.match(/const\s+SOUNDS_DATA\s*=\s*\[[\s\S]*?\];/);
assert(soundsMatch && !soundsMatch[0].includes('procedural_synth'), 'SOUNDS_DATA must not use procedural_synth');
const manifestXml = fs.readFileSync(path.join(repoRoot, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
assert(!manifestXml.includes('screenOrientation="portrait"'), 'Portrait lock must be removed');


// 7. Test M29 zero 1000-locale bloat regression
const bloatLocales = (appJs.match(/window\.DF_I18N_LOCALES\[['"][a-zA-Z0-9_-]+['"]\]\s*=/g) || []).length;
assert(bloatLocales < 10, 'Unexpected DF_I18N_LOCALES bloat count: ' + bloatLocales);


// 8. Test Safe Storage & Binaural Synth removal
assert(appJs.includes('__DF_SAFE_STORAGE_READY__'), 'dfSafeStorage missing');
assert(!/function\s+dfSynthesizeBinauralBeats\s*\([^)]+\)\s*\{[\s\S]{30,}/.test(appJs), 'Binaural synth still active');


// 9. Test F1 zero global function collisions between app.js and notes_studio.js
for (const fnName of ['filterNotesByTag', 'renderNotesStack', 'openNoteModal', 'fillNoteTpl', 'saveNewNote']) {
  const re = new RegExp('^function\\s+' + fnName + '\\b', 'm');
  assert(!re.test(appJs), 'Shadowed collision still in app.js: ' + fnName);
}


// 10. Test F2 zero createOscillator() synthesis calls across audio files
assert(!/\.createOscillator\s*\(/.test(appJs), 'app.js still calls createOscillator()');
for (const rel of ['modules/audio/spatial_acoustic_studio.js', 'modules/core/web_audio_singleton_engine.js']) {
  const modSrc = fs.readFileSync(path.join(repoRoot, 'android/app/src/main/assets/web', rel), 'utf8');
  assert(!/\.createOscillator\s*\(/.test(modSrc), rel + ' still calls createOscillator()');
}


// 11. Test F3 MutationObserver 120Hz coalescing shield
assert(appJs.includes('__DF_MUTATION_SHIELD__'), 'MutationObserver coalescing shield missing');


// 12. Test Audit Remediation: Universal Unicode Nd digits (including Adlam & NKo) + kab/yi forbidden + Atomic v21 Storage
const auditEnd = appJs.indexOf('})();', appJs.indexOf('__DF_AUDIT_REMEDIATION_V663__'));
const auditStart = appJs.lastIndexOf('(function()', auditEnd);
vm.runInNewContext(appJs.slice(auditStart, auditEnd + 5), sandbox);

// Adlam digits 𞥑𞥒𞥓 (U+1E951..U+1E953) & Arabic-Indic ١٢٣ & NKo ߁߂߃
assert.strictEqual(sandbox.dfNormalizeAllUnicodeDigits('𞥑𞥒𞥓-١٢٣-߁߂߃'), '123-123-123', 'Unicode Nd normalization failed');
assert.strictEqual(sandbox.dfValidateWesternNumeralsOnly('𞥑𞥒').hasNonWesternDigits, true, 'Adlam digits must be flagged before normalization');
for (const forbidden of ['he', 'iw', 'syc', 'ber', 'zgh', 'kab', 'yi']) {
  assert.strictEqual(sandbox.dfAssertAllowedLanguage(forbidden), 'en', 'Forbidden language leaked: ' + forbidden);
  assert.strictEqual(sandbox.dfIsForbiddenLanguage(forbidden), true, 'dfIsForbiddenLanguage missed: ' + forbidden);
}
assert.strictEqual(sandbox.dfGetLanguageDirection('ar'), 'rtl');
assert.strictEqual(sandbox.dfGetLanguageDirection('de'), 'ltr');


// 13. Java brace balance check across all Android Java sources (prevents MainActivity.java:569 error)
function verifyJavaBraceBalance(src, fileLabel) {
  let depth = 0, inStr = false, inChr = false, inSL = false, inML = false, esc = false;
  let openedClass = false, classCloseIdx = -1;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i], nxt = src[i + 1] || '';
    if (inSL) { if (ch === '\n') inSL = false; continue; }
    if (inML) { if (ch === '*' && nxt === '/') { inML = false; i++; } continue; }
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (inChr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === "'") inChr = false; continue; }
    if (ch === '/' && nxt === '/') { inSL = true; i++; continue; }
    if (ch === '/' && nxt === '*') { inML = true; i++; continue; }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "'") { inChr = true; continue; }
    if (ch === '{') { depth++; openedClass = true; }
    else if (ch === '}') {
      assert(depth > 0, 'Extra closing brace outside class in ' + fileLabel + ' at index ' + i);
      depth--;
      if (openedClass && depth === 0 && classCloseIdx === -1) classCloseIdx = i;
    }
  }
  assert.strictEqual(depth, 0, 'Unclosed brace in ' + fileLabel + ' (depth=' + depth + ')');
  assert(classCloseIdx !== -1, 'No top-level class body found in ' + fileLabel);
  const trailing = src.slice(classCloseIdx + 1).trim();
  assert.strictEqual(trailing, '', 'Stray code after top-level class closing brace in ' + fileLabel + ': ' + trailing);
}
verifyJavaBraceBalance(mainJava, 'MainActivity.java');

console.log('✅ PASS: All Major #1-#5 behavioral & Android hardening regression tests passed!');
