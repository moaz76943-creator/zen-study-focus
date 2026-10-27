'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..', '..');
const WEB = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'web');
const STYLE_PATH = path.join(WEB, 'css', 'focus_lab.css');
const FOCUS_LAB_PATH = path.join(WEB, 'focus_lab.html');

/* ---------- tiny offline CSS parsing helpers (no fixtures, real asset) ---------- */

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/** Brace-aware scan pairing every '{' with its '}'. Returns one record per rule. */
function scanRules(css) {
  const finalized = [];
  const stack = [];
  let previousBoundary = 0;
  for (let i = 0; i < css.length; i += 1) {
    if (css[i] === '{') {
      stack.push({
        selector: css.slice(previousBoundary, i).trim(),
        braceStart: i
      });
      previousBoundary = i + 1;
    } else if (css[i] === '}') {
      const pending = stack.pop();
      assert.ok(pending !== undefined, 'stylesheet braces must be balanced');
      pending.body = css.slice(pending.braceStart + 1, i).trim();
      finalized.push(pending);
      previousBoundary = i + 1;
    }
  }
  assert.equal(stack.length, 0, 'stylesheet braces must be balanced');
  return finalized.filter((rule) => rule.selector && rule.selector.length > 0);
}

function listMediaBlocks(css) {
  return scanRules(css)
    .filter((rule) => rule.selector.startsWith('@media'))
    .map((rule) => ({ condition: rule.selector, body: rule.body }));
}

function declarations(body) {
  const found = [];
  const pattern = /([-\w]+)\s*:\s*([^;{}]+);/g;
  let match;
  while ((match = pattern.exec(body)) !== null) {
    found.push({ property: match[1], value: match[2].trim() });
  }
  return found;
}

const SOURCE = fs.readFileSync(STYLE_PATH, 'utf8');
const FLAT = stripComments(SOURCE);
const RULES = scanRules(FLAT);
/** Every declaration in the stylesheet, media blocks included. */
const ALL_DECLARATIONS = RULES.flatMap((rule) => declarations(rule.body));
const MEDIA = listMediaBlocks(FLAT);

test('the focus lab stylesheet exists at the exact required asset path', () => {
  assert.equal(fs.existsSync(STYLE_PATH), true, `${STYLE_PATH} must exist`);
  assert.ok(SOURCE.trim().length > 200, 'stylesheet has substantive rules');
  assert.ok(SOURCE.includes('offline'), 'stylesheet documents its offline contract');
});

test('stylesheet parses cleanly and is organised for responsive bands', () => {
  assert.ok(RULES.length > 20, 'substantive rule coverage');
  assert.ok(MEDIA.length >= 5, `multiple responsive blocks (got ${MEDIA.length})`);
});

test('stylesheet is fully offline: no imports, no remote fonts, no network URLs', () => {
  assert.equal(/@import/i.test(FLAT), false, 'no @import anywhere');
  assert.equal(/@font-face/i.test(FLAT), false, 'no downloaded fonts');
  assert.equal(/https?:\/\//i.test(FLAT), false, 'no absolute network URLs');
  assert.equal(/fonts\.(googleapis|gstatic)/i.test(FLAT), false,
    'no third-party font hosts');
  const families = ALL_DECLARATIONS.filter((d) => d.property === 'font-family');
  assert.ok(families.length >= 1, 'font-family is declared');
  for (const family of families) {
    const resolvesLocally =
      /system-ui|Roboto|Noto Sans/.test(family.value) ||
      /var\(--(focuslab|df22)-font/.test(family.value);
    assert.ok(resolvesLocally,
      `font stack "${family.value}" resolves from device system fonts only`);
  }
});

test('white premium identity: white surfaces with df22 token fallbacks', () => {
  assert.ok(/#ffffff/i.test(FLAT), 'explicit white surface present');
  assert.ok(/var\(--df22-\w+/.test(SOURCE), 'reuses design_tokens_v22.css variables');
  assert.ok(/--focuslab-surface/.test(SOURCE), 'local token alias defined');
});

test('responsive coverage for the 320, 360, 393 and 430 width bands', () => {
  const conditions = MEDIA.map((block) => block.condition);
  assert.ok(conditions.some((q) => /max-width:\s*320px/.test(q)),
    `a media query targets 320px; got: ${conditions.join(' | ')}`);
  assert.ok(conditions.some((q) => /max-width:\s*360px/.test(q)),
    'a media query targets 360px');
  assert.ok(conditions.some((q) => /min-width:\s*361px/.test(q) && /max-width:\s*393px/.test(q)),
    'a media query covers the 393px band');
  assert.ok(conditions.some((q) => /min-width:\s*361px/.test(q) && /max-width:\s*430px/.test(q)),
    'a media query covers the 430px band');
  const wide = conditions.find((q) => /min-width:\s*431px/.test(q));
  assert.ok(wide, 'wider-than-430px band keeps content composed');
});

test('flex rows shrink instead of causing horizontal overflow', () => {
  assert.ok(
    ALL_DECLARATIONS.some((d) => d.property === 'min-width' && d.value === '0'),
    'flex children declare min-width: 0'
  );
  assert.ok(
    ALL_DECLARATIONS.some((d) => d.property === 'flex-wrap' && d.value === 'wrap'),
    'rows wrap on narrow viewports'
  );
  assert.ok(
    ALL_DECLARATIONS.some((d) => d.property === 'max-width' && d.value === '100%'),
    'form fields cap at 100% width'
  );
  assert.equal(/overflow\s*:\s*hidden/.test(FLAT), false,
    'no fixed clipping with overflow: hidden');
});

test('RTL mirroring: logical properties plus explicit [dir="rtl"] rules', () => {
  assert.ok(/\[dir=["']rtl["']\]/.test(SOURCE), 'explicit [dir="rtl"] selectors present');
  const logicalPatterns = [
    /padding-inline-start/,
    /inset-inline-start/,
    /margin-inline/,
    /text-align:\s*start/
  ];
  for (const pattern of logicalPatterns) {
    assert.ok(pattern.test(FLAT), `logical CSS property used: ${pattern}`);
  }
  assert.equal(/text-align:\s*(left|right)\s*[;]/.test(FLAT), false,
    'no hard-coded left/right text alignment');
});

test('keyboard support: :focus-visible ring and a visible skip link on focus', () => {
  const focusVisibleRules = RULES.filter((rule) => /:focus-visible/.test(rule.selector));
  assert.ok(focusVisibleRules.length >= 1, ':focus-visible selector present');
  assert.ok(
    focusVisibleRules.some((rule) =>
      declarations(rule.body).some((d) => d.property.startsWith('outline'))
    ),
    'focus-visible rule draws an outline ring'
  );
  const skipFocusRules = RULES.filter(
    (rule) => /focus-lab-skip/.test(rule.selector) && /:focus/.test(rule.selector)
  );
  assert.ok(skipFocusRules.length >= 1, 'skip link exposes a focus rule');
  assert.ok(
    skipFocusRules.some((rule) =>
      declarations(rule.body).some((d) => /inset-inline-start|left|top/.test(d.property))
    ),
    'skip link becomes visible on focus'
  );
});

test('keyboard avoidance: dynamic viewport units reflow under the IME', () => {
  assert.ok(/min-height:\s*100dvh/.test(FLAT),
    'body uses 100dvh so content reflows when the keyboard opens');
  assert.ok(/min-height:\s*100vh/.test(FLAT),
    '100vh fallback for engines without dvh support');
  assert.ok(/safe-area-inset-bottom/.test(FLAT),
    'safe area insets honoured near the keyboard edge');
  assert.equal(
    ALL_DECLARATIONS.some((d) => d.property === 'height' && /^100v[hd]/.test(d.value)),
    false,
    'content height never locks to the static viewport'
  );
});

test('200% font scaling: rem-based type scale, fluid clamp, unitless leading', () => {
  const fontSizes = ALL_DECLARATIONS.filter((d) => d.property === 'font-size');
  assert.ok(fontSizes.length >= 5, 'type scale is declared');
  for (const rule of fontSizes) {
    assert.equal(/\d+px/.test(rule.value), false,
      `font-size "${rule.value}" must not use px (200% zoom would be clipped)`);
    assert.ok(/(\d*\.?\d+)r?em/.test(rule.value),
      `font-size "${rule.value}" is rem-based`);
  }
  assert.ok(fontSizes.some((rule) => /clamp\(/.test(rule.value)),
    'clamp() provides fluid sizes between the narrowest and widest bands');
  const leadings = ALL_DECLARATIONS.filter((d) => d.property === 'line-height');
  assert.ok(leadings.length >= 1, 'line-height is declared');
  for (const rule of leadings) {
    assert.equal(/^\d+px/.test(rule.value), false,
      'line-height stays unitless/responsive so 200% fonts keep leading');
  }
  assert.ok(/200%/.test(SOURCE), 'stylesheet documents 200% font scaling support');
});

test('no fixed heights that could clip translated or zoomed text', () => {
  const heightRules = ALL_DECLARATIONS.filter((d) => d.property === 'height');
  assert.deepEqual(heightRules, [], 'height must never be locked (use min-height)');
  const pressable = ALL_DECLARATIONS.filter(
    (d) => d.property === 'min-height' && /(\d+(?:\.\d+)?)rem/.test(d.value)
  );
  assert.ok(
    pressable.some((d) => parseFloat(d.value) >= 2.5),
    'pressable controls keep an accessible min-height in rem'
  );
});

test('focus lab page classes are covered when the page is present in this worktree', (t) => {
  if (!fs.existsSync(FOCUS_LAB_PATH)) {
    t.skip('focus_lab.html is not present in this worktree (U01 lands separately)');
    return;
  }
  const html = fs.readFileSync(FOCUS_LAB_PATH, 'utf8');
  const classes = new Set();
  const classPattern = /class\s*=\s*"([^"]+)"/g;
  let match;
  while ((match = classPattern.exec(html)) !== null) {
    for (const token of match[1].split(/\s+/)) {
      if (token) classes.add(token);
    }
  }
  const selectorSpace = RULES.map((rule) => rule.selector).join(' ');
  for (const token of classes) {
    assert.ok(selectorSpace.includes(`.${token}`), `selectors cover the page class .${token}`);
  }
  for (const landmark of ['focus-lab-header', 'focus-lab-nav', 'focus-card', 'focus-lab-footer']) {
    assert.ok(classes.has(landmark), `page actually uses .${landmark}`);
  }
});
