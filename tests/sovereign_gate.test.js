'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const WEB_DIR = path.join(ROOT, 'android/app/src/main/assets/web');
const APP_JS = path.join(WEB_DIR, 'app.js');
const INDEX_HTML = path.join(WEB_DIR, 'index.html');
const FSRS_JS = path.join(WEB_DIR, 'modules/flashcards/fsrs.js');

// Task 1: FSRS-4.5 17-weight math kernel & app.js integration
const fsrs = require(FSRS_JS);
assert(Array.isArray(fsrs.W) && fsrs.W.length === 17, 'FSRS-4.5 must define 17 weights');
const reviewed = fsrs.reviewCard({ s: 1.2, d: 5.0, reps: 1 }, 3, 2);
assert(reviewed.s > 1.2 && reviewed.ivl >= 1 && reviewed.reps === 2, 'FSRS-4.5 reviewCard must compute stability and interval');

const appSrc = fs.readFileSync(APP_JS, 'utf8');
const htmlSrc = fs.readFileSync(INDEX_HTML, 'utf8');

assert(htmlSrc.includes('<script src="modules/flashcards/fsrs.js"></script>'), 'index.html must load modules/flashcards/fsrs.js');
assert(appSrc.includes('dfGetFsrs45Kernel') && appSrc.includes('dfReviewFlashcardFsrs45'), 'app.js must wire FSRS-4.5 kernel to flashcard reviews');

// Task 2: Safe DOM XSS Elimination (dfSafeRenderTasks & dfSafeRenderNotes with textContent)
assert(appSrc.includes('function dfSafeRenderTasks(cId,tasks)'), 'app.js must define dfSafeRenderTasks');
assert(appSrc.includes('function dfSafeRenderNotes(cId,notes)'), 'app.js must define dfSafeRenderNotes');
assert(!/function renderTasksList\(\)[\s\S]*?card\.innerHTML\s*=/.test(appSrc.slice(0, 15000)), 'renderTasksList must not use card.innerHTML');
assert(!/function renderNotesStack\(\)[\s\S]*?card\.innerHTML\s*=/.test(appSrc.slice(0, 15000)), 'renderNotesStack must not use card.innerHTML');

// Task 3: Mount Elements in index.html & dfInitSovereignUiBridge
assert(htmlSrc.includes('id="dfVaultMount"'), 'index.html must contain dfVaultMount');
assert(htmlSrc.includes('id="dfStreakMount"'), 'index.html must contain dfStreakMount');
assert(htmlSrc.includes('id="dfBreakPacingMount"'), 'index.html must contain dfBreakPacingMount');
assert(appSrc.includes('function dfRenderVaultSafDom(cid)'), 'app.js must define dfRenderVaultSafDom');
assert(appSrc.includes('function dfInitSovereignUiBridge()'), 'app.js must define dfInitSovereignUiBridge');
assert(appSrc.includes("addEventListener('DOMContentLoaded',\ndfInitSovereignUiBridge)"), 'dfInitSovereignUiBridge must bind to DOMContentLoaded');

// Task 4: Syntax Verification across all JS files
function collectJsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectJsFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

for (const file of collectJsFiles(WEB_DIR)) {
  const code = fs.readFileSync(file, 'utf8');
  new vm.Script(code, { filename: file });
}

console.log('SOVEREIGN_GATE_PASS');
