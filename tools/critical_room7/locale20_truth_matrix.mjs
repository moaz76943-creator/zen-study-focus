/**
 * Deep Focus critical room 7, task W03 — locale truth matrix.
 *
 * Offline source audit of the v21 translation packs. Separates, per language
 * and family/key: reviewed contextual translations, strings identical to the
 * English reference, English fallback shown at runtime, draft contributions
 * and approved contributions that are not yet integrated.
 *
 * This is a source-level audit only. It is NOT Android verification and it
 * never rewrites the v21 data store (read-only inputs, JSON-only report).
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const VERSION = 1;

export const CATEGORIES = Object.freeze([
  'verified', 'identical', 'conflict', 'pending', 'draft', 'fallback', 'base'
]);

export const APPROVED_STATUSES = Object.freeze(['TRANSLATED', 'VERIFIED']);
export const DRAFT_STATUSES = Object.freeze(['REVIEW_REQUIRED', 'MACHINE_DRAFT']);

const UNKNOWN = 'unavailable';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeLocaleCode(code) {
  if (typeof code !== 'string') return '';
  const v = code.toLowerCase().trim().split(/[-_]/)[0];
  return /^[a-z]{2,3}$/.test(v) ? v : '';
}

/**
 * Pure core of the truth matrix.
 *
 * inputs.packs          canonical reviewed packs (integrated, shipped text)
 * inputs.contributions  [{lane, language, status, sections}] contribution files
 * inputs.familyKeys     {family: [keys...]} measured key inventory per family
 * inputs.languages      catalog codes audited in the report
 * inputs.baseLanguages  languages whose UI text is English/Arabic by design
 * inputs.englishRefs    {family: {key: englishText}} optional authoritative refs
 */
export function buildTruthMatrix(inputs) {
  if (!isPlainObject(inputs)) throw new TypeError('inputs object required');
  const packs = isPlainObject(inputs.packs) ? inputs.packs : {};
  const familyKeys = sanitizeFamilyKeys(inputs.familyKeys);
  const contributions = Array.isArray(inputs.contributions) ? inputs.contributions : [];
  const catalog = Array.isArray(inputs.languages)
    ? inputs.languages.map(normalizeLocaleCode).filter(Boolean)
    : [];
  const baseLanguages = new Set((inputs.baseLanguages || ['en', 'ar']).map(normalizeLocaleCode));
  const refs = sanitizeRefs(inputs.englishRefs);

  const invalidContributionFiles = [];
  const usable = [];
  for (const item of contributions) {
    if (!isPlainObject(item) || !isPlainObject(item.sections) ||
        item.status === undefined || typeof item.language !== 'string') {
      invalidContributionFiles.push(isPlainObject(item) && typeof item.file === 'string'
        ? item.file : '<unnamed>');
      continue;
    }
    usable.push(item);
  }

  const languages = union(catalog, Object.keys(packs), usable.map(c => c.language));
  const matrix = [];
  const conflicts = [];
  const unknownKeys = [];
  const totals = Object.fromEntries(CATEGORIES.map(name => [name, 0]));

  for (const language of languages) {
    const entry = {
      code: language,
      present_in_catalog: catalog.includes(language),
      families: {},
      totals: Object.fromEntries(CATEGORIES.map(name => [name, 0])),
      runtime: { translated: 0, english_fallback: 0 }
    };
    const packSections = isPlainObject(packs[language]) ? packs[language] : null;
    const forLanguage = usable.filter(c => c.language === language);

    for (const [family, keys] of Object.entries(familyKeys)) {
      const familyDetail = {};
      for (const key of keys) {
        const rawFamily = packSections && isPlainObject(packSections[family]) ? packSections[family] : {};
        const row = classifyKey({
          packText: rawFamily[key],
          approved: forLanguage.flatMap(c => entriesWithStatus(c, family, key, APPROVED_STATUSES)),
          drafts: forLanguage.flatMap(c => entriesWithStatus(c, family, key, DRAFT_STATUSES)),
          ref: refs[family] ? refs[family][key] : undefined,
          base: baseLanguages.has(language)
        });
        familyDetail[key] = row;
        entry.totals[row.category]++;
        totals[row.category]++;
        if (row.category === 'conflict') {
          conflicts.push({ language, family, key, lanes: row.lanes,
            shipped_text: row.shipped_text, contribution_text: row.contribution_text });
        }
        if (row.runtime === 'translated') entry.runtime.translated++;
        else if (row.runtime === 'english_fallback') entry.runtime.english_fallback++;
        if (row.unknown) unknownKeys.push({ language, family, key });
      }
      entry.families[family] = familyDetail;
    }
    matrix.push(entry);
  }

  return {
    kind: 'LOCALE_TRUTH_MATRIX_OFFLINE_SOURCE_AUDIT',
    version: VERSION,
    offline: true,
    android_e2e: 'NOT_TESTED',
    is_android_verification: false,
    base_languages: [...baseLanguages],
    languages: matrix,
    totals,
    conflicts,
    unknown_keys: unknownKeys,
    invalid_contribution_files: invalidContributionFiles,
    english_reference_availability: referenceAvailability(familyKeys, refs),
    notes: [
      'Source-level audit of reviewed packs and contribution lanes; no device, no network.',
      'A language in the 99-locale menu is not a complete translation; only canonical pack values are shown at runtime.',
      'English fallback and draft strings are counted separately from verified contextual translations.'
    ]
  };
}

function sanitizeFamilyKeys(value) {
  const out = {};
  if (isPlainObject(value)) {
    for (const [family, keys] of Object.entries(value)) {
      if (Array.isArray(keys) && keys.length) {
        const filtered = keys.filter(k => typeof k === 'string');
        if (filtered.length) out[family] = [...new Set(filtered)];
      }
    }
  }
  return out;
}

function sanitizeRefs(value) {
  const out = {};
  if (isPlainObject(value)) {
    for (const [family, map] of Object.entries(value)) {
      if (isPlainObject(map)) out[family] = map;
    }
  }
  return out;
}

function union(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const code = normalizeLocaleCode(item);
      if (code && !seen.has(code)) { seen.add(code); out.push(code); }
    }
  }
  return out;
}

function entriesWithStatus(contribution, family, key, allowedStatuses) {
  const section = contribution.sections[family];
  if (!isPlainObject(section) || !Object.prototype.hasOwnProperty.call(section, key)) return [];
  const raw = section[key];
  const text = typeof raw === 'string' ? raw : (isPlainObject(raw) ? raw.text : undefined);
  const status = isPlainObject(raw) && raw.status ? raw.status : contribution.status;
  if (typeof text !== 'string') return [];
  if (!APPROVED_STATUSES.concat(DRAFT_STATUSES).includes(status)) return [];
  if (!allowedStatuses.includes(status)) return [];
  return [{ text, status, lane: contribution.lane || '', file: contribution.file || '' }];
}

/**
 * Classification of one measured key.
 *
 * States (mutually exclusive, all evidence-backed):
 * - base:      en/ar/de; base UI text ships by design, no translation claim.
 * - verified:  integrated reviewed pack text differs from the English reference.
 * - identical: integrated text equals the English reference; not contextual.
 * - pending:   a TRANSLATED/VERIFIED contribution exists but was never
 *              integrated, so the runtime shows the English fallback.
 * - draft:     only a REVIEW_REQUIRED/MACHINE_DRAFT contribution exists;
 *              the runtime shows the English fallback.
 * - fallback:  no shipped text and no contribution at all.
 * - conflict:  shipped pack text and an approved contribution text disagree;
 *              the contribution was refused, so the runtime still shows the
 *              shipped canonical text, and the divergence must be surfaced.
 */
export function classifyKey({ packText, approved, drafts, ref, base }) {
  if (base) {
    return { category: 'base', runtime: 'base', evidence: 'BASE_LANGUAGE_TEXT_BY_DESIGN' };
  }
  if (packText !== undefined) {
    const divergent = approved.filter(e => e.text !== packText);
    if (divergent.length) {
      return { category: 'conflict', runtime: 'translated',
        shipped_text: packText, contribution_text: divergent[0].text,
        lanes: lanesOf(divergent),
        evidence: 'APPROVED_CONTRIBUTION_DIFFERS_FROM_SHIPPED_PACK' };
    }
    if (typeof ref === 'string' && packText === ref) {
      return { category: 'identical', runtime: 'translated', shipped_text: packText,
        evidence: 'SHIPPED_TEXT_EQUALS_ENGLISH_REFERENCE' };
    }
    return { category: 'verified', runtime: 'translated', shipped_text: packText,
      identical_check: ref === undefined ? UNKNOWN : false,
      evidence: 'INTEGRATED_REVIEWED_PACK' };
  }
  if (approved.length) {
    return { category: 'pending', runtime: 'english_fallback',
      contribution_text: approved[0].text, lanes: lanesOf(approved),
      evidence: 'APPROVED_CONTRIBUTION_NOT_INTEGRATED' };
  }
  if (drafts.length) {
    return { category: 'draft', runtime: 'english_fallback', draft_text: drafts[0].text,
      lanes: lanesOf(drafts), evidence: 'DRAFT_CONTRIBUTION_NOT_INTEGRATED' };
  }
  return { category: 'fallback', runtime: 'english_fallback',
    evidence: 'NO_SHIPPED_OR_CONTRIBUTED_TEXT' };
}

function lanesOf(entries) {
  return [...new Set(entries.map(e => e.lane || e.file || '').filter(Boolean))];
}

function referenceAvailability(familyKeys, refs) {
  const out = {};
  for (const [family, keys] of Object.entries(familyKeys)) {
    const map = refs[family] || {};
    out[family] = {
      available: keys.filter(k => typeof map[k] === 'string').length,
      total: keys.length
    };
  }
  return out;
}

/* ---------- loader helpers (offline file reads; used by the CLI) ---------- */

export function resolveRoot(explicit) {
  if (explicit) return path.resolve(explicit);
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
}

export function readContributionFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(text);
  if (!isPlainObject(data) || typeof data.language !== 'string' ||
      !isPlainObject(data.sections)) {
    throw new Error('Invalid contribution shape: ' + file);
  }
  return {
    file: path.basename(file),
    lane: path.basename(path.dirname(file)),
    language: normalizeLocaleCode(data.language),
    status: data.status,
    sections: data.sections
  };
}

export function loadContributions(contributionsDir) {
  if (!fs.existsSync(contributionsDir)) return [];
  const out = [];
  for (const lane of fs.readdirSync(contributionsDir).sort()) {
    const laneDir = path.join(contributionsDir, lane);
    if (!fs.statSync(laneDir).isDirectory()) continue;
    for (const file of fs.readdirSync(laneDir).sort()) {
      if (!file.endsWith('.json')) continue;
      out.push(readContributionFile(path.join(laneDir, file)));
    }
  }
  return out;
}

export function loadCanonicalPacks(file) {
  if (!fs.existsSync(file)) return {};
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!isPlainObject(data)) return {};
  const out = {};
  for (const [lang, sections] of Object.entries(data)) {
    if (isPlainObject(sections)) out[normalizeLocaleCode(lang)] = sections;
  }
  return out;
}

/** Catalog codes are extracted from the shipped v21 app script, offline. */
export function loadCatalogCodes(appJsPath) {
  const app = fs.readFileSync(appJsPath, 'utf8');
  const boundary = app.indexOf('let todayISO =');
  if (boundary < 0) throw new Error('App dictionary initialization boundary moved');
  const ctx = { window: {}, document: { addEventListener() {} }, console };
  vm.createContext(ctx);
  vm.runInContext(app.slice(0, boundary) + '\nthis.__catalog = LANG_CATALOG;', ctx,
    { filename: 'app.js', timeout: 5000 });
  const codes = (ctx.__catalog || []).map(item => item && item.code).filter(Boolean);
  return codes.map(normalizeLocaleCode).filter(Boolean);
}

/**
 * Authoritative English reference maps for families that ship their fallback
 * text in dedicated caller scripts. Each extractor is a guarded slice+eval of
 * a single object/array literal; if the marker moves, the family is honestly
 * reported as having no reference rather than guessed.
 */
export function extractObjectLiteral(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return null;
  const open = source.indexOf('{', markerIndex);
  if (open < 0) return null;
  let depth = 0, inString = null, escaped = false;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === "'" || ch === '"') { inString = ch; continue; }
    if (ch === '{' || ch === '[' || ch === '(') depth++;
    else if (ch === '}' || ch === ']' || ch === ')') {
      depth--;
      if (depth === 0) {
        const literal = source.slice(open, i + 1);
        try {
          return vm.runInNewContext('(' + literal + ')');
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function extractEnglishRefs(webDir) {
  const read = name => {
    try { return fs.readFileSync(path.join(webDir, name), 'utf8'); }
    catch { return null; }
  };
  const refs = {};

  const timerSettings = read('timer_settings.js');
  if (timerSettings) {
    const tset = extractObjectLiteral(timerSettings, 'const TSET_I18N = {');
    if (tset && Array.isArray(tset.en)) {
      refs.timer = Object.fromEntries(tset.en.map((text, i) => [String(i), text]));
    }
  }

  const goalsStudio = read('goals_studio.js');
  if (goalsStudio) {
    const goalUi = extractObjectLiteral(goalsStudio, 'const GOAL_UI={');
    if (goalUi && isPlainObject(goalUi.en)) refs.goals = goalUi.en;
  }

  const tasksStudio = read('tasks_studio.js');
  if (tasksStudio) {
    const labels = extractObjectLiteral(tasksStudio, 'const labels={');
    if (labels && isPlainObject(labels.en)) refs.tasks = labels.en;
  }

  const notesStudio = read('notes_studio.js');
  if (notesStudio) {
    const nsStrings = extractObjectLiteral(notesStudio, 'const NS_STRINGS={');
    if (nsStrings && Array.isArray(nsStrings.en)) {
      refs.notes = Object.fromEntries(nsStrings.en.map((text, i) => [String(i), text]));
    }
  }

  const analyticsStudio = read('analytics_studio.js');
  if (analyticsStudio) {
    const en = extractObjectLiteral(analyticsStudio, 'const EN=Object.freeze({');
    if (en && isPlainObject(en)) refs.analytics = en;
  }

  const appJs = read('app.js');
  if (appJs) {
    const dict = extractObjectLiteral(appJs, 'const DICT = {');
    if (dict && isPlainObject(dict.en)) {
      refs.analyticsDomain = {
        study: dict.en.domStudy, read: dict.en.domRead,
        sport: dict.en.domSport, work: dict.en.domWork
      };
    }
  }
  return refs;
}

/**
 * The exact per-family key inventory measured for v21 (identical to the
 * df99_full_app_coverage probe; timer/notes numerics, tasks/goals/analytics
 * named keys).
 */
export function measuredFamilyKeys() {
  return {
    timer: Array.from({ length: 11 }, (_, i) => String(i)),
    goals: ['kicker', 'heading', 'desc', 'edit', 'modal', 'hint', 'save', 'invalid',
      'noGoal', 'minute', 'done', 'today', 'week', 'weekTarget', 'weekInvalid'],
    tasks: ['title', 'subtitle', 'add', 'project', 'today', 'search', 'all', 'board',
      'matrix', 'trash', 'calendar', 'undo', 'redo', 'empty', 'task', 'desc', 'due',
      'time', 'cat', 'priority', 'estimate', 'repeat', 'group', 'notes', 'proj', 'none',
      'save', 'cancel', 'focus', 'edit', 'done', 'resume', 'archive', 'remove',
      'restore', 'addCheck', 'check', 'sub', 'study', 'sport', 'review', 'exam', 'todo',
      'doing', 'completed', 'archived', 'low', 'medium', 'high', 'urgent', 'daily',
      'weekly', 'monthly', 'never', 'allCategories', 'estimated', 'actual', 'overdue',
      'do', 'schedule', 'delegate', 'eliminate', 'invalid', 'notConnected'],
    notes: Array.from({ length: 36 }, (_, i) => String(i)),
    analytics: ['title', 'activity', 'period', 'start', 'end', 'minutes', 'sessions',
      'average', 'streak', 'noData', 'goal', 'noGoals', 'tasks', 'chart', 'year',
      'export', 'details'],
    analyticsDomain: ['study', 'read', 'work', 'sport']
  };
}

export function runMatrix({ root, output } = {}) {
  const repo = resolveRoot(root);
  const packs = loadCanonicalPacks(path.join(repo, 'assets/i18n/df99_reviewed_packs.json'));
  const contributions = loadContributions(path.join(repo, 'assets/i18n/contributions'));
  const languages = loadCatalogCodes(path.join(repo, 'android/app/src/main/assets/web/app.js'));
  const refs = extractEnglishRefs(path.join(repo, 'android/app/src/main/assets/web'));
  const report = buildTruthMatrix({
    packs,
    contributions,
    languages,
    familyKeys: measuredFamilyKeys(),
    englishRefs: refs,
    baseLanguages: ['en', 'ar']
  });
  report.source = {
    canonical_json: 'assets/i18n/df99_reviewed_packs.json',
    contributions: 'assets/i18n/contributions',
    catalog: 'android/app/src/main/assets/web/app.js LANG_CATALOG'
  };
  if (output) fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  const text = JSON.stringify(report, null, 2) + '\n';
  if (output) fs.writeFileSync(path.resolve(output), text);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith('locale20_truth_matrix.mjs')) {
  const argIndex = process.argv.indexOf('--output');
  const output = argIndex >= 0 && process.argv[argIndex + 1]
    ? path.resolve(process.argv[argIndex + 1]) : null;
  try {
    const report = runMatrix({ output });
    process.stdout.write(JSON.stringify({
      kind: report.kind, offline: report.offline,
      android_e2e: report.android_e2e, totals: report.totals,
      output_report: output || 'stdout',
      caveat: 'SOURCE-ONLY. NOT Android verification. Data store untouched.'
    }, null, 2) + '\n');
  } catch (error) {
    console.error(String(error && error.stack || error));
    process.exitCode = 2;
  }
}
