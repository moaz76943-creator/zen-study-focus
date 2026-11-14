'use strict';
// Builds i18n/source_en.json: the English source catalog (gettext-style: the normalized English text is the stable key).
// Inputs: runtime inventory (i18n-out/inventory_en.json), toast literals in app.js, flashcards UI English strings.
// Numbers become indexed placeholders {0},{1}; user/sample content containers are excluded.
const fs = require('fs'), path = require('path');
const web = path.resolve(__dirname, '../../android/app/src/main/assets/web');
const EXCLUDE_WHERE = new Set(['notesStackBox', 'calendarDayAgendaBox', 'dfSpanChunksHost', 'dfVisualGuideLinesHost', 'dfCompCheckHost', 'dfRsvpWordStage', 'dfSvgFormulaStage', 'dfBidirConceptPills', 'langListScrollBox', 'currentLangIso', 'currentLangLabel', 'hdrMainTitle', 'tasksListBox', 'dfStemContentPane']);
const KEEP_IN_STEM = /Insert|Preset|Create|Preview/;
function norm(t) { let i = 0; return t.replace(/\s+/g, ' ').trim().replace(/\d+(?:[.,:]\d+)*/g, () => '{' + (i++) + '}'); }
const letters = (t) => (t.replace(/\{\d+\}/g, '').match(/\p{L}/gu) || []).length;
const cat = new Map();
function add(text, ctx, kind) {
  const k = norm(text); if (letters(k) < 2) return; if (/[\u0590-\u08FF]/.test(k)) return; // source must be English if (/^Deep Focus$/.test(k)) return;
  if (!cat.has(k)) cat.set(k, { contexts: new Set(), kinds: new Set() });
  cat.get(k).contexts.add(ctx); cat.get(k).kinds.add(kind);
}
const inv = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../i18n/inventory_en.json'), 'utf8'));
for (const x of inv) {
  if (EXCLUDE_WHERE.has(x.where) && !(x.where === 'dfStemContentPane' && KEEP_IN_STEM.test(x.text))) continue;
  add(x.text, x.screens.join(',') + (x.where ? '#' + x.where : ''), x.kind);
}
const app = fs.readFileSync(path.join(web, 'app.js'), 'utf8');
for (const m of app.matchAll(/showToast\((['"`])((?:(?!\1)[^\\$]|\\.)*)\1\)/g)) add(m[2].replace(/\\'/g, "'"), 'toast', 'toast');
const ui = fs.readFileSync(path.join(web, 'modules/flashcards/flashcards_ui.js'), 'utf8');
const en = ui.match(/\n    en: \{([\s\S]*?)\n    \},/)[1];
for (const m of en.matchAll(/([A-Za-z_][A-Za-z0-9_]*): '((?:[^'\\]|\\.)*)'/g)) if (m[2]) add(m[2].replace(/\\'/g, "'"), 'flashcards:' + m[1], 'flashcards');
// Analytics Studio builds labels in JS (select options, composite lines, aria). Include its English table so the
// shared catalog covers what the reviewed DF99 analytics dictionaries leave in English.
const an = fs.readFileSync(path.join(web, 'analytics_studio.js'), 'utf8');
const anEn = an.match(/const EN=Object\.freeze\(\{([\s\S]*?)\}\);/)[1];
for (const m of anEn.matchAll(/([A-Za-z_][A-Za-z0-9_]*):'((?:[^'\\]|\\.)*)'/g)) if (m[2]) add(m[2].replace(/\\'/g, "'"), 'analytics:' + m[1], 'analytics');
for (const d of ['Study', 'Reading', 'Work', 'Sport']) add(d, 'analytics:domain', 'analytics');
const out = {}; [...cat.keys()].sort().forEach((k) => { const v = cat.get(k); out[k] = { ctx: [...v.contexts].slice(0, 4).join(' | '), kind: [...v.kinds].join(',') }; });
fs.writeFileSync(path.resolve(__dirname, '../../i18n/source_en.json'), JSON.stringify(out, null, 1) + '\n');
console.log('source strings:', Object.keys(out).length, 'chars:', Object.keys(out).join('').length);
