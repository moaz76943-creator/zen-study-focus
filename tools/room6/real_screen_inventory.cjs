'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_VERSION = 1;
const EXPECTED_MAIN_SECTIONS = 7;
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_INDEX = 'android/app/src/main/assets/web/index.html';
const DEFAULT_SCRIPT = 'android/app/src/main/assets/web/app.js';
const DEFAULT_FOCUS_LAB = 'android/app/src/main/assets/web/focus_lab.html';
const FOCUS_LAB_PATTERN = /focus[\s_-]?lab\b/gi;
const FOCUS_LAB_DETECT = /focus[\s_-]?lab\b/i;

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
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
  }
  return {
    role,
    path: toSourcePath(root, file),
    absolutePath: absolute,
    exists,
    lineCount: exists ? text.split('\n').length : 0,
    text
  };
}

function attributeValue(attributes, name) {
  const pattern = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s"\'>]+))', 'i');
  const match = attributes.match(pattern);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? '';
}

function collectElements(html) {
  const elements = [];
  const pattern = /<([a-zA-Z][\w:-]*)\b([^>]*?)\bid\s*=\s*(?:"([^"]*)"|'([^']*)')([^>]*)>/g;
  for (const match of html.matchAll(pattern)) {
    const attributes = (match[2] || '') + ' ' + (match[5] || '');
    const id = match[3] ?? match[4] ?? '';
    elements.push({
      id,
      tag: match[1].toLowerCase(),
      line: lineAt(html, match.index),
      classes: (attributeValue(attributes, 'class') || '').split(/\s+/).filter(Boolean),
      classesText: attributeValue(attributes, 'class') || '',
      onclick: attributeValue(attributes, 'onclick'),
      ariaLabel: attributeValue(attributes, 'aria-label'),
      href: attributeValue(attributes, 'href'),
      src: attributeValue(attributes, 'src'),
      dataTarget: attributeValue(attributes, 'data-target'),
      role: attributeValue(attributes, 'role'),
      attributes
    });
  }
  return elements;
}

function hasClass(element, className) {
  return element.classes.includes(className);
}

function collectSwitchTargets(text) {
  const targets = [];
  const pattern = /switchTab\s*\(\s*(?:"([^"]+)"|'([^']+)')/g;
  for (const match of text.matchAll(pattern)) {
    const target = match[1] ?? match[2] ?? '';
    if (!target) continue;
    targets.push({ target, line: lineAt(text, match.index) });
  }
  return targets;
}

function collectScriptReferences(script) {
  const references = new Map();
  const patterns = [
    /getElementById\s*\(\s*(?:"([^"]+)"|'([^']+)')\s*\)/g,
    /querySelector(?:All)?\s*\(\s*(?:"#([^"\s]+)"|'#([^'\s]+)')\s*\)/g
  ];
  for (const pattern of patterns) {
    for (const match of script.matchAll(pattern)) {
      const id = match[1] ?? match[2] ?? '';
      if (!id) continue;
      const line = lineAt(script, match.index);
      const current = references.get(id) || { id, lines: [], hasFallback: false };
      if (!current.lines.includes(line)) current.lines.push(line);
      const after = script.slice(match.index + match[0].length);
      if (/^\s*\|\|/.test(after)) current.hasFallback = true;
      references.set(id, current);
    }
  }
  for (const entry of references.values()) {
    entry.lines.sort((left, right) => left - right);
  }
  return references;
}

function collectScriptDeclaredIds(script) {
  const declared = new Map();
  const patterns = [
    /\bid\s*=\s*(?:"([^"<>${]+)"|'([^'<>${]+)')/g,
    /setAttribute\s*\(\s*(?:"id"|'id')\s*,\s*(?:"([^"]+)"|'([^']+)')\s*\)/g
  ];
  for (const pattern of patterns) {
    for (const match of script.matchAll(pattern)) {
      const id = match[1] ?? match[2] ?? '';
      if (!id || declared.has(id)) continue;
      declared.set(id, { id, line: lineAt(script, match.index) });
    }
  }
  return declared;
}

function collectMentions(text, pattern) {
  const mentions = [];
  const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
  const global = new RegExp(pattern.source, flags);
  for (const match of text.matchAll(global)) {
    const line = lineAt(text, match.index);
    const lineStart = text.lastIndexOf('\n', match.index - 1) + 1;
    const lineEnd = text.indexOf('\n', match.index);
    const sourceLine = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).trim();
    mentions.push({ line, match: match[0], text: sourceLine.slice(0, 160) });
  }
  return mentions;
}

function handlerDefinedInScript(script, action) {
  if (!action) return false;
  const escaped = action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp('function\\s+' + escaped + '\\s*\\('),
    new RegExp('(?:const|let|var)\\s+' + escaped + '\\s*=\\s*(?:async\\s+)?(?:function|\\()'),
    new RegExp('window\\.' + escaped + '\\s*=')
  ];
  return patterns.some((pattern) => pattern.test(script));
}

function buildNavigation(elements, sections, script, indexSource) {
  const sectionIds = sections.map((section) => section.id);
  const sectionIdSet = new Set(sectionIds);
  const controls = elements
    .filter((element) => hasClass(element, 'bnav-btn') || (element.tag === 'button' && /^nav/i.test(element.id)))
    .map((element) => {
      const onclick = element.onclick || '';
      const actionMatch = onclick.match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
      const action = actionMatch ? actionMatch[1] : null;
      const inlineTargets = collectSwitchTargets(onclick);
      const targetSection = inlineTargets.length > 0 ? inlineTargets[0].target : null;
      return {
        id: element.id,
        tag: element.tag,
        line: element.line,
        source: indexSource.path,
        action,
        targetSection,
        inlineTargets: inlineTargets.map((item) => item.target),
        handlerDefinedInScript: action ? handlerDefinedInScript(script, action) : false,
        kind: targetSection ? 'section-tab' : (action ? 'script-action' : 'unwired'),
        ariaLabel: element.ariaLabel,
        href: element.href,
        linkedSectionMissing: targetSection ? !sectionIdSet.has(targetSection) : false
      };
    });

  const targetSections = [...new Set(controls.map((control) => control.targetSection).filter(Boolean))];
  const missingTargets = targetSections
    .filter((target) => !sectionIdSet.has(target))
    .map((target) => ({ target, controls: controls.filter((control) => control.targetSection === target).map((control) => control.id) }));
  const sectionsWithoutControl = sectionIds.filter((id) => !targetSections.includes(id));

  return {
    container: elements.find((element) => element.tag === 'nav') || null,
    controls,
    targetSections,
    missingTargets,
    sectionsWithoutControl
  };
}

function buildFocusLab(root, indexSource, scriptSource, elements, navigation) {
  const expectedAbsolute = path.resolve(root, DEFAULT_FOCUS_LAB);
  const expectedFilePresent = fs.existsSync(expectedAbsolute);
  const indexMentions = collectMentions(indexSource.text, FOCUS_LAB_PATTERN);
  const scriptMentions = collectMentions(scriptSource.text, FOCUS_LAB_PATTERN);
  const navigationControls = navigation.controls.filter((control) =>
    FOCUS_LAB_DETECT.test([control.id, control.action, control.targetSection].filter(Boolean).join(' '))
  );
  const linkedFromIndex = elements.filter((element) => {
    const candidate = [element.href, element.src, element.dataTarget].filter(Boolean).join(' ');
    return FOCUS_LAB_DETECT.test(candidate);
  }).map((element) => ({
    id: element.id,
    tag: element.tag,
    line: element.line,
    source: indexSource.path,
    href: element.href,
    src: element.src,
    dataTarget: element.dataTarget
  }));
  const wired = navigationControls.length > 0 || linkedFromIndex.length > 0;
  const gapReasons = [];
  if (!indexSource.exists) gapReasons.push('index_missing');
  if (!scriptSource.exists) gapReasons.push('script_missing');
  if (!expectedFilePresent) gapReasons.push('focus_lab_page_missing');
  if (indexMentions.length === 0) gapReasons.push('no_index_reference');
  if (scriptMentions.length === 0) gapReasons.push('no_script_reference');
  if (navigationControls.length === 0) gapReasons.push('no_navigation_target');
  if (linkedFromIndex.length === 0) gapReasons.push('no_index_asset_link');

  return {
    expectedFile: DEFAULT_FOCUS_LAB,
    expectedAbsolutePath: expectedAbsolute.split(path.sep).join('/'),
    expectedFilePresent,
    indexMentionCount: indexMentions.length,
    scriptMentionCount: scriptMentions.length,
    indexMentions,
    scriptMentions,
    navigationControls,
    linkedFromIndex,
    wired,
    wiringGap: !wired,
    gapReasons
  };
}

function buildScriptDom(indexSource, scriptSource, elements) {
  const indexIds = new Map();
  for (const element of elements) {
    if (!element.id || indexIds.has(element.id)) continue;
    indexIds.set(element.id, { id: element.id, line: element.line, source: indexSource.path, tag: element.tag });
  }
  const declaredMap = collectScriptDeclaredIds(scriptSource.text);
  const references = collectScriptReferences(scriptSource.text);
  const referencedIds = [...references.keys()].sort();
  const declaredInScript = [...declaredMap.values()]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((entry) => ({ id: entry.id, line: entry.line, source: scriptSource.path }));

  const missingFromIndex = [];
  const resolvedByScript = [];
  for (const id of referencedIds) {
    if (indexIds.has(id)) continue;
    if (declaredMap.has(id)) {
      const entry = declaredMap.get(id);
      resolvedByScript.push({ id, line: entry.line, source: scriptSource.path });
      continue;
    }
    const reference = references.get(id);
    missingFromIndex.push({
      id,
      lines: reference.lines,
      hasFallback: reference.hasFallback,
      source: scriptSource.path
    });
  }

  return {
    indexIdCount: indexIds.size,
    scriptReferenceCount: referencedIds.length,
    referencedIds,
    declaredInScript,
    resolvedByScriptOnly: resolvedByScript,
    missingFromIndex
  };
}

function buildFindings(sources, sections, navigation, scriptDom, focusLab) {
  const findings = [];
  for (const source of [sources.index, sources.script]) {
    if (!source.exists) {
      findings.push({
        code: 'source_missing',
        severity: 'gap',
        source: source.path,
        message: 'Expected source file is absent; no screen or script claims were invented.'
      });
    }
  }
  if (sections.length !== EXPECTED_MAIN_SECTIONS) {
    findings.push({
      code: 'screen_section_count_mismatch',
      severity: 'warning',
      source: sources.index.path,
      message: 'Index declares ' + sections.length + ' .screen-section elements; the seven-section UI expectation is ' + EXPECTED_MAIN_SECTIONS + '.'
    });
  }
  if (navigation.controls.length !== EXPECTED_MAIN_SECTIONS) {
    findings.push({
      code: 'navigation_control_count_mismatch',
      severity: 'warning',
      source: sources.index.path,
      message: 'Index declares ' + navigation.controls.length + ' .bnav-btn navigation controls; the seven-section UI expectation is ' + EXPECTED_MAIN_SECTIONS + '.'
    });
  }
  for (const control of navigation.controls) {
    if (!control.targetSection) {
      findings.push({
        code: 'navigation_control_without_section_target',
        severity: 'info',
        source: sources.index.path,
        line: control.line,
        id: control.id,
        message: 'Navigation control ' + control.id + ' has no switchTab section target in its inline onclick handler' + (control.action ? '; it calls ' + control.action + '.' : '.')
      });
    }
  }
  for (const missing of navigation.missingTargets) {
    findings.push({
      code: 'navigation_target_missing_section',
      severity: 'warning',
      source: sources.index.path,
      target: missing.target,
      message: 'Navigation controls target ' + missing.target + ' but no matching .screen-section element exists.'
    });
  }
  for (const sectionId of navigation.sectionsWithoutControl) {
    findings.push({
      code: 'screen_section_without_navigation',
      severity: 'info',
      source: sources.index.path,
      id: sectionId,
      message: 'Screen section ' + sectionId + ' is not targeted by any .bnav-btn inline handler.'
    });
  }
  if (scriptDom.missingFromIndex.length > 0) {
    findings.push({
      code: 'script_dom_id_missing_from_index',
      severity: 'info',
      source: sources.script.path,
      ids: scriptDom.missingFromIndex.map((entry) => entry.id),
      message: 'Main script references ' + scriptDom.missingFromIndex.length + ' DOM id(s) that are neither in index.html nor declared inside the main script.'
    });
  }
  if (focusLab.wiringGap) {
    findings.push({
      code: 'focus_lab_wiring_gap',
      severity: 'gap',
      source: sources.index.path,
      message: 'Focus Lab is not wired into the shipped index navigation or linked assets: ' + focusLab.gapReasons.join(', ') + '.'
    });
  }
  return findings;
}

function inspectRepository(options = {}) {
  const root = path.resolve(options.root || DEFAULT_ROOT);
  const indexFile = options.index || DEFAULT_INDEX;
  const scriptFile = options.script || DEFAULT_SCRIPT;
  const indexSource = readSource(root, indexFile, 'index');
  const scriptSource = readSource(root, scriptFile, 'script');
  const elements = collectElements(indexSource.text);
  const sections = elements
    .filter((element) => hasClass(element, 'screen-section'))
    .map((element) => ({
      id: element.id,
      tag: element.tag,
      line: element.line,
      source: indexSource.path,
      active: hasClass(element, 'active'),
      classes: element.classes
    }));
  const navigation = buildNavigation(elements, sections, scriptSource.text, indexSource);
  const scriptDom = buildScriptDom(indexSource, scriptSource, elements);
  const focusLab = buildFocusLab(root, indexSource, scriptSource, elements, navigation);
  const sevenSectionUi = {
    expectedScreenSections: EXPECTED_MAIN_SECTIONS,
    actualScreenSectionCount: sections.length,
    actualNavigationControlCount: navigation.controls.length,
    sevenScreenSectionsPresent: sections.length === EXPECTED_MAIN_SECTIONS,
    sevenNavigationControlsPresent: navigation.controls.length === EXPECTED_MAIN_SECTIONS,
    sectionIds: sections.map((section) => section.id),
    navigationTargets: navigation.targetSections
  };
  const sources = { index: indexSource, script: scriptSource };
  const findings = buildFindings(sources, sections, navigation, scriptDom, focusLab);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedBy: 'tools/room6/real_screen_inventory.cjs',
    readOnly: true,
    root,
    sources: {
      index: {
        path: indexSource.path,
        exists: indexSource.exists,
        lineCount: indexSource.lineCount
      },
      script: {
        path: scriptSource.path,
        exists: scriptSource.exists,
        lineCount: scriptSource.lineCount
      }
    },
    screenSections: sections,
    navigation,
    sevenSectionUi,
    scriptDom,
    focusLab,
    findings,
    limitations: [
      'Static source inspection only; browser and Android runtime behavior are NOT_TESTED.',
      'No application entrypoint, native, persistence, or index.html file is modified.'
    ]
  };
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    const match = argument.match(/^--(root|index|script|focus-lab)(?:=(.*))?$/);
    if (!match) throw new Error('Unknown argument: ' + argument);
    const key = match[1] === 'focus-lab' ? 'focusLab' : match[1];
    const value = match[2] !== undefined ? match[2] : argv[index + 1];
    if (value === undefined) throw new Error('Missing value for --' + match[1]);
    options[key] = value;
    if (match[2] === undefined) index += 1;
  }
  return options;
}

function printHelp() {
  process.stdout.write([
    'Usage: node tools/room6/real_screen_inventory.cjs [--root DIR] [--index FILE] [--script FILE]',
    '',
    'Read-only inventory of index.html screen sections, navigation controls, script DOM ids,',
    'and Focus Lab wiring. Emits JSON evidence with source paths and line numbers.'
  ].join('\n') + '\n');
}

function main(argv) {
  const options = parseArguments(argv);
  if (options.help) {
    printHelp();
    return;
  }
  const report = inspectRepository(options);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write('real_screen_inventory: ' + error.message + '\n');
    process.exitCode = 1;
  }
}

module.exports = {
  SCHEMA_VERSION,
  EXPECTED_MAIN_SECTIONS,
  DEFAULT_ROOT,
  DEFAULT_INDEX,
  DEFAULT_SCRIPT,
  DEFAULT_FOCUS_LAB,
  inspectRepository,
  parseArguments,
  collectElements,
  collectSwitchTargets,
  collectScriptReferences,
  collectScriptDeclaredIds
};
