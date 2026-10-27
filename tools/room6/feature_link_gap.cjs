'use strict';

/**
 * Deep Focus Room6 task Q02 — feature_link_gap.cjs
 *
 * Read-only inventory that separates:
 *   1. Engine SOURCE PRESENCE: real room3/room5 engine files that exist in the
 *      shipped web asset tree.
 *   2. ENGINE LOADING: the script set actually referenced by the shipped
 *      index.html that a WebView would load on startup.
 *
 * These two lists are kept strictly apart on purpose:
 *   status 'present_source'   — file exists on disk; nothing is claimed about runtime.
 *   status 'loaded'           — the shipped index.html embeds a <script src> for the file.
 *   a source-tested engine    — module is require()-able under Node and covered by
 *                               existing tests — but that is STILL NOT runtime proof;
 *                               the report labels runtime evidence 'NOT_TESTED'.
 * The tool never mutates files, never calls eval(), never runs app code,
 * and never upgrades a source/test fact into a runtime pass.
 */

const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_VERSION = 1;
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_INDEX = 'android/app/src/main/assets/web/index.html';
const ASSETS_WEB = 'android/app/src/main/assets/web';

/**
 * Real room3 engine source files (merged web-asset copies).
 * Names verified against tests/termux_agent3/*.test.cjs require() targets.
 */
const ROOM3_ENGINES = {
  C01: 'js/focus_tags_taxonomy_engine.js',
  C02: 'js/focus_quality_rating_engine.js',
  C03: 'js/active_recall_flashcard_engine.js',
  C04: 'js/leitner_box_flashcard_engine.js',
  C05: 'js/spaced_repetition_engine.js',
  C06: 'js/reading_speed_absorption_engine.js',
  C07: 'js/exam_countdown_binder.js',
  C08: 'js/distraction_log_engine.js',
  C09: 'js/daily_focus_rhythm_engine.js',
  C10: 'js/distraction_shield_guardian_engine.js',
  C11: 'js/post_session_reflection_engine.js',
  C12: 'js/impulse_regulation_velocity_engine.js',
  C13: 'js/exam_readiness_simulator_engine.js',
  C14: 'js/active_recall_capsule_engine.js',
  C15: 'js/weekly_report_exporter.js',
  C16: 'js/cognitive_chronotype_scheduler_engine.js'
};

/**
 * Real room5 engine source files (merged web-asset copies).
 * Names verified against tools/termux_room5/*_engine.mjs merged counterparts
 * that already exist in the shipped asset tree.
 */
const ROOM5_ENGINES = {
  B01: 'js/room5/study_plan_templates_engine.js',
  B02: 'js/room5/sport_interval_builder_engine.js',
  B03: 'js/room5/reading_bookmarks_engine.js',
  B04: 'js/room5/project_time_budget_engine.js',
  B05: 'js/room5/focus_ritual_templates_engine.js',
  B06: 'js/room5/recovery_break_menu_engine.js',
  B07: 'js/room5/focus_plan_checklist_engine.js',
  B08: 'js/room5/focus_weekly_intentions_engine.js'
};

function lineAt(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index && cursor < text.length; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

function toRel(root, file) {
  const relative = path.relative(root, path.resolve(root, file));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return path.resolve(root, file).split(path.sep).join('/');
  }
  return relative.split(path.sep).join('/');
}

function readSource(root, file) {
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
    path: toRel(root, file),
    absolutePath: absolute,
    exists,
    byteLength: exists ? Buffer.byteLength(text) : 0,
    lineCount: exists ? text.split('\n').length : 0,
    text
  };
}

/** Collect every <script src="..."> reference from an index.html source. */
function collectIndexScripts(html) {
  const scripts = [];
  const pattern = /<script\b([^>]*)>/gi;
  for (const match of html.matchAll(pattern)) {
    const attributes = match[1] || '';
    const srcMatch = attributes.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const src = srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? '') : '';
    scripts.push({
      src,
      line: lineAt(html, match.index),
      async: /\sasync\b/i.test(attributes),
      defer: /\sdefer\b/i.test(attributes),
      inline: src === ''
    });
  }
  return scripts;
}

/**
 * Detect dynamic script injection / import() of engine modules inside the
 * script files that index.html loads, so "loaded" never blindly equals
 * "static script tag only".
 */
function collectDynamicLoaders(loadedScripts, root, relativeList) {
  const loaders = [];
  for (const script of loadedScripts) {
    const source = readSource(root, script.livePath);
    if (!source.exists) continue;
    const hits = [];
    const patterns = [
      /createElement\s*\(\s*['"]script['"]\s*\)/gi,
      /import\s*\(\s*['"`]([^'"`]+\.js)['"`]/gi,
      /src\s*=\s*['"`]([^'"`]+\.js)['"`]/gi,
      /['"`]js\/?[^'"`]*engine[^'"`]*\.js['"`]/gi
    ];
    for (const pattern of patterns) {
      for (const match of source.text.matchAll(pattern)) {
        hits.push({ line: lineAt(source.text, match.index), text: match[0].slice(0, 120) });
      }
    }
    if (hits.length > 0) {
      loaders.push({ script: script.livePath, references: hits });
      for (const hit of hits) {
        const guess = /['"`]([^'"`]+\.js)/.exec(hit.text);
        if (guess && guess[1] && /\.(js)(\b|$)/.test(guess[1])) {
          relativeList.push(guess[1]);
        }
      }
    }
  }
  return loaders;
}

function inventoryEngines(rooms, root) {
  const entries = [];
  for (const [feature, file] of Object.entries(rooms)) {
    const source = readSource(root, path.join(ASSETS_WEB, file));
    const exportPhase1 = source.exists &&
      /typeof\s+module\b/.test(source.text) &&
      /module\.exports\s*=/.test(source.text);
    const globalPhase2 = source.exists &&
      /\b(?:root|self|globalThis|window)\.\s*[A-Za-z_$][\w$]*\s*=/.test(source.text);
    entries.push({
      feature,
      path: source.path,
      exists: source.exists,
      byteLength: source.byteLength,
      lineCount: source.lineCount,
      nodeExports: exportPhase1,
      windowGlobal: globalPhase2
    });
  }
  return entries;
}

/** Classify each engine source: loaded statically, dynamically referenced, or source-only. */
function classifyEngines(engines, staticSrcSet, dynamicReferencePaths) {
  const results = [];
  for (const engine of engines) {
    const enginePath = engine.path;
    const staticLoaded = staticSrcSet.has(enginePath);
    const dynamicLoaded = !staticLoaded && dynamicReferencePaths.includes(enginePath);
    const status = staticLoaded ? 'loaded_static' : dynamicLoaded ? 'loaded_dynamic' : 'present_source_only';
    results.push({
      feature: engine.feature,
      path: engine.path,
      exists: engine.exists,
      byteLength: engine.byteLength,
      lineCount: engine.lineCount,
      nodeExports: engine.nodeExports,
      windowGlobal: engine.windowGlobal,
      staticLoaded,
      dynamicLoaded,
      status,
      runtimeStatus: 'NOT_TESTED'
    });
  }
  return results;
}

function summarize(rooms) {
  const summary = {};
  for (const key of Object.keys(rooms)) {
    const list = rooms[key];
    summary[key] = {
      total: list.length,
      present: list.filter((entry) => entry.exists).length,
      missing: list.filter((entry) => !entry.exists).length,
      loaded: list.filter((entry) => entry.status === 'loaded_static' || entry.status === 'loaded_dynamic').length,
      sourceOnly: list.filter((entry) => entry.status === 'present_source_only').length
    };
  }
  return summary;
}

function inspectRepository(options = {}) {
  const root = path.resolve(options.root || DEFAULT_ROOT);
  const indexFile = options.index || DEFAULT_INDEX;
  const indexSource = readSource(root, indexFile);
  const indexScripts = collectIndexScripts(indexSource.text);

  const staticSrcList = indexScripts
    .filter((script) => !script.inline && script.src)
    .map((script) => script.src);

  // Resolve every script reference relative to the index.html directory so
  // comparisons against engine paths use the same root-relative base.
  const indexDir = path.dirname(path.resolve(root, indexFile));
  const resolveFromIndex = (reference) => toRel(root, path.resolve(indexDir, reference));

  const dynamicEngineCandidates = [];
  const dynamicLoaders = collectDynamicLoaders(
    indexScripts
      .filter((script) => !script.inline)
      .map((script) => ({ ...script, livePath: resolveFromIndex(script.src) })),
    root,
    dynamicEngineCandidates
  );

  const staticSrcSet = new Set(staticSrcList.map(resolveFromIndex));
  const staticScriptSrcs = [...new Set(staticSrcList)];
  const dynamicReferencePaths = [...new Set(dynamicEngineCandidates.map(resolveFromIndex))];

  const room3 = classifyEngines(inventoryEngines(ROOM3_ENGINES, root), staticSrcSet, dynamicReferencePaths);
  const room5 = classifyEngines(inventoryEngines(ROOM5_ENGINES, root), staticSrcSet, dynamicReferencePaths);

  const rooms = { room3, room5 };
  const counts = { room3: room3.length, room5: room5.length };
  const gaps = {
    room3: room3.filter((entry) => entry.status === 'present_source_only'),
    room5: room5.filter((entry) => entry.status === 'present_source_only')
  };

  const findings = [];
  if (!indexSource.exists) {
    findings.push({
      code: 'index_missing',
      severity: 'gap',
      source: indexSource.path,
      message: 'Shipped index.html is absent; loaded-script claims were not fabricated.'
    });
  }
  for (const [room, list] of Object.entries(gaps)) {
    if (list.length > 0) {
      findings.push({
        code: room + '_engines_source_only',
        severity: 'gap',
        count: list.length,
        features: list.map((entry) => entry.feature),
        message:
          room +
          ' engine files exist in the shipped asset tree (' +
          list.map((entry) => entry.feature + '=' + entry.status).join(', ') +
          ') but are never loaded by the shipped index.html. Available source is NOT runtime-loaded evidence.'
      });
    }
  }
  for (const engine of [...room3, ...room5]) {
    if (!engine.exists) {
      findings.push({
        code: 'engine_source_missing',
        severity: 'gap',
        feature: engine.feature,
        source: engine.path,
        message: 'Expected engine source file is absent; no availability was invented.'
      });
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedBy: 'tools/room6/feature_link_gap.cjs',
    readOnly: true,
    root,
    index: {
      path: indexSource.path,
      exists: indexSource.exists,
      lineCount: indexSource.lineCount,
      scriptTagCount: indexScripts.length,
      staticScriptSrcs
    },
    dynamicLoaders,
    counts,
    room3,
    room5,
    summary: summarize(rooms),
    linkGaps: {
      staticSrcSet: [...staticSrcSet],
      room3NotLoaded: gaps.room3.map((entry) => entry.feature),
      room5NotLoaded: gaps.room5.map((entry) => entry.feature)
    },
    findings,
    limitations: [
      'Static file inspection only: engine class "loaded" means a <script src> in shipped index.html references the file; it does NOT prove the WebView evaluated it successfully.',
      'Existing node:test coverage of engine modules proves offline Node behavior only and is never upgraded to a WebView runtime pass.',
      'Runtime behavior of loaded/unloaded engines in Android WebView is NOT_TESTED.',
      'No file in the repository is modified by this inspection.'
    ]
  };
}

function parseArguments(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    const match = /^--(root|index)(?:=(.*))?$/.exec(arg);
    if (!match) throw new Error('Unknown argument: ' + arg);
    const value = match[2] !== undefined ? match[2] : argv[i + 1];
    if (value === undefined) throw new Error('Missing value for --' + match[1]);
    options[match[1]] = value;
    if (match[2] === undefined) i += 1;
  }
  return options;
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node tools/room6/feature_link_gap.cjs [--root DIR] [--index FILE]',
      '',
      'Read-only gap report: real room3/room5 engine source files that exist in the',
      'shipped web asset tree versus the scripts actually referenced by shipped',
      'index.html. Runtime behavior is explicitly NOT_TESTED; this tool never',
      'converts source presence or Node test coverage into a runtime pass.'
    ].join('\n') + '\n'
  );
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
    process.stderr.write('feature_link_gap: ' + error.message + '\n');
    process.exitCode = 1;
  }
}

module.exports = {
  SCHEMA_VERSION,
  ROOM3_ENGINES,
  ROOM5_ENGINES,
  DEFAULT_INDEX,
  collectIndexScripts,
  inspectRepository,
  parseArguments,
  printHelp
};
