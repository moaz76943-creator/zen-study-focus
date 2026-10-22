'use strict';
/* Track 14: source regression. Browser geometry is checked separately. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const web = path.resolve(__dirname, '../../android/app/src/main/assets/web');
const css = fs.readFileSync(path.join(web,'design_recovery/white_premium_recovery10.css'),'utf8');
const html = fs.readFileSync(path.join(web,'index.html'),'utf8');

test('200% scale timer text stays responsive inside the original ring', () => {
  assert.match(css, /#focusHeroCard\s+\.ring-time\s*\{[^}]*font-size:\s*clamp\(1\.55rem,\s*12vw,\s*3\.25rem\)/s);
  assert.match(css, /#focusHeroCard\s+\.ring-time\s*\{[^}]*white-space:\s*nowrap/s);
});
test('duration adjustment buttons wrap and stay touch-sized in long translations', () => {
  assert.match(css, /#focusHeroCard\s+\.time-delta-row\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(css, /#focusHeroCard\s+\.delta-chip\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /#focusHeroCard\s+\.delta-chip\s*\{[^}]*white-space:\s*normal/s);
});
test('keeps all seven actual destinations and v21 focus action, never Meditation', () => {
  for(const id of ['navTasks','navCalendar','navNotes','navTimer','navTraining','navSounds','navAnalytics','focusHeroCard','mainPlayBtn']){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.doesNotMatch(html,/id=["']navMeditation["']/);
  assert.match(css,/#navTimer\s*\{[^}]*grid-column:\s*4/s);
  assert.match(css,/#navTraining\s*\{[^}]*grid-column:\s*5/s);
});

test('narrow phone navigation keeps all seven original accessible label spans',()=>{
  assert.ok(css.includes('.bnav-btn :is(span[data-i18n],#navTrainingText)'));
  assert.ok(css.includes('.bnav-btn:is(.active,:focus-visible) :is(span[data-i18n],#navTrainingText)'));
  assert.match(css,/position:\s*static\s*!important/);
  assert.doesNotMatch(css,/:is\(span\[data-i18n\],#navTrainingText\)\s*\{[^}]*display:\s*none/s);
});

test('large-text timer presets remain one-line and horizontally reachable', () => {
  assert.match(css, /#focusHeroCard\s+\.segmented-pills-bar\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /#focusHeroCard\s+\.segmented-pills-bar\s+\.seg-pill\s*\{[^}]*flex:\s*0\s+0\s+auto/s);
  assert.match(css, /\.lang-switcher-pill\s+\.lang-iso-badge\s*\{[^}]*flex-shrink:\s*0/s);
});
