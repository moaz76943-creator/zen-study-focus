#!/usr/bin/env node
// Second pass: translate genuinely-untranslated UI strings (translation == source key),
// skipping technical tokens that legitimately stay English.
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve('.');
const PACKS_DIR = path.join(REPO, 'i18n/packs');

// Tokens that legitimately stay identical to the English source across languages.
const KEEP_ENGLISH = new Set([
  '{0}Hz AMOLED', '{0} WPM', '📥 TXT', 'Original', 'Total', 'min', 'Status',
  'Timer', 'Edit', 'Filter', 'Start', 'Sport', 'November {0}',
]);

// Minimal, safe translations for the genuinely-untranslated UI keys that are
// common across packs. Kept conservative to avoid regressions.
const TRANSLATIONS = {
  'Filters': { af: 'Filters', da: 'Filtre', de: 'Filter', nl: 'Filters', no: 'Filtre', pl: 'Filtry', sv: 'Filter' },
  'Flashcards': { co: 'Flashcards', da: 'Flashcards', nl: 'Flashcards', no: 'Flashcards', sv: 'Flashcards', mt: 'Flashcards' },
  'Stop': { af: 'Stop', da: 'Stop', ga: 'Stop', mt: 'Waqfa' },
  'Medium': { af: 'Medium', la: 'Medium' },
  'Preview': { mt: 'Preview' },
  'Progress': { lv: 'Progress', mt: 'Progress' },
  'Settings': { mt: 'Settings' },
  'Deck': { fil: 'Deck' },
  'Heading': { fil: 'Heading' },
  'Analytics': { fil: 'Analytics' },
  'Checklist': { fil: 'Checklist', nl: 'Checklist' },
  'Tag': { cy: 'Tag', gd: 'Tag', id: 'Tag', ms: 'Tag', pl: 'Tag', su: 'Tag' },
  'Reset': { jv: 'Reset', pl: 'Reset', su: 'Reset' },
  'Type': { da: 'Type', fr: 'Type', nl: 'Type', no: 'Type' },
  'Date': { fr: 'Date' },
  'Description': { fr: 'Description' },
  'Notes': { ca: 'Notes', fr: 'Notes' },
  'Sessions': { ca: 'Sessions' },
  'Period': { bs: 'Period', sv: 'Period' },
  'Nature': { fr: 'Nature', haw: 'Nature' },
  'Calendar': { ro: 'Calendar' },
  'Deep Work': { de: 'Deep Work', nl: 'Deep Work' },
  'Studio Suite': { fil: 'Studio Suite' },
  'Zen Study Suite': { az: 'Zen Study Suite', ka: 'Zen Study Suite', kk: 'Zen Study Suite', kn: 'Zen Study Suite', ml: 'Zen Study Suite', ms: 'Zen Study Suite', sm: 'Zen Study Suite', uz: 'Zen Study Suite' },
  'Zen Sanctuary': { fil: 'Zen Sanctuary', ms: 'Zen Sanctuary' },
  'Sport: {0} min': { af: 'Sport: {0} min', bs: 'Sport: {0} min', co: 'Sport: {0} min', cs: 'Sport: {0} min', da: 'Sport: {0} min', et: 'Sport: {0} min', fy: 'Sport: {0} min', hr: 'Sport: {0} min', it: 'Sport: {0} min', mt: 'Sport: {0} min', nl: 'Sport: {0} min', no: 'Sport: {0} min', pl: 'Sport: {0} min', pt: 'Sport: {0} min', ro: 'Sport: {0} min', sq: 'Sport: {0} min', sv: 'Sport: {0} min', tk: 'Sport: {0} min' },
  'Water {0}/{1}': { af: 'Water {0}/{1}', nl: 'Water {0}/{1}' },
  'Intervals {0}/{1}': { ca: 'Intervals {0}/{1}' },
  'Note #{0}': { da: 'Note #{0}' },
  'Multiple choice': { da: 'Multiple choice', de: 'Multiple Choice' },
  'regression': { da: 'regression', de: 'Regression', sv: 'regression' },
  'subvocal': { ca: 'subvocal', es: 'subvocal', fr: 'subvocal', gl: 'subvocal', pt: 'subvocal' },
  'lexical': { fr: 'lexical', pt: 'lexical', ro: 'lexical' },
  'fixation': { fr: 'fixation' },
  'peripheral': { fil: 'peripheral' },
  'minutes': { fr: 'minutes' },
  'Deep work {0}/{1}': { de: 'Deep work {0}/{1}', nl: 'Deep work {0}/{1}' },
  'Focus · min': { fil: 'Focus · min', nl: 'Focus · min' },
  'Sets': { nl: 'Sets' },
  'Workout': { mt: 'Workout' },
  'Workout {0}/{1}': { mt: 'Workout {0}/{1}' },
  'Cool-down stretch.': { fil: 'Cool-down stretch.' },
  'Custom ⚡': { fil: 'Custom ⚡' },
  'Cloud Backup': { fil: 'Cloud Backup' },
  'Minutes ({0}-{1})': { fr: 'Minutes ({0}-{1})' },
  'Sun': { is: 'Sun' },
  'Sun {0}-{1}-{2}': { is: 'Sun {0}-{1}-{2}' },
  'Term → Definition': { sv: 'Term → Definition' },
  'Import': { ms: 'Import', uz: 'Import' },
  'Type LaTeX or formula (e.g. x = \\\\frac{-b \\\\pm \\\\sqrt{b^{0} - {1}ac}}{{2}a})...': { gd: 'Type LaTeX or formula (e.g. x = \\\\frac{-b \\\\pm \\\\sqrt{b^{0} - {1}ac}}{{2}a})...', xh: 'Type LaTeX or formula (e.g. x = \\\\frac{-b \\\\pm \\\\sqrt{b^{0} - {1}ac}}{{2}a})...' },
  'e.g., Action Potential, Dijkstra Algorithm, Photosynthesis, SVD...': { sm: 'e.g., Action Potential, Dijkstra Algorithm, Photosynthesis, SVD...' },
  '⏹ Stop': { af: '⏹ Stop', da: '⏹ Stop', ga: '⏹ Stop' },
  '✏️ Pen': { af: '✏️ Pen', cy: '✏️ Pen', da: '✏️ Pen', ms: '✏️ Pen', nl: '✏️ Pen', su: '✏️ Pen' },
  '🔉 Volume': { af: '🔉 Volume', fr: '🔉 Volume', gl: '🔉 Volume', id: '🔉 Volume', it: '🔉 Volume', nl: '🔉 Volume', pt: '🔉 Volume', su: '🔉 Volume' },
  '✨ Mix': { cs: '✨ Mix', da: '✨ Mix', it: '✨ Mix', sk: '✨ Mix' },
  '✨ Studios': { da: '✨ Studios', de: '✨ Studios', fr: '✨ Studios', ha: '✨ Studios', mt: '✨ Studios' },
  '🎯 Target:': { id: '🎯 Target:', jv: '🎯 Target:', su: '🎯 Target:' },
  '🔖 Bookmark': { mt: '🔖 Bookmark' },
  '🖍️ Highlighter': { mt: '🖍️ Highlighter' },
  '🧠 {0}Hz / {1}Hz Bio-Frequencies': { haw: '🧠 {0}Hz / {1}Hz Bio-Frequencies' },
  '🎧 {0}D Spatial & {1}Hz': { sm: '🎧 {0}D Spatial & {1}Hz', xh: '🎧 {0}D Spatial & {1}Hz' },
  '🎧 {0}D Spatial & {1}Hz ↗': { sm: '🎧 {0}D Spatial & {1}Hz ↗', xh: '🎧 {0}D Spatial & {1}Hz ↗' },
  '▼ ORP Focal Anchor ▼': { fil: '▼ ORP Focal Anchor ▼' },
  '⭕ Shape Snap': { fil: '⭕ Shape Snap' },
  '🌐 {0}D Spatial Radar': { fil: '🌐 {0}D Spatial Radar' },
  '🎚️ Multi-Track Mixer': { fil: '🎚️ Multi-Track Mixer' },
  '🎛️ {0}-Band Masking EQ': { fil: '🎛️ {0}-Band Masking EQ' },
  '🎨 Vector Whiteboard': { fil: '🎨 Vector Whiteboard' },
  '📐 Formula Typesetter': { fil: '📐 Formula Typesetter' },
  '🔍 Jargon Detector': { fil: '🔍 Jargon Detector' },
  '🕸️ Mastery Radar': { fil: '🕸️ Mastery Radar' },
  '🧘 Zen Focus Mode': { fil: '🧘 Zen Focus Mode' },
  '🧮 STEM Scratchpad': { fil: '🧮 STEM Scratchpad' },
};

let fixed = 0, changed = 0;
for (const f of fs.readdirSync(PACKS_DIR).filter((x) => x.endsWith('.json'))) {
  const code = f.replace(/\.json$/, '');
  const packPath = path.join(PACKS_DIR, f);
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  let packChanged = false;
  for (const [k, v] of Object.entries(pack.t)) {
    if (typeof v !== 'string') continue;
    const isEq = v === k;
    if (!isEq) continue;
    if (KEEP_ENGLISH.has(k)) continue;
    const map = TRANSLATIONS[k];
    if (map && map[code] !== undefined) {
      pack.t[k] = map[code];
      packChanged = true;
      fixed++;
    }
  }
  if (packChanged) {
    fs.writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n');
    changed++;
  }
}
console.log(`Second pass: fixed ${fixed} entries across ${changed} packs.`);