export const VERSION = 1;
export const DEFAULT_MIN_TOUCH_TARGET_PX = 44;
export const DEFAULT_BASE_FONT_SIZE_PX = 16;

export const SEVERITIES = Object.freeze({
  ERROR: 'error',
  WARNING: 'warning'
});

export const RULES = Object.freeze({
  LABEL_MISSING: 'label_missing',
  LABEL_FOR_MISSING: 'label_for_missing',
  ARIA_LABELLEDBY_MISSING: 'aria_labelledby_missing',
  TOUCH_TARGET_TOO_SMALL: 'touch_target_too_small'
});

export const DEFAULT_OPTIONS = Object.freeze({
  minTouchTargetPx: DEFAULT_MIN_TOUCH_TARGET_PX,
  baseFontSizePx: DEFAULT_BASE_FONT_SIZE_PX,
  checkLabels: true,
  checkTouchTargets: true
});

const RULE_ORDER = Object.freeze([
  RULES.LABEL_MISSING,
  RULES.LABEL_FOR_MISSING,
  RULES.ARIA_LABELLEDBY_MISSING,
  RULES.TOUCH_TARGET_TOO_SMALL
]);

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

const RAW_TEXT_TAGS = new Set(['script', 'style', 'template']);

const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'checkbox', 'radio', 'switch', 'tab',
  'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option',
  'slider', 'spinbutton', 'combobox', 'searchbox', 'textbox', 'treeitem'
]);

const LABELABLE_TAGS = new Set([
  'button', 'input', 'select', 'textarea', 'meter', 'output', 'progress'
]);

const INPUT_ROLES = Object.freeze({
  button: 'button',
  submit: 'button',
  reset: 'button',
  image: 'button',
  checkbox: 'checkbox',
  radio: 'radio',
  range: 'slider',
  number: 'spinbutton',
  search: 'searchbox',
  email: 'textbox',
  tel: 'textbox',
  text: 'textbox',
  url: 'textbox',
  password: 'textbox',
  date: 'textbox',
  datetime: 'textbox',
  'datetime-local': 'textbox',
  month: 'textbox',
  time: 'textbox',
  week: 'textbox',
  color: 'textbox',
  file: 'textbox'
});

const NAMED_ENTITIES = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0'
});

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function attrName(element, name) {
  if (!element || !element.attrs || !hasOwn(element.attrs, name)) return '';
  const value = element.attrs[name];
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function decodeEntities(value) {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g, (match, body) => {
    if (body[0] === '#') {
      const hex = body[1] === 'x' || body[1] === 'X';
      const digits = hex ? body.slice(2) : body.slice(1);
      const code = Number.parseInt(digits, hex ? 16 : 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch (error) {
        return match;
      }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named === undefined ? match : named;
  });
}

function createElement(tag, attrs, start, parent) {
  return {
    type: 'element',
    tag,
    attrs,
    start,
    parent,
    children: []
  };
}

function readStartTag(source, start) {
  const length = source.length;
  let index = start + 1;
  const nameStart = index;
  while (index < length && !/[\s/>=]/.test(source[index])) index += 1;
  const tag = source.slice(nameStart, index).toLowerCase();
  if (!tag) return null;
  const attrs = Object.create(null);
  let selfClosing = false;
  while (index < length) {
    while (index < length && /\s/.test(source[index])) index += 1;
    if (index >= length) break;
    if (source[index] === '>') {
      return { tag, attrs, selfClosing, end: index + 1 };
    }
    if (source[index] === '/') {
      if (source[index + 1] === '>') {
        return { tag, attrs, selfClosing: true, end: index + 2 };
      }
      index += 1;
      continue;
    }
    const attrStart = index;
    while (index < length && !/[\s/>=]/.test(source[index])) index += 1;
    const name = source.slice(attrStart, index).toLowerCase();
    if (!name) {
      index += 1;
      continue;
    }
    while (index < length && /\s/.test(source[index])) index += 1;
    let value = '';
    if (source[index] === '=') {
      index += 1;
      while (index < length && /\s/.test(source[index])) index += 1;
      if (source[index] === '"' || source[index] === "'") {
        const quote = source[index];
        index += 1;
        const valueStart = index;
        while (index < length && source[index] !== quote) index += 1;
        value = source.slice(valueStart, index);
        if (source[index] === quote) index += 1;
      } else {
        const valueStart = index;
        while (index < length && !/[\s>]/.test(source[index])) index += 1;
        value = source.slice(valueStart, index);
      }
    }
    if (!hasOwn(attrs, name)) attrs[name] = decodeEntities(value);
  }
  return { tag, attrs, selfClosing, end: index };
}

function popToTag(stack, tag) {
  for (let index = stack.length - 1; index > 0; index -= 1) {
    if (stack[index].tag === tag) {
      stack.length = index;
      return;
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDocument(source) {
  const root = createElement('#document', Object.create(null), 0, null);
  const elements = [];
  const stack = [root];
  const length = source.length;
  let index = 0;

  const addText = (text, start) => {
    if (!text) return;
    const parent = stack[stack.length - 1];
    parent.children.push({ type: 'text', value: decodeEntities(text), start });
  };

  while (index < length) {
    const tagStart = source.indexOf('<', index);
    if (tagStart < 0) {
      addText(source.slice(index), index);
      break;
    }
    if (tagStart > index) addText(source.slice(index, tagStart), index);

    if (source.startsWith('<!--', tagStart)) {
      const end = source.indexOf('-->', tagStart + 4);
      index = end < 0 ? length : end + 3;
      continue;
    }

    const next = source[tagStart + 1];
    if (next === '!' || next === '?') {
      const end = source.indexOf('>', tagStart + 2);
      index = end < 0 ? length : end + 1;
      continue;
    }

    if (next === '/') {
      const closing = /^<\/\s*([a-zA-Z][^\s/>]*)[^>]*>/.exec(source.slice(tagStart));
      if (!closing) {
        addText('<', tagStart);
        index = tagStart + 1;
        continue;
      }
      popToTag(stack, closing[1].toLowerCase());
      index = tagStart + closing[0].length;
      continue;
    }

    if (!next || !/[a-zA-Z]/.test(next)) {
      addText('<', tagStart);
      index = tagStart + 1;
      continue;
    }

    const parsed = readStartTag(source, tagStart);
    if (!parsed) {
      addText('<', tagStart);
      index = tagStart + 1;
      continue;
    }

    const parent = stack[stack.length - 1];
    const element = createElement(parsed.tag, parsed.attrs, tagStart, parent);
    parent.children.push(element);
    elements.push(element);
    index = parsed.end;

    if (parsed.selfClosing || VOID_TAGS.has(parsed.tag)) continue;

    if (RAW_TEXT_TAGS.has(parsed.tag)) {
      const closePattern = new RegExp('</\\s*' + escapeRegExp(parsed.tag) + '(?:\\s[^>]*)?>', 'i');
      const match = closePattern.exec(source.slice(index));
      index = match ? index + match.index + match[0].length : length;
      continue;
    }

    stack.push(element);
  }

  return { root, elements };
}

function buildLineStarts(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === 10) starts.push(index + 1);
  }
  return starts;
}

function positionAt(starts, offset) {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (starts[middle] <= offset) {
      if (middle === starts.length - 1 || starts[middle + 1] > offset) {
        return { line: middle + 1, column: offset - starts[middle] + 1 };
      }
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return { line: 1, column: offset + 1 };
}

function splitDeclarations(value) {
  const output = [];
  let start = 0;
  let quote = '';
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '(') {
      depth += 1;
    } else if (character === ')' && depth > 0) {
      depth -= 1;
    } else if (character === ';' && depth === 0) {
      output.push(value.slice(start, index));
      start = index + 1;
    }
  }
  output.push(value.slice(start));
  return output;
}

function readStyle(element) {
  if (element.styleDeclarations) return element.styleDeclarations;
  const declarations = Object.create(null);
  for (const part of splitDeclarations(attrName(element, 'style'))) {
    const separator = part.indexOf(':');
    if (separator < 0) continue;
    const property = part.slice(0, separator).trim().toLowerCase();
    if (!property) continue;
    let value = part.slice(separator + 1).trim();
    value = value.replace(/!\s*important\s*$/i, '').trim();
    declarations[property] = value;
  }
  element.styleDeclarations = declarations;
  return declarations;
}

function resolveLength(value, baseFontSizePx, unitlessIsPx) {
  const match = /^([+-]?(?:\d+\.?\d*|\.\d+))(px|rem|em)?$/i.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const unit = (match[2] || '').toLowerCase();
  if (!unit) return unitlessIsPx || amount === 0 ? amount : null;
  if (unit === 'px') return amount;
  if (unit === 'rem' || unit === 'em') return amount * baseFontSizePx;
  return null;
}

function readDimension(element, property, options) {
  const style = readStyle(element);
  if (hasOwn(style, property)) {
    return resolveLength(style[property], options.baseFontSizePx, false);
  }
  const attribute = attrName(element, property);
  if (attribute) return resolveLength(attribute, options.baseFontSizePx, true);
  return null;
}

function isHiddenElement(element) {
  if (hasOwn(element.attrs, 'hidden')) return true;
  if (attrName(element, 'aria-hidden').toLowerCase() === 'true') return true;
  const style = readStyle(element);
  if ((style.display || '').toLowerCase() === 'none') return true;
  if ((style.visibility || '').toLowerCase() === 'hidden') return true;
  return false;
}

function isDisabled(element) {
  if (hasOwn(element.attrs, 'disabled')) return true;
  return attrName(element, 'aria-disabled').toLowerCase() === 'true';
}

function isInteractive(element) {
  const tag = element.tag;
  if (tag === 'input') {
    return (attrName(element, 'type') || 'text').toLowerCase() !== 'hidden';
  }
  if (tag === 'a' || tag === 'area') return hasOwn(element.attrs, 'href');
  if (tag === 'audio' || tag === 'video') return hasOwn(element.attrs, 'controls');
  if (tag === 'button' || tag === 'select' || tag === 'textarea' || tag === 'summary') return true;
  const roles = attrName(element, 'role').toLowerCase().split(/\s+/).filter(Boolean);
  if (roles.length && INTERACTIVE_ROLES.has(roles[0])) return true;
  if (hasOwn(element.attrs, 'onclick')) return true;
  if (hasOwn(element.attrs, 'contenteditable')) {
    return attrName(element, 'contenteditable').toLowerCase() !== 'false';
  }
  return false;
}

function requiresAccessibleName(element) {
  if (element.tag === 'audio' || element.tag === 'video') return false;
  return isInteractive(element);
}

function roleOf(element) {
  const explicit = attrName(element, 'role').toLowerCase().split(/\s+/).filter(Boolean);
  if (explicit.length) return explicit[0];
  if (element.tag === 'button' || element.tag === 'summary') return 'button';
  if ((element.tag === 'a' || element.tag === 'area') && hasOwn(element.attrs, 'href')) return 'link';
  if (element.tag === 'select') return 'combobox';
  if (element.tag === 'textarea') return 'textbox';
  if (element.tag === 'input') {
    const type = (attrName(element, 'type') || 'text').toLowerCase();
    return hasOwn(INPUT_ROLES, type) ? INPUT_ROLES[type] : 'textbox';
  }
  return null;
}

function buildSelector(element) {
  const sanitize = (value) => value.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  let selector = element.tag;
  const id = sanitize(attrName(element, 'id'));
  if (id) return selector + '#' + id;
  const className = sanitize(attrName(element, 'class').split(/\s+/).find(Boolean) || '');
  if (className) selector += '.' + className;
  return selector;
}

function nodeText(node) {
  if (node.type === 'text') return node.value;
  if (!node.tag) return '';
  if (node.tag === '#document') {
    return node.children.map(nodeText).join(' ');
  }
  if (node.tag === 'script' || node.tag === 'style' || node.tag === 'template') return '';
  if (attrName(node, 'aria-hidden').toLowerCase() === 'true') return '';
  let text = '';
  if (node.tag === 'img') text += ' ' + attrName(node, 'alt');
  if (node.tag === 'br') text += ' ';
  for (const child of node.children) text += ' ' + nodeText(child);
  return text;
}

function collectLabels(element, context) {
  const labels = [];
  const seen = new Set();
  const id = attrName(element, 'id');
  if (id && context.labelsFor.has(id)) {
    for (const label of context.labelsFor.get(id)) {
      if (!seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    }
  }
  let parent = element.parent;
  while (parent && parent.tag && parent.tag !== '#document') {
    if (parent.tag === 'label') {
      if (!seen.has(parent)) {
        seen.add(parent);
        labels.push(parent);
      }
      break;
    }
    parent = parent.parent;
  }
  return labels;
}

function accessibleName(element, context, seen) {
  const visited = seen || new Set();
  if (!element || visited.has(element)) return '';
  visited.add(element);

  const referenced = attrName(element, 'aria-labelledby');
  if (referenced) {
    const parts = [];
    for (const id of referenced.split(/\s+/).filter(Boolean)) {
      const target = context.byId.get(id);
      if (!target) continue;
      const part = normalizeText(accessibleName(target, context, visited));
      if (part) parts.push(part);
    }
    if (parts.length) return normalizeText(parts.join(' '));
  }

  const ariaLabel = normalizeText(attrName(element, 'aria-label'));
  if (ariaLabel) return ariaLabel;

  const tag = element.tag;
  const type = (attrName(element, 'type') || 'text').toLowerCase();
  if (tag === 'input' && type === 'image') {
    const alt = normalizeText(attrName(element, 'alt'));
    if (alt) return alt;
  }
  if (tag === 'input' && (type === 'submit' || type === 'reset' || type === 'button')) {
    const value = normalizeText(attrName(element, 'value'));
    if (value) return value;
    if (type === 'submit') return 'Submit';
    if (type === 'reset') return 'Reset';
    return 'Button';
  }

  if (LABELABLE_TAGS.has(tag)) {
    const labelText = normalizeText(collectLabels(element, context).map(nodeText).join(' '));
    if (labelText) return labelText;
  }

  if (tag === 'button' || tag === 'a' || tag === 'area' ||
      tag === 'summary' || !LABELABLE_TAGS.has(tag)) {
    const text = normalizeText(nodeText(element));
    if (text) return text;
  }

  const title = normalizeText(attrName(element, 'title'));
  if (title) return title;
  return '';
}

function touchTargetFor(element, options) {
  const width = readDimension(element, 'width', options);
  const height = readDimension(element, 'height', options);
  const minimum = options.minTouchTargetPx;
  const tooSmall = (width !== null && width < minimum) ||
    (height !== null && height < minimum);
  let status = 'unverified';
  if (tooSmall) status = 'small';
  else if (width !== null && height !== null) status = 'ok';
  return {
    status,
    width,
    height,
    minTouchTargetPx: minimum
  };
}

function formatNumber(value) {
  return Number(value.toFixed(3)).toString();
}

function touchTargetMessage(target) {
  const minimum = target.minTouchTargetPx;
  if (target.width !== null && target.height !== null) {
    return 'Touch target is ' + formatNumber(target.width) + 'x' +
      formatNumber(target.height) + 'px, below the ' + minimum + 'x' + minimum + 'px minimum';
  }
  if (target.width !== null) {
    return 'Touch target width is ' + formatNumber(target.width) +
      'px, below the ' + minimum + 'px minimum';
  }
  if (target.height !== null) {
    return 'Touch target height is ' + formatNumber(target.height) +
      'px, below the ' + minimum + 'px minimum';
  }
  return 'Touch target is below the ' + minimum + 'px minimum';
}

function createFinding(rule, severity, element, message, lineStarts, extra) {
  const position = positionAt(lineStarts, element.start);
  return {
    rule,
    severity,
    message,
    tag: element.tag,
    id: attrName(element, 'id') || null,
    selector: buildSelector(element),
    index: element.start,
    line: position.line,
    column: position.column,
    role: roleOf(element),
    ...extra
  };
}

function readOptions(options) {
  if (options === undefined) return Object.freeze({ ...DEFAULT_OPTIONS });
  if (!isPlainObject(options)) throw new TypeError('options must be a plain object');
  const output = { ...DEFAULT_OPTIONS };
  for (const key of ['minTouchTargetPx', 'baseFontSizePx']) {
    if (!hasOwn(options, key)) continue;
    const value = options[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new TypeError(key + ' must be a positive finite number');
    }
    output[key] = value;
  }
  for (const key of ['checkLabels', 'checkTouchTargets']) {
    if (!hasOwn(options, key)) continue;
    if (typeof options[key] !== 'boolean') {
      throw new TypeError(key + ' must be a boolean');
    }
    output[key] = options[key];
  }
  return Object.freeze(output);
}

function emptyRuleCounts() {
  const counts = {};
  for (const key of Object.keys(RULES)) counts[RULES[key]] = 0;
  return counts;
}

function sortFindings(findings) {
  findings.sort((left, right) => {
    if (left.index !== right.index) return left.index - right.index;
    return RULE_ORDER.indexOf(left.rule) - RULE_ORDER.indexOf(right.rule);
  });
  return findings;
}

export function lintHtml(html, options) {
  if (typeof html !== 'string') throw new TypeError('html must be a string');
  const settings = readOptions(options);
  const parsed = parseDocument(html);
  const context = {
    byId: new Map(),
    labelsFor: new Map(),
    elements: parsed.elements
  };

  for (const element of context.elements) {
    const id = attrName(element, 'id');
    if (id && !context.byId.has(id)) context.byId.set(id, element);
  }
  for (const element of context.elements) {
    if (element.tag !== 'label') continue;
    const target = attrName(element, 'for');
    if (!target) continue;
    if (!context.labelsFor.has(target)) context.labelsFor.set(target, []);
    context.labelsFor.get(target).push(element);
  }

  const lineStarts = buildLineStarts(html);
  const findings = [];
  const elements = [];
  let labeled = 0;
  let unlabeled = 0;
  let touchTargetsEvaluated = 0;
  let touchTargetsFullyMeasured = 0;
  let touchTargetsTooSmall = 0;

  if (settings.checkLabels) {
    for (const element of context.elements) {
      if (element.tag !== 'label') continue;
      const target = attrName(element, 'for');
      if (!target || context.byId.has(target)) continue;
      findings.push(createFinding(
        RULES.LABEL_FOR_MISSING,
        SEVERITIES.WARNING,
        element,
        'label for references missing id: ' + target,
        lineStarts,
        {}
      ));
    }
  }

  for (const element of context.elements) {
    if (!isInteractive(element) || isHiddenElement(element)) continue;
    const name = accessibleName(element, context, new Set());
    const requiresName = requiresAccessibleName(element);

    if (settings.checkLabels) {
      const referenced = attrName(element, 'aria-labelledby');
      if (referenced) {
        const missing = referenced.split(/\s+/).filter(Boolean)
          .filter((id) => !context.byId.has(id));
        if (missing.length) {
          findings.push(createFinding(
            RULES.ARIA_LABELLEDBY_MISSING,
            SEVERITIES.WARNING,
            element,
            'aria-labelledby references missing id(s): ' + missing.join(', '),
            lineStarts,
            {}
          ));
        }
      }
      if (requiresName) {
        if (name) {
          labeled += 1;
        } else {
          unlabeled += 1;
          findings.push(createFinding(
            RULES.LABEL_MISSING,
            SEVERITIES.ERROR,
            element,
            'Interactive control has no accessible name',
            lineStarts,
            {}
          ));
        }
      }
    }

    let touchTarget = null;
    if (settings.checkTouchTargets && !isDisabled(element)) {
      touchTarget = touchTargetFor(element, settings);
      touchTargetsEvaluated += 1;
      if (touchTarget.width !== null && touchTarget.height !== null) {
        touchTargetsFullyMeasured += 1;
      }
      if (touchTarget.status === 'small') {
        touchTargetsTooSmall += 1;
        findings.push(createFinding(
          RULES.TOUCH_TARGET_TOO_SMALL,
          SEVERITIES.ERROR,
          element,
          touchTargetMessage(touchTarget),
          lineStarts,
          {
            width: touchTarget.width,
            height: touchTarget.height,
            minTouchTargetPx: touchTarget.minTouchTargetPx
          }
        ));
      }
    }

    elements.push({
      id: attrName(element, 'id') || null,
      tag: element.tag,
      selector: buildSelector(element),
      index: element.start,
      role: roleOf(element),
      name: name || null,
      hasAccessibleName: Boolean(name),
      requiresAccessibleName: requiresName,
      touchTarget
    });
  }

  sortFindings(findings);
  const counts = {
    elements: context.elements.length,
    interactive: elements.length,
    labeled,
    unlabeled,
    touchTargetsEvaluated,
    touchTargetsFullyMeasured,
    touchTargetsTooSmall,
    touchTargetsUnverified: touchTargetsEvaluated - touchTargetsFullyMeasured,
    errors: 0,
    warnings: 0,
    rules: emptyRuleCounts()
  };

  for (const finding of findings) {
    counts.rules[finding.rule] += 1;
    if (finding.severity === SEVERITIES.ERROR) counts.errors += 1;
    else counts.warnings += 1;
  }

  const status = counts.errors > 0 ? 'FAIL' : counts.warnings > 0 ? 'WARN' : 'PASS';
  const ok = counts.errors === 0;
  const summary = {
    status,
    ok,
    counts: { ...counts, rules: { ...counts.rules } }
  };

  return {
    version: VERSION,
    status,
    ok,
    options: settings,
    counts,
    findings,
    elements,
    summary
  };
}

function assertReport(report) {
  if (!isPlainObject(report) || !Array.isArray(report.findings) ||
      !isPlainObject(report.counts) || !isPlainObject(report.summary)) {
    throw new TypeError('report must be a lint report');
  }
}

export function summarizeA11yReport(report) {
  assertReport(report);
  return report.summary;
}

export function formatA11yReport(report) {
  assertReport(report);
  const lines = [
    'Status: ' + report.status,
    'Errors: ' + report.counts.errors + ' Warnings: ' + report.counts.warnings
  ];
  for (const finding of report.findings) {
    lines.push(
      '- [' + finding.severity + '] ' + finding.rule +
      ' line ' + finding.line + ':' + finding.column +
      ' ' + finding.selector + ': ' + finding.message
    );
  }
  return lines.join('\n');
}
