'use strict';
/* 07-06: source-level RED/GREEN for 320px + large-text bottom navigation.
 * Device viewport, actual touch geometry and TalkBack remain separate gates.
 */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../android/app/src/main/assets/web');
const css = () => fs.readFileSync(path.join(root, 'design_recovery/white_premium_recovery10.css'), 'utf8');
const html = () => fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('premium mobile nav uses legible labels at default and 200% root font size', () => {
  const source = css();
  assert.match(source, /font-size:\s*clamp\(\.7rem,\s*2\.15vw,\s*\.85rem\)/);
  const mobile = source.match(/@media\s*\(max-width:\s*340px\)\s*\{([\s\S]*?)\n\}\s*@media/);
  assert.ok(mobile, 'narrow viewport override exists');
  assert.match(mobile[1], /font-size:\s*\.7rem/);
  assert.doesNotMatch(mobile[1], /font-size:\s*\.(?:[0-6])\d*rem/);
});

test('premium mobile footer reserves growing space for large navigation labels', () => {
  const source = css();
  assert.match(source, /padding-bottom:\s*calc\(max\(95px,\s*7rem\)\s*\+\s*env\(safe-area-inset-bottom,\s*0px\)\)/);
  assert.match(source, /overflow-x:\s*auto/);
  assert.match(source, /min-width:\s*44px/);
});

test('original seven destinations and real focus timer remain; no Meditation destination', () => {
  const page = html();
  for (const id of ['navTasks','navCalendar','navNotes','navTimer','navTraining','navSounds','navAnalytics','focusHeroCard','mainPlayBtn']) {
    assert.ok(page.includes('id="' + id + '"'), id);
  }
  assert.doesNotMatch(page, /id=["']navMeditation["']/);
  assert.match(css(), /#navTimer[\s\S]*?grid-column:\s*4/);
  assert.match(css(), /#navTraining[\s\S]*?grid-column:\s*5/);
});
