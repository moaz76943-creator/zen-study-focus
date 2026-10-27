/**
 * Deep Focus Room6 U06 — Focus Lab feature registry over existing merged
 * room3 and room5 engines. Offline: no network, no persistence, no timers, no
 * web storage access. Availability is always probed from the real environment;
 * nothing is claimed to exist that has not been verified.
 */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.DeepFocusFocusLabRegistry = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {

  const REGISTRY_ID = 'focus-lab';
  const SCHEMA_VERSION = 1;
  const BUILD_REVISION = 'U06-focus-lab-registry-1';
  const STATUS_LINKED = 'linked';
  const STATUS_UNLINKED = 'unlinked';
  const STATUS_UNAVAILABLE = 'unavailable';
  const REASON_FILE_MISSING = 'engine_file_missing';
  const REASON_MODULE_ERROR = 'engine_module_error';
  const REASON_CAPABILITIES_MISSING = 'engine_capabilities_missing';
  const REASON_GLOBAL_MISSING = 'engine_global_missing';
  const REASON_ADAPTER_LINK_FAILED = 'adapter_link_failed';

  const KIND_FUNCTION = 'function';
  const KIND_ARRAY = 'array';
  const KIND_OBJECT = 'object';

  const dirname = typeof __dirname === 'string' ? __dirname : '';
  const HAS_NODE = typeof require === 'function' && typeof module === 'object' && typeof module.exports === 'object';
  const nodePath = (() => {
    if (!HAS_NODE) return null;
    try { return require('node:path'); } catch (error) { return null; }
  })();
  const nodeFs = (() => {
    if (!HAS_NODE) return null;
    try { return require('node:fs'); } catch (error) { return null; }
  })();

  function joinPath(absoluteRoot, relativePath) {
    if (nodePath) return nodePath.resolve(absoluteRoot, relativePath);
    return String(absoluteRoot).replace(/[\\/]+$/, '') + '/' + String(relativePath);
  }

  function purgeRequireCache(absoluteFile) {
    if (typeof require !== 'function' || typeof require.resolve !== 'function') return;
    const cacheKey = require.resolve(absoluteFile);
    if (require.cache && require.cache[cacheKey]) delete require.cache[cacheKey];
  }

  function hasTypedCapability(moduleObject, capability) {
    if (!moduleObject) return false;
    const value = moduleObject[capability.name];
    if (capability.kind === KIND_ARRAY) return Array.isArray(value);
    if (capability.kind === KIND_OBJECT) return typeof value === 'object' && value !== null && !Array.isArray(value);
    return typeof value === KIND_FUNCTION;
  }

  function missingCapabilities(moduleObject, requiredCapabilities) {
    const missing = [];
    for (let i = 0; i < requiredCapabilities.length; i++) {
      if (!hasTypedCapability(moduleObject, requiredCapabilities[i])) {
        missing.push(requiredCapabilities[i].name);
      }
    }
    return missing;
  }

  function ownExportNames(moduleObject) {
    if (!moduleObject || typeof moduleObject !== 'object') return [];
    return Object.keys(moduleObject).slice().sort();
  }

  function resolveEngineFs(declaration, enginesRoot) {
    const absolute = joinPath(enginesRoot, declaration.enginePath);
    if (!nodeFs.existsSync(absolute)) {
      return { loaded: false, reason: REASON_FILE_MISSING, absolutePath: absolute };
    }
    let mod = null;
    try {
      purgeRequireCache(absolute);
      mod = require(absolute);
    } catch (error) {
      return {
        loaded: false,
        reason: REASON_MODULE_ERROR,
        message: String(error && error.message ? error.message : error),
        absolutePath: absolute
      };
    }
    const missing = missingCapabilities(mod, declaration.requiredCapabilities);
    if (missing.length) {
      return {
        loaded: true,
        reason: REASON_CAPABILITIES_MISSING,
        missing: missing,
        absolutePath: absolute,
        exportedNames: ownExportNames(mod)
      };
    }
    return { loaded: true, absolutePath: absolute, exportedNames: ownExportNames(mod) };
  }

  function resolveEngineGlobal(declaration, scope) {
    if (!scope) {
      return { loaded: false, reason: REASON_GLOBAL_MISSING };
    }
    const value = scope[declaration.engineGlobalKey];
    if (value === undefined || value === null) {
      return { loaded: false, reason: REASON_GLOBAL_MISSING };
    }
    const missing = missingCapabilities(value, declaration.requiredCapabilities);
    if (missing.length) {
      return {
        loaded: true,
        reason: REASON_CAPABILITIES_MISSING,
        missing: missing,
        exportedNames: ownExportNames(value)
      };
    }
    return { loaded: true, exportedNames: ownExportNames(value) };
  }

  function resolveAdapterFs(declaration, adaptersRoot) {
    const declared = declaration.adapterDeclaration;
    if (!declared) {
      return Object.freeze({ status: 'proposed', linked: false, path: null, factoryName: null, loaded: false, reason: null });
    }
    const absolute = joinPath(adaptersRoot, declared.path);
    if (!nodeFs.existsSync(absolute)) {
      return Object.freeze({ status: 'proposed', linked: false, path: declared.path, factoryName: declared.factoryName, loaded: false, reason: REASON_FILE_MISSING });
    }
    let mod = null;
    try {
      purgeRequireCache(absolute);
      mod = require(absolute);
    } catch (error) {
      mod = null;
    }
    if (!mod || typeof mod[declared.factoryName] !== KIND_FUNCTION) {
      return Object.freeze({ status: 'proposed', linked: false, path: declared.path, factoryName: declared.factoryName, loaded: false, reason: REASON_ADAPTER_LINK_FAILED });
    }
    return Object.freeze({ status: 'existing', linked: true, path: declared.path, factoryName: declared.factoryName, loaded: true, reason: null });
  }

  function buildFeatureEntry(declaration, engineProbe, adapterProbe) {
    let status;
    let reason = null;
    if (!engineProbe.loaded) {
      status = STATUS_UNAVAILABLE;
      reason = engineProbe.reason || REASON_GLOBAL_MISSING;
    } else if ((engineProbe.missing || []).length) {
      status = STATUS_UNAVAILABLE;
      reason = engineProbe.reason || REASON_CAPABILITIES_MISSING;
    } else if (adapterProbe && adapterProbe.linked) {
      status = STATUS_LINKED;
    } else {
      status = STATUS_UNLINKED;
    }
    const available = engineProbe.loaded === true && (engineProbe.missing || []).length === 0;
    return Object.freeze({
      id: declaration.id,
      title: declaration.title,
      room: declaration.room,
      enginePath: declaration.enginePath,
      engineGlobalKey: declaration.engineGlobalKey,
      focusLabRole: declaration.focusLabRole,
      status,
      available,
      reason,
      capabilities: Object.freeze({
        required: declaration.requiredCapabilities.map((cap) => cap.name + ':' + cap.kind),
        missing: (engineProbe.missing || []).slice()
      }),
      engine: Object.freeze({
        loaded: engineProbe.loaded === true,
        exportedNames: (engineProbe.exportedNames || []).slice(),
        message: engineProbe.message || null
      }),
      adapter: Object.freeze({
        status: adapterProbe ? adapterProbe.status : 'proposed',
        linked: adapterProbe ? adapterProbe.linked === true : false,
        path: adapterProbe ? adapterProbe.path : null,
        factoryName: adapterProbe ? adapterProbe.factoryName : null,
        loaded: adapterProbe ? adapterProbe.loaded === true : false,
        reason: adapterProbe ? adapterProbe.reason : null,
        description: declaration.adapterDescription
      })
    });
  }

  const FEATURE_DECLARATIONS = Object.freeze([
    {
      id: 'study-plan-templates',
      title: 'Study plan templates',
      room: 'room5',
      enginePath: 'room5/study_plan_templates_engine.js',
      engineGlobalKey: 'StudyPlanTemplatesEngine',
      focusLabRole: 'study-plans-card',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'listTemplates', kind: KIND_FUNCTION },
        { name: 'getTemplate', kind: KIND_FUNCTION },
        { name: 'createPlanFromTemplate', kind: KIND_FUNCTION },
        { name: 'createCustomPlan', kind: KIND_FUNCTION },
        { name: 'validatePlan', kind: KIND_FUNCTION },
        { name: 'serialize', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Room6 study-plan adapter lists real plan templates next to the Focus Lab study plans card, renders template names with textContent, and forwards explicit Create/Use actions to createPlanFromTemplate without touching storage.'
    },
    {
      id: 'reading-bookmarks',
      title: 'Reading book bookmarks',
      room: 'room5',
      enginePath: 'room5/reading_bookmarks_engine.js',
      engineGlobalKey: 'DeepFocusReadingBookmarks',
      focusLabRole: 'reading-card',
      adapterDeclaration: Object.freeze({ path: 'room6/reading_view_adapter.js', factoryName: 'createReadingViewAdapter' }),
      requiredCapabilities: Object.freeze([
        { name: 'createBook', kind: KIND_FUNCTION },
        { name: 'addBookmark', kind: KIND_FUNCTION },
        { name: 'removeBookmark', kind: KIND_FUNCTION },
        { name: 'updateProgress', kind: KIND_FUNCTION },
        { name: 'summarizeBook', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Existing F01 room6 reading view adapter bridges the reading bookmarks engine: page progress and bookmark intents are forwarded read-only, bookmark labels render through textContent, no storage or network.'
    },
    {
      id: 'weekly-intentions',
      title: 'Focus weekly intentions',
      room: 'room5',
      enginePath: 'room5/focus_weekly_intentions_engine.js',
      engineGlobalKey: 'DeepFocusWeeklyIntentions',
      focusLabRole: 'intentions-card',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'createWeeklyPlan', kind: KIND_FUNCTION },
        { name: 'validateWeeklyPlan', kind: KIND_FUNCTION },
        { name: 'addIntention', kind: KIND_FUNCTION },
        { name: 'setCompleted', kind: KIND_FUNCTION },
        { name: 'summarizeWeeklyPlan', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Room6 weekly-intentions adapter would surface the validated intention week on the Focus Lab intentions card, updating completion through setCompleted on explicit user action only.'
    },
    {
      id: 'sport-interval-builder',
      title: 'Sport interval builder',
      room: 'room5',
      enginePath: 'room5/sport_interval_builder_engine.js',
      engineGlobalKey: 'SportIntervalBuilderEngine',
      focusLabRole: 'sports-card',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'createSessionFromTemplate', kind: KIND_FUNCTION },
        { name: 'createCustomSession', kind: KIND_FUNCTION },
        { name: 'validateSession', kind: KIND_FUNCTION },
        { name: 'buildTimeline', kind: KIND_FUNCTION },
        { name: 'summarizeSession', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Room6 sport adapter would place validated interval timelines on the Focus Lab sports card, building sessions with buildTimeline and labelling every phase with textContent only.'
    },
    {
      id: 'project-time-budget',
      title: 'Project time budget',
      room: 'room5',
      enginePath: 'room5/project_time_budget_engine.js',
      engineGlobalKey: 'ProjectTimeBudgetEngine',
      focusLabRole: 'projects-card',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'createBudget', kind: KIND_FUNCTION },
        { name: 'addSession', kind: KIND_FUNCTION },
        { name: 'validateBudget', kind: KIND_FUNCTION },
        { name: 'summarizeBudget', kind: KIND_FUNCTION },
        { name: 'allocateRemaining', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Room6 projects adapter would map project time budgets to the Focus Lab projects card, showing honest remaining budget via projectRemaining/allocateRemaining without recording fabricated sessions.'
    },
    {
      id: 'plan-checklists',
      title: 'Focus plan checklists',
      room: 'room5',
      enginePath: 'room5/focus_plan_checklist_engine.js',
      engineGlobalKey: 'FocusPlanChecklistEngine',
      focusLabRole: 'checklist-card',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'createChecklistFromTemplate', kind: KIND_FUNCTION },
        { name: 'createChecklist', kind: KIND_FUNCTION },
        { name: 'addItem', kind: KIND_FUNCTION },
        { name: 'toggleItem', kind: KIND_FUNCTION },
        { name: 'summarizeChecklist', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Room6 checklist adapter would drive the checklists on the Focus Lab plan card from createChecklistFromTemplate and toggleItem, keeping every checklist label textContent-rendered.'
    },
    {
      id: 'ritual-templates',
      title: 'Focus ritual templates',
      room: 'room5',
      enginePath: 'room5/focus_ritual_templates_engine.js',
      engineGlobalKey: 'FocusRitualTemplatesEngine',
      focusLabRole: 'ritual-card',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'createRitualFromTemplate', kind: KIND_FUNCTION },
        { name: 'createCustomRitual', kind: KIND_FUNCTION },
        { name: 'startRun', kind: KIND_FUNCTION },
        { name: 'completeStep', kind: KIND_FUNCTION },
        { name: 'summarizeRun', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Room6 ritual adapter would run ritual steps against startRun/completeStep and show step progress on the Focus Lab ritual card, with progress advanced by user taps, never by timers.'
    },
    {
      id: 'recovery-break-menu',
      title: 'Recovery break menu',
      room: 'room5',
      enginePath: 'room5/recovery_break_menu_engine.js',
      engineGlobalKey: 'RecoveryBreakMenuEngine',
      focusLabRole: 'breaks-card',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'listCatalog', kind: KIND_FUNCTION },
        { name: 'getBreak', kind: KIND_FUNCTION },
        { name: 'suggestBreak', kind: KIND_FUNCTION },
        { name: 'createCustomBreak', kind: KIND_FUNCTION },
        { name: 'buildBreakPlan', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Room6 recovery adapter would list the real break catalog on the Focus Lab breaks card, suggesting a break with suggestBreak only between study blocks, labels rendered with textContent.'
    },
    {
      id: 'focus-templates',
      title: 'Focus session templates',
      room: 'room3',
      enginePath: 'focus_templates_engine.js',
      engineGlobalKey: 'ZenTemplates',
      focusLabRole: 'study-plans-timer-bridge',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'getTemplatesList', kind: KIND_FUNCTION },
        { name: 'BUILTIN_TEMPLATES', kind: KIND_ARRAY },
        { name: 'applyTemplateToTimer', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Room6 adapter would expose built-in focus templates (BUILTIN_TEMPLATES) as read-only previews on the Focus Lab study plans card; applyTemplateToTimer stays untouched because Focus Lab owns no timer session.'
    },
    {
      id: 'today-focus-task',
      title: 'Today focus task filter',
      room: 'room3',
      enginePath: 'today_focus_task_engine.js',
      engineGlobalKey: 'TodayFocusTaskEngine',
      focusLabRole: 'today-task-card',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'filterTodayTasks', kind: KIND_FUNCTION },
        { name: 'computeTaskPriority', kind: KIND_FUNCTION },
        { name: 'createTimerLinkPayload', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Room6 adapter would show the filtered today focus task on the Focus Lab focus starter card using filterTodayTasks, and hand createTimerLinkPayload data to the main app instead of starting a session itself.'
    },
    {
      id: 'distraction-log',
      title: 'In-session distraction log',
      room: 'room3',
      enginePath: 'distraction_log_engine.js',
      engineGlobalKey: 'DistractionLogEngine',
      focusLabRole: 'distraction-card',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'sanitizeText', kind: KIND_FUNCTION },
        { name: 'recordDistraction', kind: KIND_FUNCTION },
        { name: 'getDistractionSummary', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Room6 adapter would offer an in-session brain dump behind the distraction card: recordDistraction entries render with textContent and getDistractionSummary drives honest counts only.'
    },
    {
      id: 'weekly-study-goals',
      title: 'Weekly study goals',
      room: 'room3',
      enginePath: 'weekly_study_goals_engine.js',
      engineGlobalKey: 'WeeklyStudyGoalsEngine',
      focusLabRole: 'goals-card',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'getWeekBounds', kind: KIND_FUNCTION },
        { name: 'evaluateWeeklyGoal', kind: KIND_FUNCTION },
        { name: 'renderWeeklyGoalProgressSVG', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Room6 adapter would render the weekly goal SVG on the Focus Lab goals card from evaluateWeeklyGoal, using recorded durations only and never inventing progress.'
    },
    {
      id: 'quality-rating',
      title: 'Focus quality rating',
      room: 'room3',
      enginePath: 'focus_quality_rating_engine.js',
      engineGlobalKey: 'FocusQualityRatingEngine',
      focusLabRole: 'quality-card',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'QUALITY_LEVELS', kind: KIND_OBJECT },
        { name: 'logFriction', kind: KIND_FUNCTION },
        { name: 'calculateQualityScore', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Room6 adapter would present post-session quality choices (QUALITY_LEVELS) on the quality card and log them through logFriction on explicit taps only.'
    },
    {
      id: 'gentle-break',
      title: 'Gentle break suggestions',
      room: 'room3',
      enginePath: 'gentle_break_engine.js',
      engineGlobalKey: 'ZenGentleBreaks',
      focusLabRole: 'breaks-card',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'getBreakSuggestion', kind: KIND_FUNCTION },
        { name: 'BREAK_SUGGESTIONS', kind: KIND_ARRAY }
      ]),
      adapterDescription: 'Room6 adapter would offer gentle break suggestions (BREAK_SUGGESTIONS) beside the recovery break catalog, chosen by getBreakSuggestion only when the user opens the break list.'
    },
    {
      id: 'weekly-insights',
      title: 'Weekly study insights',
      room: 'room3',
      enginePath: 'weekly_insights_engine.js',
      engineGlobalKey: 'ZenWeeklyInsights',
      focusLabRole: 'insights-card',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'generateWeeklyInsights', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Room6 adapter would turn generateWeeklyInsights output into honest card copy on the Focus Lab insights card, rendering generated text with textContent.'
    },
    {
      id: 'micro-sprint-momentum',
      title: 'Micro sprint momentum',
      room: 'room3',
      enginePath: 'micro_sprint_momentum_engine.js',
      engineGlobalKey: 'MicroSprintMomentumEngine',
      focusLabRole: 'sprint-card',
      adapterDeclaration: null,
      requiredCapabilities: Object.freeze([
        { name: 'initializeMicroSprint', kind: KIND_FUNCTION },
        { name: 'evaluateSprintProgress', kind: KIND_FUNCTION },
        { name: 'generateMicroSprintReport', kind: KIND_FUNCTION }
      ]),
      adapterDescription: 'Room6 adapter would advance micro sprints only on explicit user ticks, evaluating with evaluateSprintProgress and summarizing through generateMicroSprintReport without background timers.'
    }
  ]);

  const DECLARATION_IDS = Object.freeze(FEATURE_DECLARATIONS.map((declaration) => declaration.id));

  function defaultRoots() {
    if (!dirname || !nodePath) return null;
    return {
      enginesRoot: nodePath.resolve(dirname, '..'),
      adaptersRoot: nodePath.resolve(dirname, '..')
    };
  }

  function createFocusLabRegistry(options) {
    const provided = options && typeof options === 'object' ? options : {};
    const defaults = defaultRoots();
    const probeMode = provided.probeMode === 'global'
      ? 'global'
      : (provided.probeMode === 'fs' ? 'fs' : (HAS_NODE && defaults ? 'fs' : 'global'));
    const normalized = {
      probeMode,
      enginesRoot: provided.enginesRoot || (defaults ? defaults.enginesRoot : null),
      adaptersRoot: provided.adaptersRoot || (defaults ? defaults.adaptersRoot : null),
      globalScope: provided.globalScope === undefined ? null : provided.globalScope
    };
    if (probeMode === 'fs' && (!normalized.enginesRoot || !nodeFs)) {
      throw new Error('focus_lab_registry: fs probing requires an enginesRoot and a filesystem');
    }

    const features = [];
    for (let i = 0; i < FEATURE_DECLARATIONS.length; i++) {
      const declaration = FEATURE_DECLARATIONS[i];
      if (probeMode === 'global') {
        features.push(buildFeatureEntry(declaration, resolveEngineGlobal(declaration, normalized.globalScope), null));
      } else {
        const engineProbe = resolveEngineFs(declaration, normalized.enginesRoot);
        const adapterProbe = resolveAdapterFs(declaration, normalized.adaptersRoot);
        features.push(buildFeatureEntry(declaration, engineProbe, adapterProbe));
      }
    }

    const counts = { total: features.length, byRoom: {}, byStatus: {} };
    for (let i = 0; i < features.length; i++) {
      const entry = features[i];
      counts.byRoom[entry.room] = (counts.byRoom[entry.room] || 0) + 1;
      counts.byStatus[entry.status] = (counts.byStatus[entry.status] || 0) + 1;
    }

    function getFeature(id) {
      for (let i = 0; i < features.length; i++) {
        if (features[i].id === id) return features[i];
      }
      return null;
    }

    function listByRoom(room) {
      return Object.freeze(features.filter((entry) => entry.room === room));
    }

    function listByStatus(status) {
      return Object.freeze(features.filter((entry) => entry.status === status));
    }

    function listLinkable() {
      return Object.freeze(features.filter((entry) => entry.available && entry.status === STATUS_UNLINKED));
    }

    return Object.freeze({
      registryId: REGISTRY_ID,
      schemaVersion: SCHEMA_VERSION,
      buildRevision: BUILD_REVISION,
      probeMode,
      features: Object.freeze(features.slice()),
      counts: Object.freeze({
        total: counts.total,
        byRoom: Object.freeze(counts.byRoom),
        byStatus: Object.freeze(counts.byStatus)
      }),
      getFeature,
      listByRoom,
      listByStatus,
      listLinkable
    });
  }

  function describeFeature(featureId) {
    for (let i = 0; i < FEATURE_DECLARATIONS.length; i++) {
      const declaration = FEATURE_DECLARATIONS[i];
      if (declaration.id !== featureId) continue;
      return Object.freeze({
        id: declaration.id,
        title: declaration.title,
        room: declaration.room,
        enginePath: declaration.enginePath,
        engineGlobalKey: declaration.engineGlobalKey,
        focusLabRole: declaration.focusLabRole,
        requiredCapabilityNames: declaration.requiredCapabilities.map((cap) => cap.name),
        adapterDeclaration: declaration.adapterDeclaration,
        adapterDescription: declaration.adapterDescription
      });
    }
    return null;
  }

  return Object.freeze({
    REGISTRY_ID,
    SCHEMA_VERSION,
    BUILD_REVISION,
    STATUS_LINKED,
    STATUS_UNLINKED,
    STATUS_UNAVAILABLE,
    FEATURE_DECLARATIONS,
    DECLARATION_IDS,
    createFocusLabRegistry,
    describeFeature
  });
});
