'use strict';

/**
 * Deep Focus Room6 task Q05 — aria_touch_probe.cjs
 *
 * Read-only offline audit of the Focus Lab standalone page contract:
 *   1. Button accessible names — every declared <button> must resolve a name
 *      from textContent, aria-label, aria-labelledby, <label for>, title or
 *      value; no name is ever taken from untrusted innerHTML.
 *   2. Touch targets — the task-mandated expectation is a 44 CSS px minimum
 *      touch-target height for button rules (2.75rem at 1rem = 16px).
 *   3. Focus order — no positive tabindex, :focus-visible declared, native
 *      focusables inventoried in DOM order.
 *   4. 200% zoom friendliness — rem/percent relative text sizing, no
 *      fixed-height overflow-clipped blocks, no fixed px control font sizes.
 *
 * Claim kinds kept strictly apart on purpose:
 *   status 'source_tested' — a fact demonstrably declared by the checked-out
 *     source files; the probe asserts nothing beyond that.
 *   status 'not_testable_here' — a check that needs Focus Lab source files,
 *     when those files are absent from this worktree.
 *   'runtime' section — every item is explicitly NOT_TESTED: real assistive
 *     tech announcements, rendered target sizes, live keyboard traversal,
 *     rendered 200% zoom reflow and device touch/hover events can only be
 *     observed in a running WebView/browser, never by a static file probe.
 *
 * The tool never mutates files, never calls eval(), never runs app code,
 * never reaches the network and never upgrades a source/test fact into a
 * runtime pass.
 */

const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_VERSION = 1;
const TOOL_NAME = 'aria_touch_probe';
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_FOCUS_LAB_HTML = 'android/app/src/main/assets/web/focus_lab.html';
const DEFAULT_FOCUS_LAB_CSS = 'android/app/src/main/assets/web/css/focus_lab.css';
const DEFAULT_ROOM6_JS_DIR = 'android/app/src/main/assets/web/js/room6';

// Task-mandated expectation: button touch targets are audited against an
// explicit 44 CSS px minimum height (44pt/OS-HIG-class controls).
const MIN_TOUCH_TARGET_PX = 44;
// Reference base for rem conversions when the audit cannot find a declared
// html/:root font-size; this mirrors the mobile UA default base of 16 px.
const DEFAULT_ROOT_FONT_SIZE_PX = 16;

const RUNTIME_NOT_TESTED = [
  {
    topic: 'screen_reader_accessible_names',
    reason: 'Announced names depend on installed assistive technology and the running WebView; a static source read cannot observe announcements, so runtime is NOT_TESTED.'
  },
  {
    topic: 'rendered_touch_target_size',
    reason: 'The 44 CSS px minimum is a source-level expectation; actual rendered target boxes require a layout engine to measure, so runtime is NOT_TESTED.'
  },
  {
    topic: 'keyboard_focus_order',
    reason: 'Live Tab/Shift+Tab traversal order and visible focus movement require a running browser or WebView, so runtime is NOT_TESTED.'
  },
  {
    topic: 'zoom_200_percent_reflow',
    reason: 'Rendering the page at 200% zoom to observe text scaling, wrapping and target overlap requires a rendering engine, so runtime is NOT_TESTED.'
  },
  {
    topic: 'pointer_touch_and_hover_interaction',
    reason: 'Device touch/hover/press feedback can only be exercised on a real mobile viewport, so runtime is NOT_TESTED.'
  },
  {
    topic: 'responsive_width_breakpoints',
    reason: 'The 320/360/393/430 CSS width layout claims can only be rendered in a browser matrix, so runtime is NOT_TESTED.'
  }
].map((item) => ({ status: 'NOT_TESTED', ...item }));

// ---------------------------------------------------------------------------
// Shared text helpers
// ---------------------------------------------------------------------------

function lineAt(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index && cursor < text.length; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

function toSourcePath(root, file) {
  const absolute = path.resolve(root, file);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return absolute.split(path.sep).join('/');
  }
  return relative.split(path.sep).join('/');
}

function readSource(root, file, role) {
  const absolute = path.resolve(root, file);
  let text = '';
  let exists = false;
  try {
    text = fs.readFileSync(absolute, 'utf8');
    exists = true;
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'EISDIR' && error.code !== 'ENOTDIR') throw error;
  }
  return {
    role,
    path: toSourcePath(root, file),
    absolutePath: absolute,
    exists,
    byteCount: exists ? Buffer.byteLength(text, 'utf8') : 0,
    lineCount: exists ? text.split('\n').length : 0,
    text
  };
}

function attributeValue(attributes, name) {
  const pattern = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s">\' ]+))', 'i');
  const match = attributes.match(pattern);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? '';
}

const NAMED_ENTITIES = {
  '&': '&',
  '<': '<',
  '>': '>',
  '"': '"',
  '&#39;': "'",
  '&nbsp;': ' '
};

function decodeMarkupText(text) {
  return text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => NAMED_ENTITIES[entity] ?? entity);
}

function normalizeWhitespace(text) {
  return decodeMarkupText(text).replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// HTML scanning (regex tokenizer; no DOM, no eval, read-only)
// ---------------------------------------------------------------------------

/**
 * Splits raw HTML into markup (without <script>/<style> bodies) plus the
 * separated script/style channels, so button scans can never pick JS strings
 * as button text and any inline <style> is still audited as CSS.
 */
function splitHtmlChannels(html) {
  const scriptBlocks = [];
  const styleBlocks = [];
  const markup = html.replace(
    /<(script|style)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (whole, tag, body, offset) => {
      const channel = { body, line: lineAt(html, offset) };
      (tag.toLowerCase() === 'script' ? scriptBlocks : styleBlocks).push(channel);
      return '\n'.repeat(whole.split('\n').length - 1);
    }
  );
  return { markup, scriptBlocks, styleBlocks };
}

function collectPairedElements(markup, tags) {
  const elements = [];
  const pattern = new RegExp('<(' + tags.join('|') + ')\\b([^>]*)>([\\s\\S]*?)</\\1>', 'gi');
  for (const match of markup.matchAll(pattern)) {
    elements.push({
      tag: match[1].toLowerCase(),
      position: match.index,
      line: lineAt(markup, match.index),
      attributes: match[2] || '',
      text: normalizeWhitespace(match[3] || '')
    });
  }
  return elements;
}

function collectSelfClosingInputs(markup) {
  const elements = [];
  const pattern = /<input\b([^>]*?)\/?>/gi;
  for (const match of markup.matchAll(pattern)) {
    elements.push({
      tag: 'input',
      position: match.index,
      line: lineAt(markup, match.index),
      attributes: match[1] || '',
      text: ''
    });
  }
  return elements;
}

function collectControls(markup) {
  const controls = [];
  const pairs = collectPairedElements(markup, ['button', 'a', 'select', 'textarea']);
  const inputs = collectSelfClosingInputs(markup);
  for (const element of pairs.concat(inputs)) {
    controls.push({
      tag: element.tag,
      position: element.position,
      line: element.line,
      id: attributeValue(element.attributes, 'id'),
      classes: (attributeValue(element.attributes, 'class') || '').split(/\s+/).filter(Boolean),
      type: element.tag === 'button' || element.tag === 'input' || element.tag === 'a'
        ? attributeValue(element.attributes, 'type')
        : undefined,
      href: element.tag === 'a' ? attributeValue(element.attributes, 'href') : undefined,
      value: element.tag === 'input' ? attributeValue(element.attributes, 'value') : undefined,
      ariaLabel: attributeValue(element.attributes, 'aria-label'),
      ariaLabelledby: attributeValue(element.attributes, 'aria-labelledby'),
      role: attributeValue(element.attributes, 'role'),
      title: attributeValue(element.attributes, 'title'),
      text: element.tag === 'input' ? '' : element.text
    });
  }
  controls.sort((left, right) => left.position - right.position);
  return controls;
}

function collectTabindexDeclarations(markup) {
  const declarations = [];
  const pattern = /<([a-zA-Z][\w:-]*)\b([^>]*?)\btabindex\s*=\s*(?:"(-?\d+)"|'(-?\d+)')([^>]*)>/g;
  for (const match of markup.matchAll(pattern)) {
    const raw = match[3] ?? match[4] ?? '';
    const value = Number.parseInt(raw, 10);
    declarations.push({
      tag: match[1].toLowerCase(),
      id: attributeValue((match[2] || '') + ' ' + (match[5] || ''), 'id'),
      line: lineAt(markup, match.index),
      value,
      kind: value > 0 ? 'positive' : value === 0 ? 'zero' : 'negative'
    });
  }
  return declarations;
}

function collectLabelForMapping(markup) {
  const mapping = new Map();
  for (const label of collectPairedElements(markup, ['label'])) {
    const forId = attributeValue(label.attributes, 'for');
    if (forId && label.text && !mapping.has(forId)) {
      mapping.set(forId, { text: label.text, line: label.line });
    }
  }
  return mapping;
}

function collectHeadingTextById(markup) {
  const mapping = new Map();
  for (const heading of collectPairedElements(markup, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])) {
    const id = attributeValue(heading.attributes, 'id');
    if (id && heading.text) mapping.set(id, { text: heading.text, line: heading.line });
  }
  return mapping;
}

function collectIdTextIndex(markup) {
  const mapping = new Map();
  for (const element of collectPairedElements(
    markup,
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button', 'li', 'td', 'th']
  )) {
    const id = attributeValue(element.attributes, 'id');
    if (id && element.text && !mapping.has(id)) {
      mapping.set(id, { text: element.text, line: element.line });
    }
  }
  return mapping;
}

// ---------------------------------------------------------------------------
// Accessible-name resolution
// ---------------------------------------------------------------------------

/**
 * Resolves an accessible name strictly from what the source declares, in the
 * order: aria-label > aria-labelledby (all referenced ids must resolve in the
 * same document with non-empty text) > <label for> > text content > title >
 * value. value counts only for input type=button|submit|reset. placeholder is
 * never accepted as a name.
 */
function resolveAccessibleName(control, context) {
  if (typeof control.ariaLabel === 'string' && control.ariaLabel.trim() !== '') {
    return { resolved: true, source: 'aria-label', value: normalizeWhitespace(control.ariaLabel) };
  }
  if (typeof control.ariaLabelledby === 'string' && control.ariaLabelledby.trim() !== '') {
    const ids = control.ariaLabelledby.split(/\s+/).filter(Boolean);
    const resolvedTexts = [];
    const missingIds = [];
    for (const id of ids) {
      const target = context.headings.get(id) || context.idText.get(id);
      if (target) resolvedTexts.push(target.text);
      else missingIds.push(id);
    }
    if (missingIds.length === 0 && resolvedTexts.every((text) => text !== '')) {
      return { resolved: true, source: 'aria-labelledby', value: resolvedTexts.join(' ') };
    }
    return { resolved: false, source: 'aria-labelledby', value: null, missingIds };
  }
  const labelText = control.id ? context.labels.get(control.id) : undefined;
  if (labelText && labelText.text !== '') {
    return { resolved: true, source: 'label', value: labelText.text };
  }
  if (control.text !== '') {
    return { resolved: true, source: 'text', value: control.text };
  }
  if (typeof control.title === 'string' && control.title.trim() !== '') {
    return { resolved: true, source: 'title', value: normalizeWhitespace(control.title) };
  }
  if (control.tag === 'input' && (control.type === 'button' || control.type === 'submit' || control.type === 'reset')) {
    if (typeof control.value === 'string' && control.value.trim() !== '') {
      return { resolved: true, source: 'value', value: normalizeWhitespace(control.value) };
    }
  }
  return { resolved: false, source: 'none', value: null };
}

// ---------------------------------------------------------------------------
// CSS scanning
// ---------------------------------------------------------------------------

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

function matchingBrace(text, openIndex) {
  let depth = 0;
  let quote = null;
  for (let cursor = openIndex; cursor < text.length; cursor += 1) {
    const char = text[cursor];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return cursor;
    }
  }
  return text.length - 1;
}

function parseCssBlocks(css, sourceLabel) {
  const text = stripCssComments(css);
  const blocks = [];
  const scan = (code, media, offset) => {
    let cursor = 0;
    while (cursor < code.length) {
      const open = code.indexOf('{', cursor);
      if (open === -1) return;
      const close = matchingBrace(code, open);
      const header = code.slice(cursor, open).trim();
      const body = code.slice(open + 1, close);
      const line = lineAt(css, offset + open);
      if (/^@media\b/i.test(header)) {
        const condition = normalizeWhitespace(header.replace(/^@media\b/i, '').trim());
        scan(body, media ? media + ' and ' + condition : condition, offset + open + 1);
      } else if (/^@/.test(header)) {
        // at-rules such as @font-face/@keyframes are not control-sizing rules
      } else if (body.indexOf('{') === -1) {
        blocks.push({
          source: sourceLabel,
          line,
          selectors: header.split(',').map((selector) => selector.trim()).filter(Boolean),
          media,
          declarations: parseDeclarations(body)
        });
      } else {
        const nestedOpen = body.indexOf('{');
        const nestedClose = matchingBrace(body, nestedOpen);
        scan(body.slice(nestedOpen + 1, nestedClose), media, offset + open + nestedOpen + 1);
      }
      cursor = close + 1;
    }
  };
  scan(text, null, 0);
  return blocks;
}

function parseDeclarations(body) {
  const declarations = new Map();
  for (const chunk of body.split(';')) {
    const colon = chunk.indexOf(':');
    if (colon === -1) continue;
    const property = chunk.slice(0, colon).trim().toLowerCase();
    const value = chunk.slice(colon + 1).trim();
    if (property && value) declarations.set(property, value);
  }
  return declarations;
}

/**
 * Converts a CSS length token to px-equivalent using a root font-size base.
 * px and rem (em approximated at the same base) resolve; %, vw, vh, ch and
 * calc() return null so no invented number is ever asserted.
 */
function pxFromLength(value, rootFontSizePx) {
  if (typeof value !== 'string') return null;
  const match = /^(-?\d+(?:\.\d+)?)(px|rem|em)?$/.exec(value.trim());
  if (!match) return null;
  const amount = Number.parseFloat(match[1]);
  const unit = match[2] || 'px';
  if (unit === 'px') return amount;
  return amount * (rootFontSizePx || DEFAULT_ROOT_FONT_SIZE_PX);
}

function rootFontSizeFromCss(css) {
  if (!css) return DEFAULT_ROOT_FONT_SIZE_PX;
  const text = stripCssComments(css);
  const match = /(?:^|\})\s*(?:html|:root)\s*\{([^}]*)\}/.exec(text);
  if (!match) return DEFAULT_ROOT_FONT_SIZE_PX;
  const declarations = parseDeclarations(match[1]);
  const font = declarations.get('font-size');
  if (!font) return DEFAULT_ROOT_FONT_SIZE_PX;
  const percent = /^(\d+(?:\.\d+)?)\s*%\s*$/.exec(font);
  if (percent) return (Number.parseFloat(percent[1]) / 100) * DEFAULT_ROOT_FONT_SIZE_PX;
  const px = /^(\d+(?:\.\d+)?)\s*px\s*$/.exec(font);
  if (px) return Number.parseFloat(px[1]);
  return DEFAULT_ROOT_FONT_SIZE_PX;
}

function verticalPaddingPx(declarations, rootFontSizePx) {
  const blockValue = declarations.get('padding-block');
  if (blockValue !== undefined) {
    const parts = blockValue.split(/\s+/).filter(Boolean);
    if (parts.length > 2) return null;
    const top = pxFromLength(parts[0], rootFontSizePx);
    const bottom = parts.length === 2 ? pxFromLength(parts[1], rootFontSizePx) : top;
    if (top === null || bottom === null) return null;
    return top + bottom;
  }
  const shorthand = declarations.get('padding');
  if (shorthand === undefined) return null;
  const parts = shorthand.split(/\s+/).filter(Boolean);
  if (parts.length > 4) return null;
  if (parts.length === 0) return 0;
  const verticalOf = (value) => pxFromLength(value, rootFontSizePx);
  if (parts.length === 1 || parts.length === 2) {
    const top = verticalOf(parts[0]);
    const bottom = parts.length === 2 ? verticalOf(parts[1]) : top;
    if (top === null || bottom === null) return null;
    return top + bottom;
  }
  const top = verticalOf(parts[0]);
  const bottom = verticalOf(parts.length === 3 ? parts[0] : parts[2]);
  if (top === null || bottom === null) return null;
  return top + bottom;
}

function borderVerticalPx(declarations) {
  let total = 0;
  for (const name of ['border-block-width', 'border-top-width', 'border-bottom-width']) {
    const value = declarations.get(name);
    if (value === undefined) continue;
    const match = /^(\d+(?:\.\d+)?)(?:px)?$/.exec(value.trim());
    if (!match) return null;
    total += Number.parseFloat(match[1]);
  }
  const shorthand = declarations.get('border');
  if (shorthand !== undefined) {
    const first = shorthand.trim().split(/\s+/)[0];
    const match = /^(\d+(?:\.\d+)?)(?:px)?$/.exec(first);
    if (!match) return null;
    total += Number.parseFloat(match[1]) * 2;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Channel-specific audits
// ---------------------------------------------------------------------------

function controlSelectorRelevant(selectors, buttonClasses) {
  return selectors.some((selector) => {
    if (/\b(button|input|select|textarea)\b/i.test(selector)) return true;
    return (buttonClasses || []).some((className) => selector.includes('.' + className));
  });
}

function isOverflowClipping(declarations) {
  return ['overflow', 'overflow-block', 'overflow-y'].some((name) => {
    const value = declarations.get(name);
    return typeof value === 'string' && /hidden|clip/.test(value.toLowerCase());
  });
}

function auditTouchTargets(cssBlocks, options) {
  const rootFontSizePx = options.rootFontSizePx;
  const buttonClasses = options.buttonClasses || [];
  const rules = [];
  const belowTarget = [];
  const unverified = [];
  const heightTrap = [];
  for (const block of cssBlocks) {
    if (!controlSelectorRelevant(block.selectors, buttonClasses)) continue;
    const minHeightRaw = block.declarations.has('min-height') ? block.declarations.get('min-height') : undefined;
    const minHeightPx = minHeightRaw === undefined ? null : pxFromLength(minHeightRaw, rootFontSizePx);
    const heightRaw = block.declarations.has('height') ? block.declarations.get('height') : undefined;
    const heightPx = heightRaw === undefined ? null : pxFromLength(heightRaw, rootFontSizePx);
    const paddingBlockPx = verticalPaddingPx(block.declarations, rootFontSizePx);
    const bordersPx = borderVerticalPx(block.declarations);
    const rule = {
      selector: block.selectors.join(', '),
      media: block.media,
      line: block.line,
      declared: {
        'min-height': minHeightRaw ?? null,
        height: heightRaw ?? null,
        'padding-block': block.declarations.get('padding-block') ?? null,
        padding: block.declarations.get('padding') ?? null
      },
      minCsPx: minHeightPx
    };
    rules.push(rule);
    if (minHeightRaw !== undefined) {
      if (minHeightPx === null) {
        unverified.push({
          rule: rule.selector,
          line: rule.line,
          reason: 'min-height "' + minHeightRaw + '" is not a demonstrably numeric px/rem/em length; a ≥44 CSS px claim cannot be asserted from source.'
        });
      } else if (minHeightPx < MIN_TOUCH_TARGET_PX - 0.0005) {
        belowTarget.push({
          rule: rule.selector,
          line: rule.line,
          minCsPx: Math.round(minHeightPx * 1000) / 1000
        });
      }
      continue;
    }
    if (heightRaw !== undefined) {
      if (heightPx === null || paddingBlockPx === null || bordersPx === null) {
        unverified.push({
          rule: rule.selector,
          line: rule.line,
          reason: 'fixed height "' + heightRaw + '" declared, but its padding/border contributions are not demonstrably numeric; a <44 CSS px claim cannot be asserted from source.'
        });
        continue;
      }
      const stack = heightPx + paddingBlockPx + bordersPx;
      heightTrap.push({
        rule: rule.selector,
        line: rule.line,
        csPx: Math.round(stack * 1000) / 1000,
        overflowClips: isOverflowClipping(block.declarations)
      });
      continue;
    }
    if (paddingBlockPx !== null && paddingBlockPx >= MIN_TOUCH_TARGET_PX - 0.0005) continue;
    unverified.push({
      rule: rule.selector,
      line: rule.line,
      reason: 'no min-height/height declared and padding cannot demonstrate a ≥44 CSS px stack; size is not provable from source.'
    });
  }
  return { rules, belowTarget, unverified, heightTrap };
}

function auditZoomClipRisk(cssBlocks) {
  const risky = [];
  for (const block of cssBlocks) {
    if (!isOverflowClipping(block.declarations)) continue;
    if (block.declarations.has('height') && !block.declarations.has('min-height')) {
      risky.push({
        rule: block.selectors.join(', '),
        line: block.line,
        height: block.declarations.get('height'),
        overflow: 'hidden'
      });
    }
  }
  return risky;
}

function collectFixedPxFontSizes(cssBlocks) {
  const fixed = [];
  for (const block of cssBlocks) {
    const value = block.declarations.get('font-size');
    if (typeof value !== 'string') continue;
    if (/^\d+(?:\.\d+)?px/i.test(value.trim())) {
      fixed.push({ rule: block.selectors.join(', '), line: block.line, font: value.trim() });
    }
  }
  return fixed;
}

function scanJsForDomUsage(code, label) {
  const scan = {
    dynamicButtons: [],
    innerHtmlSinks: [],
    ariaLabelSelections: [],
    focusCalls: []
  };
  let match;
  const createButtonPattern = /createElement\(\s*(?:'button'|"button")\s*\)/g;
  while ((match = createButtonPattern.exec(code)) !== null) {
    let end = match.index;
    let lines = 0;
    while (end < code.length && lines <= 40) {
      if (code.charCodeAt(end) === 10) lines += 1;
      end += 1;
    }
    const windowCode = code.slice(match.index, end);
    const nameAssigned = /textContent|innerText|aria-label|\.text\b|append\s*\(\s*['"]/.test(windowCode);
    scan.dynamicButtons.push({
      source: label,
      line: lineAt(code, match.index),
      nameAssigned: nameAssigned ? 'yes' : 'unknown',
      note: nameAssigned
        ? 'a name channel (textContent/innerText/aria-label) appears within the 40-line audit window'
        : 'no name channel found within the 40-line audit window; naming is not demonstrable'
    });
  }
  const sinkPattern = /\.(innerHTML|outerHTML)\s*=/g;
  while ((match = sinkPattern.exec(code)) !== null) {
    scan.innerHtmlSinks.push({ source: label, line: lineAt(code, match.index), sink: match[1] });
  }
  const ariaPattern = /aria-label['"]?\s*[:=]/g;
  while ((match = ariaPattern.exec(code)) !== null) {
    scan.ariaLabelSelections.push({ source: label, line: lineAt(code, match.index) });
  }
  const focusPattern = /\b([A-Za-z_$][\w$]*)\s*\.\s*focus\(\s*\)/g;
  while ((match = focusPattern.exec(code)) !== null) {
    scan.focusCalls.push({ source: label, line: lineAt(code, match.index), receiver: match[1] });
  }
  return scan;
}

// ---------------------------------------------------------------------------
// Report assembly
// ---------------------------------------------------------------------------

function finding(code, severity, status, message, evidence) {
  return { code, severity, status, message, evidence: evidence ?? null };
}

function verified(code, message, evidence) {
  return { code, message, evidence: evidence ?? null };
}

/**
 * Pure audit over raw source texts. Options:
 *   html            — focus_lab.html source text (null when absent)
 *   css             — focus_lab.css source text (null when absent)
 *   jsSources       — [{path?, text}] room6 JS sources to scan
 *   htmlSourcePath/cssSourcePath — display paths for evidence
 */
function auditFocusLabSources(options) {
  const html = options.html === undefined || options.html === null || options.html === '' ? null : options.html;
  const css = options.css === undefined || options.css === null || options.css === '' ? null : options.css;
  const jsSources = Array.isArray(options.jsSources) ? options.jsSources : [];
  const findings = [];
  const checks = [];

  const htmlChannels = html
    ? splitHtmlChannels(html)
    : { markup: '', scriptBlocks: [], styleBlocks: [] };

  const context = {
    labels: html ? collectLabelForMapping(htmlChannels.markup) : new Map(),
    headings: html ? collectHeadingTextById(htmlChannels.markup) : new Map(),
    idText: html ? collectIdTextIndex(htmlChannels.markup) : new Map()
  };

  let cssBlocks = [];
  const cssChannelSources = [];
  if (css) {
    cssBlocks = cssBlocks.concat(parseCssBlocks(css, options.cssSourceLabel || 'focus_lab.css'));
    cssChannelSources.push(options.cssSourceLabel || 'focus_lab.css');
  }
  for (const block of htmlChannels.styleBlocks) {
    const label = 'focus_lab.html:style@line' + block.line;
    cssBlocks = cssBlocks.concat(parseCssBlocks(block.body, label));
    cssChannelSources.push(label);
  }

  const controls = html ? collectControls(htmlChannels.markup) : [];
  const buttons = controls.filter((control) => control.tag === 'button');
  const inputs = controls.filter((control) => control.tag === 'input');
  const buttonClasses = buttons.flatMap((button) => button.classes);

  // --- 1. accessible names ---------------------------------------------------
  const named = [];
  const unnamed = [];
  const unresolvable = [];
  const namedBySource = {};
  for (const control of buttons) {
    const name = resolveAccessibleName(control, context);
    if (name.resolved) {
      named.push(control);
      namedBySource[name.source] = (namedBySource[name.source] || 0) + 1;
    } else if (name.source === 'aria-labelledby') {
      unresolvable.push({ id: control.id, line: control.line, missingIds: name.missingIds });
    } else {
      unnamed.push({ id: control.id, line: control.line });
    }
  }
  for (const entry of unnamed) {
    findings.push(finding(
      'accessible_name_missing',
      'fail',
      html ? 'source_tested' : 'not_testable_here',
      'button' + (entry.id ? ' #' + entry.id : '') + ' at line ' + entry.line +
        ' declares no accessible name in source: no aria-label, no resolvable aria-labelledby, no <label for>, empty textContent and no title.',
      { element: 'button', id: entry.id, line: entry.line }
    ));
  }
  for (const entry of unresolvable) {
    findings.push(finding(
      'accessible_name_source_unresolvable',
      'fail',
      html ? 'source_tested' : 'not_testable_here',
      'button' + (entry.id ? ' #' + entry.id : '') + ' at line ' + entry.line +
        ' relies on aria-labelledby, but its target ids are absent or empty in source: ' + entry.missingIds.join(', '),
      { element: 'button', id: entry.id, line: entry.line, missingIds: entry.missingIds }
    ));
  }

  const jsDom = jsSources.map((entry) => ({
    path: entry.path || null,
    scan: scanJsForDomUsage(entry.text || '', entry.path || entry.label || 'inline')
  }));
  for (const entry of jsDom) {
    for (const button of entry.scan.dynamicButtons) {
      if (button.nameAssigned === 'yes') continue;
      findings.push(finding(
        'dynamic_button_name_not_demonstrable',
        'warn',
        'source_tested',
        entry.path + ' creates a button at line ' + button.line + ' with ' + button.note + '.',
        button
      ));
    }
    for (const sink of entry.scan.innerHtmlSinks) {
      findings.push(finding(
        'untrusted_innerhtml_sink',
        'warn',
        'source_tested',
        entry.path + ' line ' + sink.line + ' assigns .innerHTML (.' + sink.sink + '): safe handling of untrusted input is not demonstrable; room6 renders with textContent.',
        sink
      ));
    }
  }

  // --- 2. touch targets ----------------------------------------------------------
  const rootFontSizePx = rootFontSizeFromCss(
    css || htmlChannels.styleBlocks.map((block) => block.body).join('\n') || ''
  );
  const touch = auditTouchTargets(cssBlocks, { rootFontSizePx, buttonClasses });
  for (const below of touch.belowTarget) {
    findings.push(finding(
      'touch_target_below_44',
      'fail',
      cssChannelSources.length > 0 ? 'source_tested' : 'not_testable_here',
      'rule "' + below.rule + '" declares a ' + below.minCsPx + ' CSS px min-height, below the 44 CSS px touch-target expectation.',
      below
    ));
  }
  for (const trap of touch.heightTrap) {
    if (trap.csPx >= MIN_TOUCH_TARGET_PX - 0.0005) continue;
    findings.push(finding(
      'touch_target_fixed_height_below_44',
      'fail',
      cssChannelSources.length > 0 ? 'source_tested' : 'not_testable_here',
      'rule "' + trap.rule + '" builds a fixed ' + trap.csPx + ' CSS px stack (height + vertical padding + borders) without a min-height guard, below the 44 CSS px expectation.',
      trap
    ));
  }
  for (const unverifiable of touch.unverified) {
    findings.push(finding(
      'touch_target_size_not_demonstrable',
      'warn',
      'source_tested',
      '"' + unverifiable.rule + '" at line ' + unverifiable.line + ': ' + unverifiable.reason,
      unverifiable
    ));
  }

  // --- 3. focus order ---------------------------------------------------------------
  const tabindexDeclarations = html ? collectTabindexDeclarations(htmlChannels.markup) : [];
  const positiveTabindex = tabindexDeclarations.filter((declaration) => declaration.kind === 'positive');
  for (const declaration of positiveTabindex) {
    findings.push(finding(
      'positive_tabindex_breaks_focus_order',
      'fail',
      html ? 'source_tested' : 'not_testable_here',
      (declaration.id ? '#' + declaration.id + ' (' : '') + declaration.tag + ') at line ' + declaration.line +
        ' declares tabindex="' + declaration.value + '"; runtime tab order then diverges from DOM order and cannot be asserted from source, so it fails the static expectation.',
      declaration
    ));
  }
  const focusVisibleDeclared = cssBlocks.some((block) =>
    block.selectors.some((selector) => /:focus-visible/i.test(selector))
  );
  if (cssChannelSources.length > 0 && !focusVisibleDeclared) {
    findings.push(finding(
      'focus_visible_styles_absent',
      'fail',
      cssChannelSources.length > 0 ? 'source_tested' : 'not_testable_here',
      'No :focus-visible rule is declared in the CSS sources; a visible keyboard focus indicator is not demonstrably styled.'
    ));
  }
  const focusables = controls.map((control) => ({
    tag: control.tag,
    id: control.id,
    line: control.line,
    nameResolved: resolveAccessibleName(control, context).resolved
  }));

  // --- 4. 200% zoom friendliness -------------------------------------------------------
  const fixedPxFontSizes = collectFixedPxFontSizes(cssBlocks);
  for (const entry of fixedPxFontSizes) {
    findings.push(finding(
      'fixed_px_font_size',
      'warn',
      cssChannelSources.length > 0 ? 'source_tested' : 'not_testable_here',
      entry.rule + ' declares font-size in fixed px (' + entry.font + '); relative rem/% sizing is the demonstrably zoom-friendly form.',
      entry
    ));
  }
  const fixedClipRisk = auditZoomClipRisk(cssBlocks);
  for (const entry of fixedClipRisk) {
    findings.push(finding(
      'fixed_height_overflow_clip_risk',
      'fail',
      cssChannelSources.length > 0 ? 'source_tested' : 'not_testable_here',
      entry.rule + ' declares fixed height ' + entry.height + ' with overflow hidden; at 200% text growth the block cannot grow so clipping risk is demonstrably present in source.',
      entry
    ));
  }
  const mediaQueries = [...new Set(cssBlocks.filter((block) => block.media).map((block) => block.media))];
  const textAdjustDeclared = cssBlocks.some((block) =>
    [...block.declarations.keys()].some((property) => /text-size-adjust/.test(property))
  );
  const relativeControlFont = cssBlocks.some((block) => {
    if (!controlSelectorRelevant(block.selectors, buttonClasses)) return false;
    const value = block.declarations.get('font-size');
    return typeof value === 'string' && /(rem|em|%)/.test(value);
  });

  // --- verified demonstrable claims ------------------------------------------------------
  if (html && buttons.length > 0) {
    if (unnamed.length === 0 && unresolvable.length === 0) {
      checks.push(verified(
        'all_declared_buttons_have_accessible_names',
        buttons.length + ' declared <button> elements resolve accessible names from source only (' +
          Object.entries(namedBySource).map(([source, count]) => count + 'x ' + source).join(', ') + '); no names were invented.',
        'innerHTML is never used as a name channel'
      ));
    }
    if (positiveTabindex.length === 0) {
      checks.push(verified(
        'no_positive_tabindex_declared',
        '0 positive tabindex values in source; the only demonstrable focus-order claim is DOM order across ' + focusables.length + ' inventoried native focusables.'
      ));
    }
  }
  if (touch.rules.length > 0 && touch.belowTarget.length === 0 && touch.heightTrap.every((trap) => trap.csPx >= MIN_TOUCH_TARGET_PX)) {
    checks.push(verified(
      'all_declared_control_min_heights_meet_44_css_px',
      touch.rules.length + ' relevant control sizing rules audited; every numeric min-height claim meets the ' + MIN_TOUCH_TARGET_PX + ' CSS px floor at root font ' + rootFontSizePx + 'px.'
    ));
  }
  if (cssChannelSources.length > 0 && focusVisibleDeclared) {
    checks.push(verified(
      'focus_visible_styles_declared',
      'A :focus-visible rule is declared in CSS, so keyboard focus indication is demonstrably styled in source.'
    ));
  }
  if (cssChannelSources.length > 0 && fixedClipRisk.length === 0) {
    checks.push(verified(
      'no_fixed_height_overflow_clip_risk',
      'No CSS rule combines a fixed height with overflow clipping, so 200% text growth is not demonstrably clipped.'
    ));
  }
  if (relativeControlFont) {
    checks.push(verified(
      'control_font_size_relative',
      'Control font sizes declare rem/em/% relative units, which enlarge with 200% text settings.'
    ));
  }
  if (jsDom.length > 0 && jsDom.every((entry) => entry.scan.innerHtmlSinks.length === 0)) {
    checks.push(verified(
      'js_avoids_untrusted_innerhtml',
      'Audited room6 JS declares no .innerHTML/.outerHTML sinks; content is built without untrusted innerHTML.'
    ));
  }

  // --- absence honesty --------------------------------------------------------------------
  if (!html) {
    findings.push(finding(
      'source_missing',
      'info',
      'not_testable_here',
      'focus_lab.html is not present in this checkout, so button/accessible-name/focus-order source claims cannot be audited here; nothing was fabricated.'
    ));
  }
  if (!css && htmlChannels.styleBlocks.length === 0) {
    findings.push(finding(
      'source_missing',
      'info',
      'not_testable_here',
      'No focus_lab.css and no inline <style> is present, so CSS-level touch-target/focus/zoom source claims cannot be audited here; nothing was fabricated.'
    ));
  }
  if (jsDom.length === 0) {
    findings.push(finding(
      'source_missing',
      'info',
      'not_testable_here',
      'No js/room6 script is present in this checkout, so dynamic button naming could not be scanned.'
    ));
  }

  const failures = findings.filter((entry) => entry.severity === 'fail');
  const warns = findings.filter((entry) => entry.severity === 'warn');
  const infos = findings.filter((entry) => entry.severity === 'info');

  return {
    schemaVersion: SCHEMA_VERSION,
    tool: TOOL_NAME,
    readOnly: true,
    expectation: {
      touchTarget: {
        minCsPx: MIN_TOUCH_TARGET_PX,
        note: '44 CSS px equals 2.75rem at the 1rem = 16px reference base; rem/em sizes convert with the declared root font-size.'
      },
      zoom: '200% zoom friendliness is asserted only as demonstrable source declarations: relative text units, no fixed-height clipping, text-size-adjust, responsive media queries. Actual rendering is runtime NOT_TESTED.',
      focusOrder: 'Focus order is asserted only as: no positive tabindex + native focusables in DOM order + declared :focus-visible indication.'
    },
    sources: {
      html: {
        path: options.htmlSourcePath || DEFAULT_FOCUS_LAB_HTML,
        exists: Boolean(html),
        byteCount: html ? Buffer.byteLength(html, 'utf8') : 0,
        lineCount: html ? html.split('\n').length : 0
      },
      css: {
        path: options.cssSourcePath || DEFAULT_FOCUS_LAB_CSS,
        exists: Boolean(css),
        byteCount: css ? Buffer.byteLength(css, 'utf8') : 0,
        lineCount: css ? css.split('\n').length : 0
      },
      cssChannels: cssChannelSources,
      js: jsSources.map((entry) => ({
        path: entry.path,
        exists: entry.exists,
        byteCount: entry.byteCount,
        lineCount: entry.lineCount
      }))
    },
    accessibleNames: {
      buttonsAudited: buttons.length,
      namedButtons: named.length,
      unnamedButtons: unnamed.length,
      unresolvableButtons: unresolvable.length,
      bySource: namedBySource,
      named: named.map((control) => {
        const name = resolveAccessibleName(control, context);
        return { id: control.id, line: control.line, source: name.source, value: name.value };
      }),
      unnamed,
      unresolvable
    },
    touchTargets: {
      minCsPx: MIN_TOUCH_TARGET_PX,
      rootFontSizePx,
      rulesAudited: touch.rules.length,
      rules: touch.rules,
      belowTarget: touch.belowTarget,
      fixedHeightTrap: touch.heightTrap.filter((trap) => trap.csPx < MIN_TOUCH_TARGET_PX),
      unverified: touch.unverified
    },
    focusOrder: {
      tabOrderAssertable: positiveTabindex.length === 0,
      orderBasis: positiveTabindex.length === 0
        ? 'no positive tabindex declared: the only demonstrable focus-order claim is DOM order over the inventoried native focusables'
        : 'positive tabindex present: runtime tab order is not demonstrable from source',
      focusables,
      tabindexDeclarations,
      positiveTabindex,
      focusVisibleDeclared,
      focusManagementCalls: jsDom.flatMap((entry) => entry.scan.focusCalls),
      ariaLabelAssignmentsInJs: jsDom.flatMap((entry) => entry.scan.ariaLabelSelections)
    },
    dynamicButtons: jsDom.flatMap((entry) => entry.scan.dynamicButtons),
    dynamicButtonNameUnknownCount: jsDom
      .flatMap((entry) => entry.scan.dynamicButtons)
      .filter((button) => button.nameAssigned === 'unknown').length,
    innerHtmlSinks: jsDom.flatMap((entry) => entry.scan.innerHtmlSinks),
    zoom: {
      rootFontSizePx,
      relativeControlFont,
      fixedPxFontSizes,
      fixedClipRisk,
      textAdjustDeclared,
      mediaQueryCount: mediaQueries.length,
      mediaQueries
    },
    findings,
    verified: checks,
    runtime: RUNTIME_NOT_TESTED,
    summary: {
      buttonsAudited: buttons.length,
      namedButtons: named.length,
      unnamedButtons: unnamed.length + unresolvable.length,
      inputsAudited: inputs.length,
      focusablesInventoried: focusables.length,
      touchRulesAudited: touch.rules.length,
      touchRulesBelowTarget: touch.belowTarget.length + touch.heightTrap.filter((trap) => trap.csPx < MIN_TOUCH_TARGET_PX).length,
      verifiedCount: checks.length,
      failedFindings: failures.length,
      warnFindings: warns.length,
      infoFindings: infos.length,
      notTestedRuntimeCount: RUNTIME_NOT_TESTED.length
    },
    limitations: [
      'Static source inspection only: rem converts with the declared root font-size (em is the same base approximation); %/vw/vh/calc are treated as non-numeric so nothing is invented.',
      'CSS rule-to-control mapping is by tag (button/input/select/textarea) and by classes carried by audited <button> elements; other selector shapes are skipped rather than guessed.',
      'Buttons created at runtime by room6 JS are scanned only for a demonstrable name channel within a 40-line window; real DOM creation happens at runtime.',
      'The 44 CSS px floor is the task-mandated expectation applied to declared CSS; rendered boxes, announced names, live keyboard traversal, real zoom rendering and touch/hover interaction are NOT_TESTED.',
      'No file in the repository is modified by this inspection.'
    ]
  };
}

// ---------------------------------------------------------------------------
// Read-only repository wrapper
// ---------------------------------------------------------------------------

function listRoom6JsSources(root) {
  const directory = path.resolve(root, DEFAULT_ROOM6_JS_DIR);
  let names = [];
  try {
    names = fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
  }
  return names.map((name) => readSource(root, DEFAULT_ROOM6_JS_DIR + '/' + name, 'room6_js'));
}

function inspectRepository(options) {
  const root = path.resolve(options.root || DEFAULT_ROOT);
  const htmlPath = options.htmlPath || DEFAULT_FOCUS_LAB_HTML;
  const cssPath = options.cssPath || DEFAULT_FOCUS_LAB_CSS;
  const html = readSource(root, htmlPath, 'focus_lab_html');
  const css = readSource(root, cssPath, 'focus_lab_css');
  const jsSources = options.jsSources === null ? [] : listRoom6JsSources(root);
  const report = auditFocusLabSources({
    html: html.exists ? html.text : null,
    css: css.exists ? css.text : null,
    jsSources,
    htmlSourcePath: html.path,
    cssSourcePath: css.path
  });
  return { ...report, root, checkedRootFiles: [html.path, css.path, DEFAULT_ROOM6_JS_DIR] };
}

// ---------------------------------------------------------------------------
// CLI (prints the structured JSON report or a short summary; offline, no writes)
// ---------------------------------------------------------------------------

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--summary') {
      options.summary = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    const match = /^--(root|html|css)(?:=(.*))?$/.exec(arg);
    if (!match) throw new Error('Unknown argument: ' + arg);
    const value = match[2] !== undefined ? match[2] : argv[index + 1];
    if (value === undefined) throw new Error('Missing value for --' + match[1]);
    options[match[1]] = value;
    if (match[2] === undefined) index += 1;
  }
  return options;
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node tools/room6/aria_touch_probe.cjs [--root DIR] [--summary]',
      '',
      'Read-only offline audit of the Focus Lab page contract: button accessible',
      'names, the 44 CSS px touch-target expectation, focus-order source claims',
      'and 200% zoom friendliness. Runtime behavior is explicitly NOT_TESTED;',
      'this tool never converts a source/test fact into a runtime pass.'
    ].join('\n') + '\n'
  );
}

function printSummary(report) {
  return [
    'aria_touch_probe summary',
    '- buttons audited: ' + report.summary.buttonsAudited + ' (named ' + report.summary.namedButtons + ', unnamed ' + report.summary.unnamedButtons + ')',
    '- 44 CSS px expectation: ' + report.summary.touchRulesAudited + ' control rules audited, ' + report.summary.touchRulesBelowTarget + ' below target',
    '- focus order: ' + report.focusOrder.orderBasis,
    '- :focus-visible declared: ' + report.focusOrder.focusVisibleDeclared,
    '- 200% zoom: relativeControlFont=' + report.zoom.relativeControlFont + ', fixedClipRisk=' + report.zoom.fixedClipRisk.length + ', mediaQueries=' + report.zoom.mediaQueryCount,
    '- findings: fail=' + report.summary.failedFindings + ', warn=' + report.summary.warnFindings + ', info=' + report.summary.infoFindings,
    '- verified source claims: ' + report.summary.verifiedCount,
    '- runtime items NOT_TESTED: ' + report.summary.notTestedRuntimeCount
  ].join('\n') + '\n';
}

function main(argv) {
  const options = parseArguments(argv);
  if (options.help) {
    printHelp();
    return;
  }
  const report = inspectRepository(options);
  process.stdout.write(options.summary ? printSummary(report) : JSON.stringify(report, null, 2) + '\n');
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write('aria_touch_probe: ' + error.message + '\n');
    process.exitCode = 1;
  }
}

module.exports = {
  SCHEMA_VERSION,
  TOOL_NAME,
  DEFAULT_ROOT,
  DEFAULT_FOCUS_LAB_HTML,
  DEFAULT_FOCUS_LAB_CSS,
  DEFAULT_ROOM6_JS_DIR,
  MIN_TOUCH_TARGET_PX,
  DEFAULT_ROOT_FONT_SIZE_PX,
  RUNTIME_NOT_TESTED,
  splitHtmlChannels,
  collectPairedElements,
  collectSelfClosingInputs,
  collectControls,
  collectTabindexDeclarations,
  collectLabelForMapping,
  collectHeadingTextById,
  collectIdTextIndex,
  resolveAccessibleName,
  parseCssBlocks,
  parseDeclarations,
  pxFromLength,
  rootFontSizeFromCss,
  verticalPaddingPx,
  borderVerticalPx,
  scanJsForDomUsage,
  auditTouchTargets,
  auditZoomClipRisk,
  collectFixedPxFontSizes,
  auditFocusLabSources,
  listRoom6JsSources,
  inspectRepository,
  parseArguments,
  printHelp,
  printSummary
};
