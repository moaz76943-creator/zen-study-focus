'use strict';
// i18n/packs/<code>.json (reviewable source of truth) -> android/.../locales/ui/<code>.js (runtime, lazy-loaded).
// Refuses to build a pack that fails structural validation (placeholders, empty, Hebrew, non-Western digits, unknown keys).
const fs = require('fs'), path = require('path');
const repo = path.resolve(__dirname, '../..');
const src = JSON.parse(fs.readFileSync(path.join(repo, 'i18n/source_en.json'), 'utf8'));
const reg = JSON.parse(fs.readFileSync(path.join(repo, 'i18n/languages.json'), 'utf8'));
const official = new Set(reg.languages.map((l) => l.code));
const outDir = path.join(repo, 'android/app/src/main/assets/web/locales/ui');
const STATUSES = ['source', 'human-reviewed', 'native-speaker-reviewed', 'expert-reviewed', 'ai-pending-review', 'machine-unverified'];
const ph = (s) => (s.match(/\{\d+\}/g) || []).sort().join(',');
function validate(code, pack) {
  const errs = [];
  if (!official.has(code) || code === 'en') errs.push('not an official non-English language');
  if (/^(he|iw|yi)$/.test(code)) errs.push('forbidden language');
  if (!STATUSES.includes(pack.status)) errs.push('bad status ' + pack.status);
  for (const [k, v] of Object.entries(pack.t || {})) {
    if (!(k in src)) { errs.push('unknown key: ' + k.slice(0, 60)); continue; }
    if (typeof v !== 'string' || !v.trim()) errs.push('empty: ' + k.slice(0, 60));
    else {
      if (ph(k) !== ph(v)) errs.push('placeholder mismatch: ' + k.slice(0, 60));
      if (/[֐-׿]/.test(v)) errs.push('Hebrew script: ' + k.slice(0, 60));
      if (/[٠-٩۰-۹०-९০-৯૦-૯௦-௯౦-౯೦-೯൦-൯๐-๙໐-໙၀-၉០-៩༠-༩]/.test(v)) errs.push('non-Western digits: ' + k.slice(0, 60));
    }
  }
  return errs;
}
let bad = 0; const built = [];
const files = fs.existsSync(path.join(repo, 'i18n/packs')) ? fs.readdirSync(path.join(repo, 'i18n/packs')).filter((f) => f.endsWith('.json')) : [];
for (const f of files) {
  const code = f.replace(/\.json$/, ''); const pack = JSON.parse(fs.readFileSync(path.join(repo, 'i18n/packs', f), 'utf8'));
  const errs = validate(code, pack);
  if (errs.length) { bad++; console.error(code, errs.slice(0, 10)); continue; }
  const body = '/* generated from i18n/packs/' + f + ' by tools/i18n/build_packs.cjs — edit the JSON, not this file */\n(window.DF_UI_PACKS = window.DF_UI_PACKS || {})[' + JSON.stringify(code) + '] = ' + JSON.stringify({ status: pack.status, t: pack.t }) + ';\n';
  fs.writeFileSync(path.join(outDir, code + '.js'), body); built.push(code);
}
if (require.main === module) { console.log('built', built.length, 'packs', bad ? '; INVALID: ' + bad : ''); process.exit(bad ? 1 : 0); }
module.exports = { validate };
